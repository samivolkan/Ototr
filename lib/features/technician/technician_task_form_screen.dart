import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';

class TechnicianTaskFormScreen extends StatefulWidget {
  const TechnicianTaskFormScreen({
    super.key,
    required this.workOrderId,
    required this.taskId,
  });

  final String workOrderId;
  final String taskId;

  @override
  State<TechnicianTaskFormScreen> createState() => _TechnicianTaskFormScreenState();
}

class _TechnicianTaskFormScreenState extends State<TechnicianTaskFormScreen> {
  final _repository = DummyWorkOrderRepository.instance;
  late TechnicianTask _task;
  final _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _task = _repository
        .getById(widget.workOrderId)
        .tasks
        .firstWhere((task) => task.taskId == widget.taskId);
    _noteController.text = _task.customerFriendlyNote;
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final missing = _task.missingReasons();

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
                  _task.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 22,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Test noktalarını doldurup rapora gönderin.',
                  style: TextStyle(color: AppColors.white),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.white,
                    foregroundColor: AppColors.navy,
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Testi Bırak'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSizes.lg),
            child: Column(
              children: [
                for (final item in _task.checklistItems)
                  _ChecklistRow(
                    item: item,
                    onChanged: _replaceItem,
                    onAddEvidence: () => _addEvidence(item),
                  ),
                OtotrCard(
                  child: TextField(
                    controller: _noteController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Müşteri dili teknik notu',
                      hintText: 'Rapor diline uygun, tarafsız ve ölçülebilir not',
                    ),
                    onChanged: (value) {
                      _task = _task.copyWith(customerFriendlyNote: value);
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
                            child: Text('• $item'),
                          ),
                      ],
                    ),
                  ),
                OtotrPrimaryButton(
                  label: 'Başlığı Gönder',
                  icon: Icons.send,
                  onPressed: () {
                    _repository.updateTask(widget.workOrderId, _task);
                    final next = _repository.submitTask(widget.workOrderId, _task.taskId);
                    final savedTask = next.tasks.firstWhere(
                      (item) => item.taskId == _task.taskId,
                    );
                    if (savedTask.status == TaskStatus.evidenceMissing) {
                      setState(() => _task = savedTask);
                      return;
                    }
                    Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.technicianReportGate,
                      arguments: widget.workOrderId,
                    );
                  },
                ),
                const SizedBox(height: 8),
                OtotrSecondaryButton(
                  label: 'Kanıt Fotoğraflarına Git',
                  icon: Icons.photo_camera,
                  onPressed: () => Navigator.pushNamed(
                    context,
                    AppRoutes.technicianEvidence,
                    arguments: widget.workOrderId,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _replaceItem(TechnicianChecklistItem item) {
    setState(() {
      _task = _task.copyWith(
        checklistItems: [
          for (final current in _task.checklistItems)
            if (current.id == item.id) item else current,
        ],
      );
    });
  }

  void _addEvidence(TechnicianChecklistItem item) {
    final asset = EvidenceAsset(
      id: 'ev-${DateTime.now().millisecondsSinceEpoch}',
      workOrderId: widget.workOrderId,
      taskId: _task.taskId,
      fieldKey: '${item.id}_risk_photo',
      reportFieldKey: '${item.reportFieldKey}.photo',
      evidenceType: 'image',
      title: '${item.title} risk fotoğrafı',
      localPath: 'local/${item.id}.jpg',
      remoteUrl: '',
      hash: 'demo-hash-${item.id}',
      capturedAt: DateTime.now(),
      uploadedAt: null,
      uploadedBy: _repository.currentUser.id,
      syncStatus: EvidenceStatus.queued,
      isRequired: true,
      qualityStatus: 'placeholder-ok',
      rejectionReason: '',
    );
    _replaceItem(
      item.copyWith(evidenceAssets: [...item.evidenceAssets, asset]),
    );
  }
}

class _ChecklistRow extends StatefulWidget {
  const _ChecklistRow({
    required this.item,
    required this.onChanged,
    required this.onAddEvidence,
  });

  final TechnicianChecklistItem item;
  final ValueChanged<TechnicianChecklistItem> onChanged;
  final VoidCallback onAddEvidence;

  @override
  State<_ChecklistRow> createState() => _ChecklistRowState();
}

class _ChecklistRowState extends State<_ChecklistRow> {
  late final TextEditingController _noteController;
  late final TextEditingController _reasonController;

  @override
  void initState() {
    super.initState();
    _noteController = TextEditingController(text: widget.item.note);
    _reasonController = TextEditingController(text: widget.item.notDoneReason);
  }

  @override
  void dispose() {
    _noteController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.search, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SegmentedButton<TechnicianFindingResult>(
            segments: const [
              ButtonSegment(
                value: TechnicianFindingResult.normal,
                label: Text('Normal'),
              ),
              ButtonSegment(
                value: TechnicianFindingResult.risky,
                label: Text('Riskli'),
              ),
              ButtonSegment(
                value: TechnicianFindingResult.notDone,
                label: Text('Yapılamadı'),
              ),
            ],
            selected: {item.result},
            onSelectionChanged: (values) {
              widget.onChanged(item.copyWith(result: values.first));
            },
          ),
          if (item.result == TechnicianFindingResult.risky) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'Risk açıklaması'),
              onChanged: (value) => widget.onChanged(item.copyWith(note: value)),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: widget.onAddEvidence,
              icon: const Icon(Icons.camera_alt),
              label: Text(
                item.hasEvidence ? 'Kanıt eklendi' : 'Fotoğraf / Cihaz Çıktısı Ekle',
              ),
            ),
          ],
          if (item.result == TechnicianFindingResult.notDone) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'Yapılamadı nedeni'),
              onChanged: (value) => widget.onChanged(
                item.copyWith(notDoneReason: value),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
