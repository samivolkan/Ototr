import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../data/models/report_template_model.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import '../../data/repositories/report_template_repository.dart';
import '../../data/repositories/work_order_report_repository.dart';
import '../../data/services/work_order_report_service.dart';
import 'report_entry/report_item_form_sheet.dart';

class TechnicianTaskFormScreen extends StatefulWidget {
  const TechnicianTaskFormScreen({
    super.key,
    required this.workOrderId,
    required this.taskId,
  });

  final String workOrderId;
  final String taskId;

  @override
  State<TechnicianTaskFormScreen> createState() =>
      _TechnicianTaskFormScreenState();
}

class _TechnicianTaskFormScreenState extends State<TechnicianTaskFormScreen> {
  final _repository = DummyWorkOrderRepository.instance;
  TechnicianTask? _task;
  ReportTemplate? _template;
  List<WorkOrderReportAnswer> _answers = const [];
  Future<TechnicianTask>? _remoteTaskFuture;
  Future<void>? _reportDataFuture;
  final _noteController = TextEditingController();
  bool _isSubmitting = false;
  int _submitProgress = 0;
  int _submitTotal = 0;

  ReportTemplateRepository get _templateRepository =>
      AppRepositories.instance.remoteWorkOrders == null
          ? AssetReportTemplateRepository()
          : AppRepositories.instance.reportTemplates;

  WorkOrderReportRepository get _reportRepository =>
      AppRepositories.instance.remoteWorkOrders == null
          ? LocalWorkOrderReportRepository.instance
          : AppRepositories.instance.workOrderReports;

  WorkOrderReportService get _reportService => WorkOrderReportService(
        templateRepository: _templateRepository,
        reportRepository: _reportRepository,
      );

  @override
  void initState() {
    super.initState();
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      _remoteTaskFuture = remoteRepository.getById(widget.workOrderId).then(
            (order) =>
                order.tasks.firstWhere((task) => task.taskId == widget.taskId),
          );
      return;
    }

