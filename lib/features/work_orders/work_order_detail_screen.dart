import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_secondary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/work_order_model.dart';

class WorkOrderDetailScreen extends StatelessWidget {
  const WorkOrderDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = DummyData.workOrder;
    final timeline = ['Taslak', 'Araç Kabul Edildi', 'Ekspertiz Başladı', 'Modüller Tamamlandı', 'Rapor Hazırlandı', 'Müşteriye Teslim Edildi'];
    return Scaffold(
      appBar: const OtotrAppBar(title: 'İş Emri Detayı'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(order.number, style: Theme.of(context).textTheme.titleLarge)),
                    OtotrStatusBadge(label: order.status.label, tone: OtotrBadgeTone.info),
                  ],
                ),
                Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
                Text('${order.customer.fullName} | ${order.customer.phone}'),
                Text('Teknisyen: ${order.assignedTechnician}'),
                Text('Paket: ${order.packagePlan.name}'),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Durum Zaman Çizelgesi'),
          OtotrCard(
            child: Column(
              children: timeline
                  .map(
                    (step) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(step == 'Ekspertiz Başladı' ? Icons.radio_button_checked : Icons.check_circle, color: step == 'Ekspertiz Başladı' ? AppColors.red : AppColors.success),
                      title: Text(step),
                    ),
                  )
                  .toList(),
            ),
          ),
          OtotrAlertCard(
            title: 'Operasyon Notu',
            message: '${order.criticalFindingCount} kritik bulgu, ${order.missingRequiredPhotoCount} eksik zorunlu fotoğraf var.',
          ),
          OtotrCard(child: Text('Modül ilerleme: ${order.completedModules}/${order.modules.length}\nFotoğraf durumu: ${order.photoEvidence.length - order.missingRequiredPhotoCount}/${order.photoEvidence.length}\nNot: ${order.notes}')),
          OtotrPrimaryButton(label: 'Ekspertizi Başlat', icon: Icons.play_arrow, onPressed: () => Navigator.pushNamed(context, AppRoutes.inspectionProgress)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Modülleri Gör', icon: Icons.fact_check_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.inspectionModules)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Fotoğraf Kanıtları', icon: Icons.photo_library_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.photoEvidence)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'Rapor Önizle', icon: Icons.description_outlined, onPressed: () => Navigator.pushNamed(context, AppRoutes.reportPreview)),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(label: 'İşi Tamamla', icon: Icons.done_all, onPressed: () {}),
        ],
      ),
    );
  }
}
