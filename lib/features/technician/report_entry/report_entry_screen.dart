import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/constants/app_sizes.dart';
import '../../../core/navigation/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/ototr_app_bar.dart';
import '../../../core/widgets/ototr_card.dart';
import '../../../core/widgets/ototr_primary_button.dart';
import '../../../core/widgets/ototr_secondary_button.dart';
import '../../../data/models/report_template_model.dart';
import '../../../data/models/technician_operation_model.dart';
import '../../../data/models/user_profile_model.dart';
import '../../../data/repositories/app_repositories.dart';
import '../../../data/repositories/dummy_work_order_repository.dart';
import '../../../data/repositories/report_template_repository.dart';
import '../../../data/repositories/work_order_report_repository.dart';
import '../../../data/services/photo_upload_service.dart';
import '../../../data/services/work_order_report_service.dart';
import '../widgets/technician_vehicle_header.dart';

class ReportEntryScreen extends StatefulWidget {
  const ReportEntryScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<ReportEntryScreen> createState() => _ReportEntryScreenState();
}

class _ReportEntryScreenState extends State<ReportEntryScreen> {
  Future<_ReportEntryData>? _future;
  String? _selectedGroupId;
  final ReportTemplateRepository _assetTemplateRepository =
      AssetReportTemplateRepository();
  final WorkOrderReportRepository _localReportRepository =
      LocalWorkOrderReportRepository.instance;
  final TextEditingController _bodyPaintMicronController =
      TextEditingController();

  WorkOrderReportService get _service => WorkOrderReportService(
        templateRepository: _templateRepository,
        reportRepository: _reportRepository,
      );

  ReportTemplateRepository get _templateRepository =>
      AppRepositories.instance.remoteWorkOrders == null
          ? _assetTemplateRepository
          : AppRepositories.instance.reportTemplates;

