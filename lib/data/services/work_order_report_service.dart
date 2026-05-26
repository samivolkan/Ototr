import '../models/report_template_model.dart';
import '../models/user_profile_model.dart';
import '../repositories/report_template_repository.dart';
import '../repositories/work_order_report_repository.dart';

class WorkOrderReportService {
  const WorkOrderReportService({
    required this.templateRepository,
    required this.reportRepository,
  });

  final ReportTemplateRepository templateRepository;
  final WorkOrderReportRepository reportRepository;

  Future<ReportGroupProgress> getGroupProgress(
    String workOrderId,
    ReportTemplateGroup group,
  ) async {
    final answers = await reportRepository.getAnswers(workOrderId);
    final groupAnswers = answers.where((answer) => answer.groupId == group.id);
    final answeredItems = groupAnswers.length;
    final completedItems =
        groupAnswers.where((answer) => answer.isCompleted).length;
    final totalItems = group.items.length;
    final percent =
        totalItems == 0 ? 0 : ((completedItems / totalItems) * 100).round();

    return ReportGroupProgress(
      groupId: group.id,
      totalItems: totalItems,
      answeredItems: answeredItems,
      completedItems: completedItems,
      progressPercent: percent,
      assignedRole: group.assignedRole,
      assignedUserId: '',
      status: completedItems == 0
          ? 'Bekliyor'
          : completedItems == totalItems
              ? 'Tamamlandı'
              : 'Devam Ediyor',
    );
  }

  Future<List<ReportGroupProgress>> getReportProgress(
    String workOrderId,
  ) async {
    final template = await templateRepository.getActiveTemplate();
    return [
      for (final group in template.groups)
        await getGroupProgress(workOrderId, group),
    ];
  }

  Future<int> getOverallPercent(String workOrderId) async {
    final template = await templateRepository.getActiveTemplate();
    final answers = await reportRepository.getAnswers(workOrderId);
    final completed = answers.where((answer) => answer.isCompleted).length;
    return template.totalItems == 0
        ? 0
        : ((completed / template.totalItems) * 100).round();
  }

  Future<WorkOrderReportAnswer> saveItemAnswer({
    required String workOrderId,
    required ReportTemplate template,
    required ReportTemplateGroup group,
    required ReportTemplateItem item,
    required UserProfile user,
    required List<String> selectedOptionIds,
    required Map<String, String> inputValues,
    required String description,
    required List<String> imageUrls,
    required bool complete,
  }) async {
    final missing = validateItem(
      item: item,
      selectedOptionIds: selectedOptionIds,
      inputValues: inputValues,
      description: description,
      complete: complete,
    );
    if (missing.isNotEmpty) {
      throw StateError(missing.join('\n'));
    }

    final selectedLabels = [
      for (final option in item.options)
        if (selectedOptionIds.contains(option.id)) option.label,
    ];
    final now = DateTime.now();
    final existing = await reportRepository.getItemAnswer(workOrderId, item.id);
    final answer = WorkOrderReportAnswer(
      id: existing?.id ?? '$workOrderId-${item.id}',
      workOrderId: workOrderId,
      templateId: template.id,
      groupId: group.id,
      itemId: item.id,
      noktaId: item.noktaId,
      selectedOptionIds: selectedOptionIds,
      selectedOptionLabels: selectedLabels,
      inputValues: inputValues,
      description: description.trim(),
      imageUrls: imageUrls,
      status:
          complete ? ReportAnswerStatus.completed : ReportAnswerStatus.draft,
      answeredByUserId: user.id,
      answeredByRole: user.role.name,
      startedAt: existing?.startedAt ?? now,
      completedAt: complete ? now : existing?.completedAt,
      updatedAt: now,
      lockedByUserId: user.id,
      lockedAt: existing?.lockedAt ?? now,
    );
    return reportRepository.saveAnswer(answer);
  }

  Future<void> markGroupAllGood({
    required String workOrderId,
    required ReportTemplate template,
    required ReportTemplateGroup group,
    required UserProfile user,
    Map<String, Map<String, String>> inputValuesByItem = const {},
  }) async {
    final existingAnswers = {
      for (final answer in await reportRepository.getAnswers(workOrderId))
        answer.itemId: answer,
    };
    for (final item in group.items) {
      final existingAnswer = existingAnswers[item.id];
      final providedInputValues = inputValuesByItem[item.id] ?? const {};
      final selectedOptionIds = [
        if (item.defaultPositiveOption != null) item.defaultPositiveOption!.id,
      ];
      final inputValues = {
        for (final input in item.inputFields)
          input.id: _allGoodInputValue(
            input: input,
            providedInputValues: providedInputValues,
            existingAnswer: existingAnswer,
          ),
      };
      final missingInputs =
          _missingAllGoodInputLabels(group, item, inputValues);
      if (missingInputs.isNotEmpty) {
        throw StateError(
          'Tüm noktaları iyi işaretlemek için önce ölçüm/veri alanlarını '
          'doldurun: ${missingInputs.join(', ')}.',
        );
      }
      await saveItemAnswer(
        workOrderId: workOrderId,
        template: template,
        group: group,
        item: item,
        user: user,
        selectedOptionIds: selectedOptionIds,
        inputValues: inputValues,
        description: item.hasOptions || item.hasInputs ? '' : 'Uygun',
        imageUrls: const [],
        complete: true,
      );
    }
  }

