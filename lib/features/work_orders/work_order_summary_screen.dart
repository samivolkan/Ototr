import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../data/dummy/dummy_data.dart';

class WorkOrderSummaryScreen extends StatelessWidget {
  const WorkOrderSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = DummyData.workOrder;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'İş Emri Özeti'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          const OtotrAlertCard(
            title: 'Eksik alan kontrolü',
            message:
                'Zorunlu fotoğraflar rapor onayı öncesi tamamlanmalı. Demo akışta iş emri oluşturulabilir.',
          ),
          const OtotrSectionTitle(title: 'Araç'),
          OtotrCard(
              child: Text(
                  '${order.vehicle.plate}\n${order.vehicle.displayName}\n${order.vehicle.kilometers} km')),
          const OtotrSectionTitle(title: 'Müşteri'),
          OtotrCard(
              child: Text(
                  '${order.customer.fullName}\n${order.customer.phone}\nRol: ${order.customer.role}')),
          const OtotrSectionTitle(title: 'Paket ve Ücret'),
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(order.packagePlan.name,
                    style: const TextStyle(fontWeight: FontWeight.w900)),
                Text('Tahmini süre: ${order.estimatedDurationMinutes} dk'),
                Text(order.packagePlan.listPrice),
                Text(order.packagePlan.dealerDiscount),
                Text(order.packagePlan.netCollection,
                    style: const TextStyle(
                        color: AppColors.success, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Seçili Modüller'),
          OtotrCard(
              child:
                  Text(order.modules.map((module) => module.name).join(', '))),
          OtotrPrimaryButton(
            label: 'İş Emri Oluştur',
            icon: Icons.check_circle_outline,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.workOrderDetail),
          ),
        ],
      ),
    );
  }
}