  WorkOrderReportRepository get _reportRepository =>
      AppRepositories.instance.remoteWorkOrders == null
          ? _localReportRepository
          : AppRepositories.instance.workOrderReports;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _bodyPaintMicronController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_ReportEntryData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: const OtotrAppBar(title: 'Rapor Girişi'),
            backgroundColor: AppColors.grayBg,
            body: Padding(
              padding: const EdgeInsets.all(AppSizes.lg),
              child: OtotrCard(
                child: Text(
                  'Rapor şablonu alınamadı: ${snapshot.error}',
                  style: const TextStyle(color: AppColors.red),
                ),
              ),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Scaffold(
            appBar: OtotrAppBar(title: 'Rapor Girişi'),
            backgroundColor: AppColors.grayBg,
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final data = snapshot.data!;
        final selectedGroup =
            _selectedGroupId == null ? null : _selectedVisibleGroup(data);

        return Scaffold(
          appBar: OtotrAppBar(
            title: selectedGroup == null ? 'Rapor Girişi' : selectedGroup.title,
          ),
          backgroundColor: AppColors.grayBg,
          body: selectedGroup == null
              ? _buildGroups(data)
              : _buildGroupDetail(data, selectedGroup),
        );
      },
    );
  }

  Widget _buildGroups(_ReportEntryData data) {
    return ListView(
      padding: const EdgeInsets.all(AppSizes.lg),
      children: [
        TechnicianVehicleHeader(order: data.order),
        _OverallProgressCard(percent: data.overallPercent),
        for (final group in data.visibleGroups)
          _GroupProgressCard(
            group: group,
            progress: data.progress[group.id],
            onTap: () => setState(() => _selectedGroupId = group.id),
          ),
        OtotrSecondaryButton(
          label: 'Rapor Medyalarına Git',
          icon: Icons.photo_camera,
          onPressed: () => Navigator.pushNamed(
            context,
            AppRoutes.technicianEvidence,
            arguments: widget.workOrderId,
          ).then((_) => _refresh()),
        ),
        const SizedBox(height: 8),
        OtotrPrimaryButton(
          label: 'Final Raporu Hazırla',
          icon: Icons.article,
          onPressed: () => Navigator.pushNamed(
            context,
            AppRoutes.finalReportPreview,
            arguments: widget.workOrderId,
          ).then((_) => _refresh()),
        ),
      ],
    );
  }

  Widget _buildGroupDetail(
    _ReportEntryData data,
    ReportTemplateGroup group,
  ) {
    final answersByItem = {
      for (final answer in data.answers) answer.itemId: answer,
    };
    final progress = data.progress[group.id];
    final total = progress?.totalItems ?? group.items.length;
    final completed = progress?.completedItems ??
        group.items
            .where((item) => answersByItem[item.id]?.isCompleted == true)
            .length;
    final isGroupComplete = total > 0 && completed >= total;

    return ListView(
      padding: const EdgeInsets.all(AppSizes.lg),
      children: [
        OtotrSecondaryButton(
          label: 'Gruplara Dön',
          icon: Icons.arrow_back,
          onPressed: () => setState(() => _selectedGroupId = null),
        ),
        _GroupProgressCard(
          group: group,
          progress: progress,
          onTap: () {},
        ),
        for (final item in group.items)
          _ReportItemCard(
            item: item,
            answer: answersByItem[item.id],
            onTap: () => _openItemForm(data, group, item),
          ),
        if (isBodyPaintReportGroup(group) && reportGroupHasMicronInputs(group))
          _MicronQuickInputCard(controller: _bodyPaintMicronController),
        OtotrCard(
          child: SizedBox(
            width: double.infinity,
            height: AppSizes.buttonHeight,
            child: FilledButton.icon(
              onPressed: () => _markGroupAllGood(data, group),
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
        _SubmitGroupCard(
          completed: completed,
          total: total,
          isComplete: isGroupComplete,
          onSubmit: () => _submitGroup(group),
        ),
      ],
    );
  }

  Future<_ReportEntryData> _load() async {
    final repositories = AppRepositories.instance;
    final template = await _templateRepository.getActiveTemplate();
    final visibleGroups = [
      for (final group in template.groups)
        if (_isTechnicianVisibleGroup(group)) group,
    ];
    final answers = await _reportRepository.getAnswers(
      widget.workOrderId,
    );
    final progressList = await _service.getReportProgress(widget.workOrderId);
    final overallPercent = _overallPercentForGroups(visibleGroups, answers);
    final remote = repositories.remoteWorkOrders;
    final order = remote == null
        ? DummyWorkOrderRepository.instance.getById(widget.workOrderId)
        : await remote.getById(widget.workOrderId);
    final currentUser =
        remote?.currentUser ?? DummyWorkOrderRepository.instance.currentUser;

    return _ReportEntryData(
      template: template,
      visibleGroups: visibleGroups,
      order: order,
      answers: answers,
      progress: {
        for (final item in progressList)
          if (visibleGroups.any((group) => group.id == item.groupId))
            item.groupId: item,
      },
      overallPercent: overallPercent,
      currentUser: currentUser,
    );
  }

  ReportTemplateGroup? _selectedVisibleGroup(_ReportEntryData data) {
    for (final group in data.visibleGroups) {
      if (group.id == _selectedGroupId) {
        return group;
      }
    }
    return null;
  }

  Future<void> _openItemForm(
    _ReportEntryData data,
    ReportTemplateGroup group,
    ReportTemplateItem item,
  ) async {
    await _reportRepository.lockItem(
      widget.workOrderId,
      item.id,
      data.currentUser.id,
    );
    if (!mounted) {
      return;
    }
    final answer = await _reportRepository.getItemAnswer(
      widget.workOrderId,
      item.id,
    );
    if (!mounted) {
      return;
    }
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ReportItemFormSheet(
        workOrderId: widget.workOrderId,
        template: data.template,
        group: group,
        item: item,
        answer: answer,
        user: data.currentUser,
        service: _service,
      ),
    );
    await _reportRepository.unlockItem(
      widget.workOrderId,
      item.id,
      data.currentUser.id,
    );
    if (changed == true) {
      _refresh();
    }
  }

  Future<void> _markGroupAllGood(
    _ReportEntryData data,
    ReportTemplateGroup group,
  ) async {
    final quickInputValues = sharedMicronInputValuesForGroup(
      group,
      isBodyPaintReportGroup(group) ? _bodyPaintMicronController.text : '',
    );
    final requiredInputs = await _service.getRequiredInputsForGroupAllGood(
      workOrderId: widget.workOrderId,
      group: group,
      inputValuesByItem: quickInputValues,
    );
    if (!mounted) {
      return;
    }

    var inputValuesByItem = quickInputValues;
    if (requiredInputs.isNotEmpty) {
      final values =
          await showModalBottomSheet<Map<String, Map<String, String>>>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (_) => _AllGoodInputSheet(requests: requiredInputs),
      );
      if (values == null) {
        return;
      }
      inputValuesByItem = mergeReportInputValuesByItem(
        quickInputValues,
        values,
      );
    }

    try {
      await _service.markGroupAllGood(
        workOrderId: widget.workOrderId,
        template: data.template,
        group: group,
        user: data.currentUser,
        inputValuesByItem: inputValuesByItem,
      );
      _refresh();
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

  void _refresh() {
    setState(() {
      _future = _load();
    });
  }

  void _submitGroup(ReportTemplateGroup group) {
    Navigator.pushReplacementNamed(
      context,
      AppRoutes.technicianTasks,
      arguments: widget.workOrderId,
    );
  }
}

bool _isTechnicianVisibleGroup(ReportTemplateGroup group) {
  final role = group.assignedRole.toLowerCase();
  const secretaryCodes = {
    'WORK_ORDER_ACCEPTANCE',
    'VEHICLE_FILE_CHECK',
  };
  return !role.contains('sekreter') &&
      !role.contains('secret') &&
      !secretaryCodes.contains(group.code);
}

int _overallPercentForGroups(
  List<ReportTemplateGroup> groups,
  List<WorkOrderReportAnswer> answers,
) {
  final totalItems = groups.fold(0, (sum, group) => sum + group.items.length);
  if (totalItems == 0) {
    return 0;
  }
  final visibleGroupIds = groups.map((group) => group.id).toSet();
  final completed = answers
      .where(
        (answer) =>
            answer.isCompleted && visibleGroupIds.contains(answer.groupId),
      )
      .length;
  return ((completed / totalItems) * 100).round();
}

class _SubmitGroupCard extends StatelessWidget {
  const _SubmitGroupCard({
    required this.completed,
    required this.total,
    required this.isComplete,
    required this.onSubmit,
  });

  final int completed;
  final int total;
  final bool isComplete;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final missing = (total - completed).clamp(0, total);
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isComplete ? Icons.check_circle : Icons.pending_actions,
                color: isComplete ? AppColors.success : AppColors.warning,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isComplete
                      ? 'Bu başlık tamamlandı'
                      : '$completed/$total madde tamamlandı',
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isComplete
                ? 'Başlığı gönderip testlerin olduğu sayfaya dönebilirsiniz.'
                : '$missing madde tamamlanmadan başlık gönderilemez.',
            style: const TextStyle(
              color: AppColors.grayText,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: AppSizes.buttonHeight,
            child: FilledButton.icon(
              onPressed: isComplete ? onSubmit : null,
              icon: const Icon(Icons.send),
              label: const Text('Başlığı Gönder'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MicronQuickInputCard extends StatelessWidget {
  const _MicronQuickInputCard({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: TextField(
        controller: controller,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textInputAction: TextInputAction.done,
        decoration: const InputDecoration(
          labelText: 'Mikron Gir',
          hintText: 'Örn. 160',
          prefixIcon: Icon(Icons.speed),
        ),
      ),
    );
  }
}

class _ReportEntryData {
  const _ReportEntryData({
    required this.template,
    required this.visibleGroups,
    required this.order,
    required this.answers,
    required this.progress,
    required this.overallPercent,
    required this.currentUser,
  });

  final ReportTemplate template;
  final List<ReportTemplateGroup> visibleGroups;
  final TechnicianWorkOrder order;
  final List<WorkOrderReportAnswer> answers;
  final Map<String, ReportGroupProgress> progress;
  final int overallPercent;
  final UserProfile currentUser;
}

class _OverallProgressCard extends StatelessWidget {
  const _OverallProgressCard({required this.percent});

  final int percent;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Toplam İş Emri Tamamlanma',
            style: TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w900,
              fontSize: 17,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 9,
                    value: percent / 100,
                    color: AppColors.success,
                    backgroundColor: AppColors.grayBorder,
                  ),
                ),
              ),
              const SizedBox(width: 12),
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
        ],
      ),
    );
  }
}

