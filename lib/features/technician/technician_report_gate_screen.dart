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
import 'widgets/technician_missing_notifications.dart';
import 'widgets/technician_vehicle_header.dart';

class TechnicianReportGateScreen extends StatefulWidget {
  const TechnicianReportGateScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<TechnicianReportGateScreen> createState() =>
      _TechnicianReportGateScreenState();
}

class _TechnicianReportGateScreenState
    extends State<TechnicianReportGateScreen> {
  @override
  Widget build(BuildContext context) {
    final remoteRepository = AppRepositories.instance.remoteWorkOrders;
    if (remoteRepository != null) {
      return FutureBuilder<TechnicianWorkOrder>(
        future: remoteRepository.getById(widget.workOrderId),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              appBar: const OtotrAppBar(title: 'Eksik Bildirimleri'),
              backgroundColor: AppColors.grayBg,
              body: Padding(
                padding: const EdgeInsets.all(AppSizes.lg),
                child: OtotrCard(
                  child: Text(
                    'Eksik bildirimleri alınamadı: ${snapshot.error}',
                    style: const TextStyle(color: AppColors.red),
                  ),
                ),
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Scaffold(
              appBar: OtotrAppBar(title: 'Eksik Bildirimleri'),
              backgroundColor: AppColors.grayBg,
              body: Center(child: CircularProgressIndicator()),
            );
          }

          final result = const ReportGateCalculator().calculate(
            workOrder: snapshot.data!,
            syncQueue: const [],
          );
          return _ReportGateView(
            order: snapshot.data!,
            result: result,
            onNeedsRefresh: _refresh,
          );
        },
      );
    }

    final repository = DummyWorkOrderRepository.instance;
    final order = repository.getById(widget.workOrderId);
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: repository.syncQueue(),
    );

    return _ReportGateView(
      order: order,
      result: result,
      onNeedsRefresh: _refresh,
    );
  }

  void _refresh() {
    if (mounted) {
      setState(() {});
    }
  }
}

class _ReportGateView extends StatelessWidget {
  const _ReportGateView({
    required this.order,
    required this.result,
    required this.onNeedsRefresh,
  });

  final TechnicianWorkOrder order;
  final ReportGateResult result;
  final VoidCallback onNeedsRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Eksik Bildirimleri'),
      backgroundColor: AppColors.grayBg,
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          TechnicianVehicleHeader(
            order: order,
            status: Row(
              children: [
                OtotrStatusBadge(
                  label: result.isReady ? 'Eksik Yok' : 'Eksik Var',
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
                'Ustanın tamamlayacağı eksik bulunmuyor.',
              ),
            )
          else
            TechnicianMissingNotifications(
              order: order,
              onChanged: onNeedsRefresh,
            ),
        ],
      ),
    );
  }

  String _statusLabel(ReportGateStatus status) {
    switch (status) {
      case ReportGateStatus.ready:
        return 'Tamam';
      case ReportGateStatus.blocked:
        return 'Eksik var';
      case ReportGateStatus.externalQueryPending:
        return 'Sekreterya/portal bekliyor';
      case ReportGateStatus.syncPending:
        return 'Tamam';
      case ReportGateStatus.managerApprovalRequired:
        return 'Müdür onayı bekliyor';
    }
  }
}
