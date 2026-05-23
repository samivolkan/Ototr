import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/work_order_model.dart';

class WorkOrdersListScreen extends StatelessWidget {
  const WorkOrdersListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final statuses = WorkOrderStatus.values.where((status) => status != WorkOrderStatus.cancelled);
    return Scaffold(
      appBar: const OtotrAppBar(title: 'İş Emirleri'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          for (final status in statuses) ...[
            OtotrSectionTitle(title: status.label),
            ...DummyData.workOrders.where((order) => order.status == status).map(
                  (order) => OtotrCard(
                    onTap: () => Navigator.pushNamed(context, AppRoutes.workOrderDetail),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(child: Text(order.number, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17))),
                            OtotrStatusBadge(label: order.status.label, tone: _tone(order.status)),
                          ],
                        ),
                        const SizedBox(height: AppSizes.sm),
                        Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
                        Text('${order.customer.fullName} | Teknisyen: ${order.assignedTechnician}'),
                        Text('Saat: ${Formatters.time(order.createdAt)} | ${order.packagePlan.name}'),
                        if (order.criticalFindingCount > 0 || order.missingRequiredPhotoCount > 0) ...[
                          const SizedBox(height: AppSizes.sm),
                          Text(
                            'Uyarı: ${order.criticalFindingCount} kritik bulgu, ${order.missingRequiredPhotoCount} eksik zorunlu fotoğraf',
                            style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }

  OtotrBadgeTone _tone(WorkOrderStatus status) {
    return switch (status) {
      WorkOrderStatus.delivered => OtotrBadgeTone.success,
      WorkOrderStatus.missingPhotoEvidence || WorkOrderStatus.approvalWaiting => OtotrBadgeTone.warning,
      WorkOrderStatus.inspectionInProgress || WorkOrderStatus.reportPreparing => OtotrBadgeTone.info,
      _ => OtotrBadgeTone.neutral,
    };
  }
}
