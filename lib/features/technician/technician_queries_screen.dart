import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';

class TechnicianQueriesScreen extends StatelessWidget {
  const TechnicianQueriesScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final order = DummyWorkOrderRepository.instance.getById(workOrderId);

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Tramer / KM'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.plate,
                  style: const TextStyle(
                    color: AppColors.red,
                    fontWeight: FontWeight.w900,
                    fontSize: 24,
                  ),
                ),
                const Text(
                  'Dış sorgular portal entegrasyonundan gelir. Android usta sonucu sadece okur.',
                  style: TextStyle(color: AppColors.grayText),
                ),
              ],
            ),
          ),
          for (final query in order.externalQueries)
            _QueryCard(query: query),
        ],
      ),
    );
  }
}

class _QueryCard extends StatelessWidget {
  const _QueryCard({required this.query});

  final ExternalQuery query;

  @override
  Widget build(BuildContext context) {
    final isReady = query.status == ExternalQueryStatus.ready;
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  query.type,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
              ),
              OtotrStatusBadge(
                label: isReady ? 'İşlendi' : 'Bekliyor',
                tone: isReady ? OtotrBadgeTone.success : OtotrBadgeTone.warning,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Kaynak: ${query.source}'),
          Text(
            query.queriedAt == null
                ? 'Sorgu zamanı: bekliyor'
                : 'Sorgu zamanı: ${query.queriedAt}',
          ),
          if (query.resultSummary.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(query.resultSummary),
          ],
          if (query.blockingReason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              query.blockingReason,
              style: const TextStyle(color: AppColors.red),
            ),
          ],
        ],
      ),
    );
  }
}
