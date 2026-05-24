import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';

class TechnicianSyncScreen extends StatefulWidget {
  const TechnicianSyncScreen({super.key});

  @override
  State<TechnicianSyncScreen> createState() => _TechnicianSyncScreenState();
}

class _TechnicianSyncScreenState extends State<TechnicianSyncScreen> {
  final _repository = DummyWorkOrderRepository.instance;

  @override
  Widget build(BuildContext context) {
    final queue = _repository.syncQueue();

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Senkron ve Audit'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${queue.length} kayıt senkron bekliyor',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Form önce payload, sonra fotoğraf metadata, sonra dosya upload sırası ile gönderilecek. Aynı idempotencyKey iki kez rapora yazılmaz.',
                  style: TextStyle(color: AppColors.grayText),
                ),
              ],
            ),
          ),
          for (final item in queue) _QueueCard(item: item),
          OtotrPrimaryButton(
            label: 'Senkronu Simüle Et',
            icon: Icons.cloud_done,
            onPressed: () async {
              await _repository.flushSyncQueue();
              if (mounted) {
                setState(() {});
              }
            },
          ),
        ],
      ),
    );
  }
}

class _QueueCard extends StatelessWidget {
  const _QueueCard({required this.item});

  final OfflineSyncQueue item;

  @override
  Widget build(BuildContext context) {
    final isSynced = item.status == SyncQueueStatus.synced;
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.operationType,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              OtotrStatusBadge(
                label: isSynced ? 'Senkronlandı' : 'Bekliyor',
                tone: isSynced ? OtotrBadgeTone.success : OtotrBadgeTone.warning,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('İş emri: ${item.workOrderId}'),
          Text('Görev: ${item.taskId}'),
          Text('Idempotency: ${item.idempotencyKey}'),
          if (item.lastError.isNotEmpty)
            Text(
              item.lastError,
              style: const TextStyle(color: AppColors.red),
            ),
        ],
      ),
    );
  }
}
