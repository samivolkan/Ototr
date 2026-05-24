import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import 'widgets/technician_vehicle_header.dart';

class TechnicianEvidenceScreen extends StatefulWidget {
  const TechnicianEvidenceScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<TechnicianEvidenceScreen> createState() =>
      _TechnicianEvidenceScreenState();
}

class _TechnicianEvidenceScreenState extends State<TechnicianEvidenceScreen> {
  final _repository = DummyWorkOrderRepository.instance;

  @override
  Widget build(BuildContext context) {
    final order = _repository.getById(widget.workOrderId);
    final tasks = order.tasksFor(_repository.currentTechnicianRole);
    final assets = [
      for (final task in tasks) ...task.evidenceAssets,
    ];

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Kanıt Fotoğrafları'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            role: _repository.currentTechnicianRole,
            message:
                'Fotoğraflar ilk fazda yerel kuyruk olarak işaretlenir. Firebase upload sonraki fazda bağlanacak.',
          ),
          if (assets.isEmpty)
            const OtotrCard(child: Text('Bu role ait zorunlu ek kanıt yok.')),
          for (final asset in assets)
            _EvidenceCard(
              asset: asset,
              canCapture: tasks
                  .firstWhere((task) => task.taskId == asset.taskId)
                  .canEditBy(_repository.currentUser),
              onCapture: () => _captureAsset(order, asset),
            ),
        ],
      ),
    );
  }

  void _captureAsset(TechnicianWorkOrder order, EvidenceAsset asset) {
    final tasks = [
      for (final task in order.tasks)
        if (task.taskId == asset.taskId)
          task.copyWith(
            evidenceAssets: [
              for (final current in task.evidenceAssets)
                if (current.id == asset.id)
                  current.copyWith(
                    localPath: 'local/${asset.fieldKey}.jpg',
                    hash: 'demo-hash-${asset.fieldKey}',
                    syncStatus: EvidenceStatus.queued,
                    qualityStatus: 'placeholder-ok',
                  )
                else
                  current,
            ],
          )
        else
          task,
    ];
    _repository.updateTask(
      order.id,
      order.tasks.firstWhere((task) => task.taskId == asset.taskId).copyWith(
            evidenceAssets: tasks
                .firstWhere((task) => task.taskId == asset.taskId)
                .evidenceAssets,
          ),
    );
    setState(() {});
  }
}

class _EvidenceCard extends StatelessWidget {
  const _EvidenceCard({
    required this.asset,
    required this.canCapture,
    required this.onCapture,
  });

  final EvidenceAsset asset;
  final bool canCapture;
  final VoidCallback onCapture;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      onTap: canCapture ? onCapture : null,
      child: Row(
        children: [
          Icon(
            asset.isAvailable ? Icons.check_circle : Icons.camera_alt,
            color: asset.isAvailable ? AppColors.success : AppColors.red,
            size: 34,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  asset.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  asset.reportFieldKey,
                  style:
                      const TextStyle(color: AppColors.grayText, fontSize: 12),
                ),
              ],
            ),
          ),
          OtotrStatusBadge(
            label: !canCapture
                ? 'Read-only'
                : asset.isAvailable
                    ? 'Kuyrukta'
                    : 'Eksik',
            tone: !canCapture
                ? OtotrBadgeTone.neutral
                : asset.isAvailable
                    ? OtotrBadgeTone.warning
                    : OtotrBadgeTone.danger,
          ),
        ],
      ),
    );
  }
}