    _task = _repository.getById(widget.workOrderId).tasks.firstWhere(
          (task) => task.taskId == widget.taskId,
        );
    _noteController.text = _task!.customerFriendlyNote;
    _ensureReportDataLoad();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null && _task == null) {
      return FutureBuilder<TechnicianTask>(
        future: _remoteTaskFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              appBar: const OtotrAppBar(title: 'Kontrol Formu'),
              backgroundColor: AppColors.grayBg,
              body: Padding(
                padding: const EdgeInsets.all(AppSizes.lg),
                child: OtotrCard(
                  child: Text(
                    'Supabase kontrol formu alınamadı: ${snapshot.error}',
                    style: const TextStyle(color: AppColors.red),
                  ),
                ),
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Scaffold(
              appBar: OtotrAppBar(title: 'Kontrol Formu'),
              backgroundColor: AppColors.grayBg,
              body: Center(child: CircularProgressIndicator()),
            );
          }

          _task = snapshot.data;
          _noteController.text = _task!.customerFriendlyNote;
          _ensureReportDataLoad();
          return _buildForm();
        },
      );
    }

    return _buildForm();
  }

  Widget _buildForm() {
    final task = _task!;
    if (_template == null) {
      _ensureReportDataLoad();
      return const Scaffold(
        appBar: OtotrAppBar(title: 'Kontrol Formu'),
        backgroundColor: AppColors.grayBg,
        body: Center(child: CircularProgressIndicator()),
      );
    }
    final currentUser =
        AppRepositories.instance.remoteWorkOrders?.currentUser ??
            _repository.currentUser;
    final isReadOnly = !task.canEditBy(currentUser);
    final missing = task.missingReasons();
    final completed = _completedCountForTask(task);
    final total = task.checklistItems.length;
    final percent = total == 0 ? 0 : ((completed / total) * 100).round();
    final answersByItem = {
      for (final answer in _answers) answer.itemId: answer,
    };

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Kontrol Formu'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSizes.xl),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF910000), AppColors.red],
              ),
            ),
            child: Column(
              children: [
                Text(
                  task.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 22,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isReadOnly
                      ? 'Bu başlık başka bir usta tarafından sahiplenildi. Read-only izlenebilir.'
                      : 'Test noktalarını doldurup rapora gönderin.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.white),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.white,
                    foregroundColor: AppColors.navy,
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Geri Dön'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSizes.lg),
            child: Column(
              children: [
                OtotrCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.checklist_rtl,
                            color: AppColors.red,
                            size: 30,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '$completed/$total test alani tamamlandi',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: AppColors.navy,
                                fontSize: 17,
                              ),
                            ),
                          ),
                          Text(
                            '%$percent',
                            style: const TextStyle(
                              color: AppColors.success,
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          minHeight: 8,
                          value: total == 0 ? 0 : percent / 100,
                          color: AppColors.success,
                          backgroundColor: AppColors.grayBorder,
                        ),
                      ),
                      if (_isSubmitting) ...[
                        const SizedBox(height: 14),
                        Text(
                          'Gönderiliyor: $_submitProgress/$_submitTotal',
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            minHeight: 8,
                            value: _submitTotal == 0
                                ? null
                                : _submitProgress / _submitTotal,
                            color: AppColors.info,
                            backgroundColor: AppColors.grayBorder,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                for (final item in task.checklistItems)
                  _ChecklistRow(
                    item: item,
                    answer: answersByItem[item.id],
                    enabled: !isReadOnly,
                    onTap: () => _openReportItem(item),
                  ),
                OtotrCard(
                  child: SizedBox(
                    width: double.infinity,
                    height: AppSizes.buttonHeight,
                    child: FilledButton.icon(
                      onPressed: isReadOnly ? null : _markAllItemsNormal,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.white,
                        foregroundColor: AppColors.success,
                        side: const BorderSide(color: AppColors.grayBorder),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSizes.radius),
                        ),
                      ),
                      icon: const Icon(Icons.done_all),
                      label: const Text(
                        'Tüm Noktalar İyi Durumda',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ),
                OtotrCard(
                  child: TextField(
                    controller: _noteController,
                    maxLines: 3,
                    readOnly: isReadOnly,
                    decoration: const InputDecoration(
                      labelText: 'Müşteri dili teknik notu',
                      hintText:
                          'Rapor diline uygun, tarafsız ve ölçülebilir not',
                    ),
                    onChanged: (value) {
                      setState(() {
                        _task = _task!.copyWith(customerFriendlyNote: value);
                      });
                    },
                  ),
                ),
                if (missing.isNotEmpty)
                  OtotrCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Gönderim Engelleri',
                          style: TextStyle(
                            color: AppColors.red,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        for (final item in missing)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text('- $item'),
                          ),
                      ],
                    ),
                  ),
                OtotrPrimaryButton(
                  label: 'Başlığı Gönder',
                  icon: Icons.send,
                  onPressed: isReadOnly || _isSubmitting ? null : _submitTask,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _replaceItem(TechnicianChecklistItem item) {
    final task = _task!;
    setState(() {
      _task = task.copyWith(
        checklistItems: [
          for (final current in task.checklistItems)
            if (current.id == item.id) item else current,
        ],
      );
    });
  }

  void _ensureReportDataLoad() {
    _reportDataFuture ??= _loadReportData();
  }

  Future<void> _loadReportData() async {
    final template = await _templateRepository.getActiveTemplate();
    final answers = await _reportRepository.getAnswers(widget.workOrderId);
    if (!mounted) {
      return;
    }
    setState(() {
      _template = template;
      _answers = answers;
    });
  }

  int _completedCountForTask(TechnicianTask task) {
    final template = _template;
    if (template == null) {
      return task.completedCount;
    }
    final answersByItem = {
      for (final answer in _answers) answer.itemId: answer,
    };
    var completed = 0;
    for (final item in task.checklistItems) {
      final reportItem = _reportItemFor(item);
      if (reportItem == null) {
        if (item.isAnswered) {
          completed += 1;
        }
        continue;
      }
      if (answersByItem[reportItem.id]?.isCompleted == true) {
        completed += 1;
      }
    }
    return completed;
  }

  Future<void> _openReportItem(TechnicianChecklistItem checklistItem) async {
    final template = _template;
    if (template == null) {
      return;
    }
    final binding = _bindingFor(checklistItem);
    if (binding == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bu test maddesi şablonda bulunamadı.')),
      );
      return;
    }
    final currentUser =
        AppRepositories.instance.remoteWorkOrders?.currentUser ??
            _repository.currentUser;

    try {
      await _reportRepository.lockItem(
        widget.workOrderId,
        binding.item.id,
        currentUser.id,
      );
      final answer = await _reportRepository.getItemAnswer(
        widget.workOrderId,
        binding.item.id,
      );
      if (!mounted) {
        return;
      }
      final changed = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => ReportItemFormSheet(
          workOrderId: widget.workOrderId,
          template: template,
          group: binding.group,
          item: binding.item,
          answer: answer,
          user: currentUser,
          service: _reportService,
        ),
      );
      await _reportRepository.unlockItem(
        widget.workOrderId,
        binding.item.id,
        currentUser.id,
      );
      if (changed == true) {
        await _refreshAnswerFor(checklistItem, binding.item);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }

  Future<void> _refreshAnswerFor(
    TechnicianChecklistItem checklistItem,
    ReportTemplateItem reportItem,
  ) async {
    final answer = await _reportRepository.getItemAnswer(
      widget.workOrderId,
      reportItem.id,
    );
    final answers = await _reportRepository.getAnswers(widget.workOrderId);
    if (!mounted) {
      return;
    }
    setState(() {
      _answers = answers;
    });
    if (answer != null) {
      _replaceItem(_checklistItemFromAnswer(checklistItem, reportItem, answer));
    }
  }

  Future<void> _markAllItemsNormal() async {
    final task = _task!;
    final template = _template;
    final group = _groupForTask(task);
    final currentUser =
        AppRepositories.instance.remoteWorkOrders?.currentUser ??
            _repository.currentUser;
    if (template != null && group != null) {
      final requiredInputs =
          await _reportService.getRequiredInputsForGroupAllGood(
        workOrderId: widget.workOrderId,
        group: group,
      );
      if (!mounted) {
        return;
      }
      Map<String, Map<String, String>> inputValuesByItem = const {};
      if (requiredInputs.isNotEmpty) {
        final values =
            await showModalBottomSheet<Map<String, Map<String, String>>>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => _TaskAllGoodInputSheet(requests: requiredInputs),
        );
        if (values == null) {
          return;
        }
        inputValuesByItem = values;
      }

      try {
        await _reportService.markGroupAllGood(
          workOrderId: widget.workOrderId,
          template: template,
          group: group,
          user: currentUser,
          inputValuesByItem: inputValuesByItem,
        );
        final answers = await _reportRepository.getAnswers(widget.workOrderId);
        if (!mounted) {
          return;
        }
        setState(() {
          _answers = answers;
          _task = task.copyWith(
            checklistItems: [
              for (final item in task.checklistItems)
                item.copyWith(
                  result: TechnicianFindingResult.normal,
                  note: '',
                  notDoneReason: '',
                  isAnswered: true,
                ),
            ],
          );
        });
        return;
      } catch (error) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Bad state: ', '')),
          ),
        );
        return;
      }
    }

    setState(() {
      _task = task.copyWith(
        checklistItems: [
          for (final item in task.checklistItems)
            item.copyWith(
              result: TechnicianFindingResult.normal,
              note: '',
              notDoneReason: '',
              isAnswered: true,
            ),
        ],
      );
    });
  }

  _ReportItemBinding? _bindingFor(TechnicianChecklistItem checklistItem) {
    final template = _template;
    if (template == null) {
      return null;
    }
    for (final group in template.groups) {
      for (final item in group.items) {
        if (item.id == checklistItem.id ||
            _normalize(item.title) == _normalize(checklistItem.title)) {
          return _ReportItemBinding(group: group, item: item);
        }
      }
    }
    return null;
  }

  ReportTemplateItem? _reportItemFor(TechnicianChecklistItem checklistItem) {
    return _bindingFor(checklistItem)?.item;
  }

  ReportTemplateGroup? _groupForTask(TechnicianTask task) {
    final template = _template;
    if (template == null) {
      return null;
    }
    final checklistIds = task.checklistItems.map((item) => item.id).toSet();
    for (final group in template.groups) {
      if (group.items.any((item) => checklistIds.contains(item.id))) {
        return group;
      }
    }
    for (final group in template.groups) {
      if (_normalize(group.title) == _normalize(task.title)) {
        return group;
      }
    }
    return null;
  }

  TechnicianChecklistItem _checklistItemFromAnswer(
    TechnicianChecklistItem checklistItem,
    ReportTemplateItem reportItem,
    WorkOrderReportAnswer answer,
  ) {
    final selectedOptions = [
      for (final option in reportItem.options)
        if (answer.selectedOptionIds.contains(option.id)) option,
    ];
    final hasNegative = selectedOptions.any(
      (option) =>
          option.scoreType == ReportOptionScoreType.negative ||
          option.scoreType == ReportOptionScoreType.warning,
    );
    final hasNotDone = selectedOptions.any(
      (option) => _normalize(option.label).contains('YAPILAMADI'),
    );
    final result = hasNotDone
        ? TechnicianFindingResult.notDone
        : hasNegative
            ? TechnicianFindingResult.risky
            : TechnicianFindingResult.normal;
    return checklistItem.copyWith(
      result: result,
      note: answer.description,
      notDoneReason: result == TechnicianFindingResult.notDone
          ? answer.description
          : checklistItem.notDoneReason,
      evidenceAssets: [
        for (final imageUrl in answer.imageUrls)
          EvidenceAsset(
            id: '${answer.itemId}-${imageUrl.hashCode}',
            workOrderId: widget.workOrderId,
            taskId: widget.taskId,
            fieldKey: '${answer.itemId}_photo',
            reportFieldKey: '${checklistItem.reportFieldKey}.photo',
            evidenceType: 'image',
            title: '${checklistItem.title} fotoğrafı',
            localPath: imageUrl.startsWith('storage://') ? '' : imageUrl,
            remoteUrl: imageUrl.startsWith('storage://') ? imageUrl : '',
            hash: '',
            capturedAt: answer.updatedAt,
            uploadedAt: answer.updatedAt,
            uploadedBy: answer.answeredByUserId,
            syncStatus: imageUrl.startsWith('storage://')
                ? EvidenceStatus.uploaded
                : EvidenceStatus.localOnly,
            isRequired: false,
            qualityStatus: 'ok',
            rejectionReason: '',
          ),
      ],
      isAnswered: answer.isCompleted,
    );
  }

  String _normalize(String value) {
    return value
        .trim()
        .toUpperCase()
        .replaceAll('İ', 'I')
        .replaceAll('Ğ', 'G')
        .replaceAll('Ü', 'U')
        .replaceAll('Ş', 'S')
        .replaceAll('Ö', 'O')
        .replaceAll('Ç', 'C')
        .replaceAll('ı', 'I')
        .replaceAll('ğ', 'G')
        .replaceAll('ü', 'U')
        .replaceAll('ş', 'S')
        .replaceAll('ö', 'O')
        .replaceAll('ç', 'C')
        .replaceAll(RegExp(r'[^A-Z0-9]+'), '_');
  }

  // ignore: unused_element
  Future<void> _submitTask() async {
    final task = _task!;
    FocusScope.of(context).unfocus();
    await _runSubmitProgress(task.checklistItems.length);
    if (!mounted) {
      return;
    }

    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      final updated =
          await remoteRepository.updateTask(widget.workOrderId, task);
      final submitted = await remoteRepository.submitTask(
        widget.workOrderId,
        task.taskId,
      );
      final savedTask = submitted.tasks.firstWhere(
        (item) => item.taskId == task.taskId,
        orElse: () =>
            updated.tasks.firstWhere((item) => item.taskId == task.taskId),
      );
      if (!mounted) {
        return;
      }
      if (savedTask.status == TaskStatus.evidenceMissing) {
        setState(() {
          _task = savedTask;
          _isSubmitting = false;
        });
        return;
      }
      _returnToTaskList();
      return;
    }

    _repository.updateTask(widget.workOrderId, task);
    final next = _repository.submitTask(widget.workOrderId, task.taskId);
    final savedTask = next.tasks.firstWhere(
      (item) => item.taskId == task.taskId,
    );
    if (savedTask.status == TaskStatus.evidenceMissing) {
      setState(() {
        _task = savedTask;
        _isSubmitting = false;
      });
      return;
    }
    _returnToTaskList();
  }

  Future<void> _runSubmitProgress(int totalItems) async {
    final total = totalItems <= 0 ? 1 : totalItems;
    setState(() {
      _isSubmitting = true;
      _submitTotal = total;
      _submitProgress = 1;
    });

    for (var index = 2; index <= total; index++) {
      await Future<void>.delayed(const Duration(milliseconds: 18));
      if (!mounted) {
        return;
      }
      setState(() => _submitProgress = index);
    }

    await Future<void>.delayed(const Duration(milliseconds: 120));
  }

  void _returnToTaskList() {
    if (!mounted) {
      return;
    }
    setState(() => _isSubmitting = false);
    if (Navigator.canPop(context)) {
      Navigator.pop(context, true);
      return;
    }
    Navigator.pushReplacementNamed(
      context,
      AppRoutes.technicianTasks,
      arguments: widget.workOrderId,
    );
  }
}