class _GroupProgressCard extends StatelessWidget {
  const _GroupProgressCard({
    required this.group,
    required this.progress,
    required this.onTap,
  });

  final ReportTemplateGroup group;
  final ReportGroupProgress? progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final completed = progress?.completedItems ?? 0;
    final total = progress?.totalItems ?? group.items.length;
    final percent = progress?.progressPercent ?? 0;

    return OtotrCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  group.title,
                  style: const TextStyle(
                    color: AppColors.darkText,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '%$percent',
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${group.assignedRole} · $completed/$total tamamlandı',
            style: const TextStyle(
              color: AppColors.grayText,
              fontWeight: FontWeight.w700,
            ),
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
        ],
      ),
    );
  }
}

class _ReportItemCard extends StatelessWidget {
  const _ReportItemCard({
    required this.item,
    required this.answer,
    required this.onTap,
  });

  final ReportTemplateItem item;
  final WorkOrderReportAnswer? answer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final completed = answer?.isCompleted ?? false;
    final hasPhoto = answer?.imageUrls.isNotEmpty ?? false;
    final hasDescription = answer?.description.trim().isNotEmpty ?? false;
    final inputSummary = answer?.inputValues.values
        .where((value) => value.isNotEmpty)
        .join(', ');
    final optionSummary = answer?.selectedOptionLabels.join(', ') ?? '';
    final summary = answer == null
        ? 'Bekliyor'
        : [
            if (optionSummary.isNotEmpty) optionSummary,
            if (inputSummary != null && inputSummary.isNotEmpty) inputSummary,
          ].join(' · ');

