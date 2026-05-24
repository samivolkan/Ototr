import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/models/technician_operation_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/dummy_work_order_repository.dart';
import '../../data/services/report_gate_calculator.dart';
import 'widgets/technician_vehicle_header.dart';

class TechnicianReportGateScreen extends StatelessWidget {
  const TechnicianReportGateScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return FutureBuilder<TechnicianWorkOrder>(
        future: remoteRepository.getById(workOrderId),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              appBar: const OtotrAppBar(title: 'Rapor Kapısı'),
              backgroundColor: AppColors.grayBg,
              body: Padding(
                padding: const EdgeInsets.all(AppSizes.lg),
                child: OtotrCard(
                  child: Text(
                    'Supabase rapor kapısı alınamadı: ${snapshot.error}',
                    style: const TextStyle(color: AppColors.red),
                  ),
                ),
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Scaffold(
              appBar: OtotrAppBar(title: 'Rapor Kapısı'),
              backgroundColor: AppColors.grayBg,
              body: Center(child: CircularProgressIndicator()),
            );
          }

          final result = const ReportGateCalculator().calculate(
            workOrder: snapshot.data!,
            syncQueue: const [],
          );
          return _ReportGateView(order: snapshot.data!, result: result);
        },
      );
    }

    final repository = DummyWorkOrderRepository.instance;
    final order = repository.getById(workOrderId);
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: repository.syncQueue(),
    );

    return _ReportGateView(order: order, result: result);
  }
}

class _ReportGateView extends StatelessWidget {
  const _ReportGateView({
    required this.order,
    required this.result,
  });

  final TechnicianWorkOrder order;
  final ReportGateResult result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Rapor Kapısı'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            status: Row(
              children: [
                OtotrStatusBadge(
                  label: result.isReady ? 'Basıma Hazır' : 'Blokaj Var',
                  tone: result.isReady
                      ? OtotrBadgeTone.success
                      : OtotrBadgeTone.danger,
                ),
                const SizedBox(width: 8),
                Expanded(child: Text('Durum: ${_statusLabel(result.status)}')),
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
                          const Icon(Icons.block,
                              color: AppColors.red, size: 18),
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