class _ChecklistRow extends StatefulWidget {
  const _ChecklistRow({
    required this.item,
    required this.answer,
    required this.enabled,
    required this.onTap,
  });

  final TechnicianChecklistItem item;
  final WorkOrderReportAnswer? answer;
  final bool enabled;
  final VoidCallback onTap;

  @override
  State<_ChecklistRow> createState() => _ChecklistRowState();
}

class _ChecklistRowState extends State<_ChecklistRow> {
  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final answer = widget.answer;
    final isCompleted = answer?.isCompleted ?? item.isAnswered;
    final summary = _summary(answer, item);
    final hasPhoto =
        (answer?.imageUrls.isNotEmpty ?? false) || item.hasEvidence;
    final hasNote = (answer?.description.trim().isNotEmpty ?? false) ||
        item.note.trim().isNotEmpty ||
        item.notDoneReason.trim().isNotEmpty;

    return OtotrCard(
      onTap: widget.enabled ? widget.onTap : null,
      child: Row(
        children: [
          Icon(
            isCompleted ? Icons.check_circle : Icons.search,
            color: isCompleted ? AppColors.success : AppColors.darkText,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  summary,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.grayText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(
            hasNote ? Icons.notes : Icons.notes_outlined,
            color: hasNote ? AppColors.info : AppColors.grayText,
            size: 20,
          ),
          const SizedBox(width: 6),
          Icon(
            hasPhoto ? Icons.photo_camera : Icons.photo_camera_outlined,
            color: hasPhoto ? AppColors.success : AppColors.grayText,
            size: 20,
          ),
        ],
      ),
    );
  }