    return OtotrCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            completed ? Icons.check_circle : Icons.radio_button_unchecked,
            color: completed ? AppColors.success : AppColors.grayText,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    color: AppColors.darkText,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  summary.isEmpty ? 'Kaydedildi' : summary,
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
            hasDescription ? Icons.notes : Icons.notes_outlined,
            color: hasDescription ? AppColors.info : AppColors.grayText,
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
}

class _ReportItemFormSheet extends StatefulWidget {
  const _ReportItemFormSheet({
    required this.workOrderId,
    required this.template,
    required this.group,
    required this.item,
    required this.answer,
    required this.user,
    required this.service,
  });

  final String workOrderId;
  final ReportTemplate template;
  final ReportTemplateGroup group;
  final ReportTemplateItem item;
  final WorkOrderReportAnswer? answer;
  final UserProfile user;
  final WorkOrderReportService service;

  @override
  State<_ReportItemFormSheet> createState() => _ReportItemFormSheetState();
}

class _ReportItemFormSheetState extends State<_ReportItemFormSheet> {
  late final TextEditingController _descriptionController;
  late final Map<String, TextEditingController> _inputControllers;
  late List<String> _selectedOptionIds;
  late List<String> _imageUrls;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedOptionIds = [...?widget.answer?.selectedOptionIds];
    _imageUrls = [...?widget.answer?.imageUrls];
    _descriptionController = TextEditingController(
      text: widget.answer?.description ?? '',
    );
    _inputControllers = {
      for (final input in widget.item.inputFields)
        input.id: TextEditingController(
          text: widget.answer?.inputValues[input.id] ?? input.value,
        ),
    };
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    for (final controller in _inputControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final imageSlotCount = widget.item.maxImages > 0
        ? widget.item.maxImages.clamp(1, 3).toInt()
        : 3;
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
            Text(
              widget.item.modalTitle.isEmpty
                  ? widget.item.title
                  : widget.item.modalTitle,
              style: const TextStyle(
                color: AppColors.navy,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${widget.group.title} · Nokta ${widget.item.noktaId}',
              style: const TextStyle(
                color: AppColors.grayText,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            if (widget.item.options.isNotEmpty) ...[
              Column(
                children: [
                  for (final option in widget.item.options)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: _OptionChip(
                        option: option,
                        selected: _selectedOptionIds.contains(option.id),
                        onTap: () => _toggleOption(option),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            for (final input in widget.item.inputFields) ...[
              TextField(
                controller: _inputControllers[input.id],
                keyboardType: input.type == 'number'
                    ? TextInputType.number
                    : TextInputType.text,
                decoration: InputDecoration(
                  labelText: input.label.isEmpty ? input.name : input.label,
                  hintText: input.placeholder,
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (widget.item.hasDescription) ...[
              TextField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Açıklama',
                  hintText: 'Gerekli notu yazın',
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (widget.item.hasImages) ...[
              OutlinedButton.icon(
                key: ValueKey(imageSlotCount),
                onPressed: _saving ? null : _addImage,
                icon: const Icon(Icons.photo_camera),
                label: Text(
                  _imageUrls.isEmpty
                      ? 'Fotoğraf Kanıtı Ekle'
                      : '${_imageUrls.length} fotoğraf eklendi',
                ),
              ),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _saving ? null : () => _save(complete: false),
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Kaydet'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _saving ? null : () => _save(complete: true),
                    icon: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check),
                    label: const Text('Tamamlandı'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _toggleOption(ReportTemplateOption option) {
    if (option.disabled) {
      return;
    }
    setState(() {
      if (widget.item.allowsMultipleOptions) {
        if (_selectedOptionIds.contains(option.id)) {
          _selectedOptionIds.remove(option.id);
        } else {
          _selectedOptionIds.add(option.id);
        }
      } else {
        _selectedOptionIds = [option.id];
      }
    });
  }

  Future<void> _addImage() async {
    if (widget.item.maxImages > 0 &&
        _imageUrls.length >= widget.item.maxImages) {
      return;
    }

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Kamera ile çek'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Galeriden seç'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) {
      return;
    }

    final picked = await ImagePicker().pickImage(
      source: source,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (picked == null) {
      return;
    }

    setState(() => _saving = true);
    final uploader = PhotoUploadService(client: _activeSupabaseClient());
    final result = await uploader.uploadReportPhoto(
      workOrderId: widget.workOrderId,
      itemId: widget.item.id,
      localPath: picked.path,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _imageUrls.add(result.reference);
      _saving = false;
    });
  }

  SupabaseClient? _activeSupabaseClient() {
    if (AppRepositories.instance.remoteWorkOrders == null) {
      return null;
    }
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  Future<void> _save({required bool complete}) async {
    setState(() => _saving = true);
    try {
      await widget.service.saveItemAnswer(
        workOrderId: widget.workOrderId,
        template: widget.template,
        group: widget.group,
        item: widget.item,
        user: widget.user,
        selectedOptionIds: _selectedOptionIds,
        inputValues: {
          for (final entry in _inputControllers.entries)
            entry.key: entry.value.text,
        },
        description: _descriptionController.text,
        imageUrls: _imageUrls,
        complete: complete,
      );
      if (!mounted) {
        return;
      }
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(error.toString().replaceFirst('Bad state: ', ''))),
      );
    }
  }
}

class _AllGoodInputSheet extends StatefulWidget {
  const _AllGoodInputSheet({required this.requests});

  final List<ReportAllGoodInputRequest> requests;

  @override
  State<_AllGoodInputSheet> createState() => _AllGoodInputSheetState();
}

class _AllGoodInputSheetState extends State<_AllGoodInputSheet> {
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
            const SizedBox(height: 6),
            const Text(
              'Bu başlıkta sahadan girilmesi gereken değerler var. '
              'Değerleri girmeden tamamını iyiye çekemeyiz.',
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

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final ReportTemplateOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _tone(option.colorType);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 42),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? color.withAlpha(48) : _softTone(option.colorType),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? color : color.withAlpha(92)),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              color: color,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                option.label,
                style: const TextStyle(
                  color: AppColors.darkText,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _softTone(ReportOptionColorType type) {
    switch (type) {
      case ReportOptionColorType.green:
        return const Color(0xFFEAF7F0);
      case ReportOptionColorType.red:
        return const Color(0xFFFFECEC);
      case ReportOptionColorType.orange:
        return const Color(0xFFFFF7D6);
      case ReportOptionColorType.blue:
        return const Color(0xFFEAF1FF);
      case ReportOptionColorType.gray:
      case ReportOptionColorType.neutral:
        return AppColors.white;
    }
  }

  Color _tone(ReportOptionColorType type) {
    switch (type) {
      case ReportOptionColorType.green:
        return AppColors.success;
      case ReportOptionColorType.red:
        return AppColors.red;
      case ReportOptionColorType.orange:
        return AppColors.warning;
      case ReportOptionColorType.blue:
        return AppColors.info;
      case ReportOptionColorType.gray:
      case ReportOptionColorType.neutral:
        return AppColors.grayText;
    }
  }
}