  Future<List<ReportAllGoodInputRequest>> getRequiredInputsForGroupAllGood({
    required String workOrderId,
    required ReportTemplateGroup group,
    Map<String, Map<String, String>> inputValuesByItem = const {},
  }) async {
    final existingAnswers = {
      for (final answer in await reportRepository.getAnswers(workOrderId))
        answer.itemId: answer,
    };

    return [
      for (final item in group.items)
        for (final input in item.inputFields)
          if (_allGoodInputRequiresValue(group, input) &&
              _allGoodInputValue(
                input: input,
                providedInputValues: inputValuesByItem[item.id] ?? const {},
                existingAnswer: existingAnswers[item.id],
              ).trim().isEmpty)
            ReportAllGoodInputRequest(item: item, input: input),
    ];
  }

  List<String> validateItem({
    required ReportTemplateItem item,
    required List<String> selectedOptionIds,
    required Map<String, String> inputValues,
    required String description,
    required bool complete,
  }) {
    if (!complete) {
      return const [];
    }

    final missing = <String>[];
    if (item.hasOptions && selectedOptionIds.isEmpty) {
      missing.add('${item.title} için seçim yapılmalı.');
    }
    for (final input in item.inputFields) {
      final value = inputValues[input.id]?.trim() ?? '';
      if ((input.required || !item.hasOptions) && value.isEmpty) {
        missing.add(
            '${input.label.isEmpty ? item.title : input.label} alanı doldurulmalı.');
      }
    }
    if (!item.hasOptions &&
        !item.hasInputs &&
        item.hasDescription &&
        description.trim().isEmpty) {
      missing.add('${item.title} için açıklama girilmeli.');
    }
    return missing;
  }

  String _allGoodInputValue({
    required ReportTemplateInputField input,
    required Map<String, String> providedInputValues,
    required WorkOrderReportAnswer? existingAnswer,
  }) {
    final provided = providedInputValues[input.id]?.trim() ?? '';
    if (provided.isNotEmpty) {
      return provided;
    }

    final existing = existingAnswer?.inputValues[input.id]?.trim() ?? '';
    if (existing.isNotEmpty) {
      return existing;
    }

    return input.value.trim();
  }

  bool _allGoodInputRequiresValue(
    ReportTemplateGroup group,
    ReportTemplateInputField input,
  ) {
    if (isBodyPaintReportGroup(group)) {
      return reportInputIsMicron(input);
    }
    return true;
  }

  List<String> _missingAllGoodInputLabels(
    ReportTemplateGroup group,
    ReportTemplateItem item,
    Map<String, String> inputValues,
  ) {
    return [
      for (final input in item.inputFields)
        if (_allGoodInputRequiresValue(group, input) &&
            (inputValues[input.id] ?? '').trim().isEmpty)
          _inputLabel(item, input),
    ];
  }

  String _inputLabel(
    ReportTemplateItem item,
    ReportTemplateInputField input,
  ) {
    final label = input.label.trim().isNotEmpty
        ? input.label.trim()
        : input.name.trim().isNotEmpty
            ? input.name.trim()
            : item.title;
    return '${item.title} / $label';
  }
}

bool isBodyPaintReportGroup(ReportTemplateGroup group) {
  final code = group.code.toUpperCase();
  final title = _normalizeReportText(group.title);
  return code == 'BODY_PAINT_CHECKUP' ||
      title.contains('KAPORTA') && title.contains('BOYA');
}

bool reportInputIsMicron(ReportTemplateInputField input) {
  final text = _normalizeReportText(
    '${input.label} ${input.placeholder} ${input.name}',
  );
  return text.contains('MIKRON') || text.contains('MICRON');
}

bool reportGroupHasMicronInputs(ReportTemplateGroup group) {
  return group.items.any(
    (item) => item.inputFields.any(reportInputIsMicron),
  );
}

Map<String, Map<String, String>> sharedMicronInputValuesForGroup(
  ReportTemplateGroup group,
  String value,
) {
  final normalizedValue = value.trim();
  if (normalizedValue.isEmpty) {
    return const {};
  }

  return {
    for (final item in group.items)
      if (item.inputFields.any(reportInputIsMicron))
        item.id: {
          for (final input in item.inputFields)
            if (reportInputIsMicron(input)) input.id: normalizedValue,
        },
  };
}

Map<String, Map<String, String>> mergeReportInputValuesByItem(
  Map<String, Map<String, String>> first,
  Map<String, Map<String, String>> second,
) {
  return {
    for (final itemId in {...first.keys, ...second.keys})
      itemId: {
        ...?first[itemId],
        ...?second[itemId],
      },
  };
}

String _normalizeReportText(String value) {
  return value
      .trim()
      .toUpperCase()
      .replaceAll('İ', 'I')
      .replaceAll('İ', 'I')
      .replaceAll('Ğ', 'G')
      .replaceAll('Ü', 'U')
      .replaceAll('Ş', 'S')
      .replaceAll('Ö', 'O')
      .replaceAll('Ç', 'C');
}

class ReportAllGoodInputRequest {
  const ReportAllGoodInputRequest({
    required this.item,
    required this.input,
  });

  final ReportTemplateItem item;
  final ReportTemplateInputField input;

  String get label => input.label.trim().isNotEmpty
      ? input.label.trim()
      : input.name.trim().isNotEmpty
          ? input.name.trim()
          : item.title;
}