  String _summary(
    WorkOrderReportAnswer? answer,
    TechnicianChecklistItem item,
  ) {
    if (answer != null) {
      final values = [
        if (answer.selectedOptionLabels.isNotEmpty)
          answer.selectedOptionLabels.join(', '),
        if (answer.inputValues.values.any((value) => value.trim().isNotEmpty))
          answer.inputValues.values
              .where((value) => value.trim().isNotEmpty)
              .join(', '),
        if (answer.description.trim().isNotEmpty) answer.description.trim(),
      ];
      if (values.isNotEmpty) {
        return values.join(' · ');
      }
      return answer.isCompleted ? 'Tamamlandı' : 'Kaydedildi';
    }

    if (item.isAnswered) {
      switch (item.result) {
        case TechnicianFindingResult.normal:
          return 'Normal';
        case TechnicianFindingResult.risky:
          return item.note.trim().isEmpty ? 'Riskli' : item.note.trim();
        case TechnicianFindingResult.notDone:
          return item.notDoneReason.trim().isEmpty
              ? 'Yapılamadı'
              : item.notDoneReason.trim();
      }
    }

    return 'Detayları doldurmak için dokunun';
  }
}

class _TaskAllGoodInputSheet extends StatefulWidget {
  const _TaskAllGoodInputSheet({required this.requests});

