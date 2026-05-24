import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import '../../data/services/report_gate_calculator.dart';

class TechnicianReportGateScreen extends StatelessWidget {
  const TechnicianReportGateScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final repository = DummyWorkOrderRepository.instance;
    final order = repository.getById(workOrderId);
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: repository.syncQueue(),
    );

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Rapor Kapısı'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        order.plate,
                        style: const TextStyle(
                          color: AppColors.red,
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    OtotrStatusBadge(
                      label: result.isReady ? 'Basıma Hazır' : 'Blokaj Var',
                      tone: result.isReady
                          ? OtotrBadgeTone.success
                          : OtotrBadgeTone.danger,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(order.vehicleSummary),
                const SizedBox(height: 8),
                Text('Durum: ${_statusLabel(result.status)}'),
              ],
            ),
          ),
          if (result.isReady)
            const OtotrCard(
              child: Text(
                'Rapor basıma hazır. Tüm usta modülleri, kanıtlar, dış sorgular, müdür onayı ve senkron kontrolü tamam.',
              ),
            )
          else
            OtotrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Blokaj Nedenleri',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  for (final reason in result.blockingReasons)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.block, color: AppColors.red, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(reason)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          if (result.missingEvidence.isNotEmpty)
            _DetailListCard(
              title: 'Ustanın Tamamlayabileceği Eksikler',
              items: result.missingEvidence,
            ),
          if (result.missingExternalQueries.isNotEmpty)
            _DetailListCard(
              title: 'Sekreterya / Portal Kaynaklı Eksikler',
              items: result.missingExternalQueries,
            ),
        ],
      ),
    );
  }

  String _statusLabel(ReportGateStatus status) {
    switch (status) {
      case ReportGateStatus.ready:
        return 'Hazır';
      case ReportGateStatus.blocked:
        return 'Kapalı';
      case ReportGateStatus.externalQueryPending:
        return 'Dış sorgu bekliyor';
      case ReportGateStatus.syncPending:
        return 'Senkron bekliyor';
      case ReportGateStatus.managerApprovalRequired:
        return 'Müdür onayı bekliyor';
    }
  }
}

class _DetailListCard extends StatelessWidget {
  const _DetailListCard({
    required this.title,
    required this.items,
  });

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text('• $item'),
            ),
        ],
      ),
    );
  }
}