  final List<ReportAllGoodInputRequest> requests;

  @override
  State<_TaskAllGoodInputSheet> createState() => _TaskAllGoodInputSheetState();
}

class _TaskAllGoodInputSheetState extends State<_TaskAllGoodInputSheet> {
  late final Map<String, TextEditingController> _controllers;
  String _errorText = '';

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final request in widget.requests)
        _controllerKey(request): TextEditingController(),
    };
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + 16),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.grayBorder,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Ölçüm Değerleri Gerekli',
              style: TextStyle(
                color: AppColors.navy,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Bu başlıkta ölçüm alanları var. Değerleri girmeden tamamını iyiye çekemeyiz.',
              style: TextStyle(
                color: AppColors.grayText,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            for (final request in widget.requests) ...[
              Text(
                request.item.title,
                style: const TextStyle(
                  color: AppColors.darkText,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _controllers[_controllerKey(request)],
                keyboardType: _keyboardType(request.input.type),
                decoration: InputDecoration(
                  labelText: request.label,
                  hintText: _hintFor(request.input),
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_errorText.isNotEmpty) ...[
              Text(
                _errorText,
                style: const TextStyle(
                  color: AppColors.red,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
            ],
            SizedBox(
              width: double.infinity,
              height: AppSizes.buttonHeight,
              child: FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.done_all),
                label: const Text('Değerlerle İyiye Çek'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  TextInputType _keyboardType(String type) {
    switch (type.toLowerCase()) {
      case 'number':
        return const TextInputType.numberWithOptions(decimal: true);
      case 'year':
        return TextInputType.number;
      case 'date':
        return TextInputType.datetime;
      default:
        return TextInputType.text;
    }
  }

  String _hintFor(ReportTemplateInputField input) {
    if (input.placeholder.trim().isNotEmpty) {
      return input.placeholder;
    }
    switch (input.type.toLowerCase()) {
      case 'number':
        return 'Örn. 12.6';
      case 'year':
        return 'Örn. 2023';
      case 'date':
        return 'GG.AA.YYYY';
      default:
        return 'Değeri girin';
    }
  }

  void _submit() {
    final values = <String, Map<String, String>>{};
    final missing = <String>[];
    for (final request in widget.requests) {
      final value = _controllers[_controllerKey(request)]?.text.trim() ?? '';
      if (value.isEmpty) {
        missing.add(request.label);
        continue;
      }
      final itemValues =
          values.putIfAbsent(request.item.id, () => <String, String>{});
      itemValues[request.input.id] = value;
    }

    if (missing.isNotEmpty) {
      setState(() {
        _errorText = 'Boş bırakılamaz: ${missing.join(', ')}';
      });
      return;
    }

    Navigator.pop(context, values);
  }

  String _controllerKey(ReportAllGoodInputRequest request) {
    return '${request.item.id}.${request.input.id}';
  }
}

class _ReportItemBinding {
  const _ReportItemBinding({
    required this.group,
    required this.item,
  });

  final ReportTemplateGroup group;
  final ReportTemplateItem item;
}
