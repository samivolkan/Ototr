import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_primary_button.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../core/widgets/ototr_status_badge.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/inspection_module_model.dart';

class ReportPreviewScreen extends StatelessWidget {
  const ReportPreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = DummyData.workOrder;
    final report = DummyData.report;
    return Scaffold(
      appBar: const OtotrAppBar(title: 'Rapor Önizleme'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(AppConstants.brandName,
                    style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        color: AppColors.navy)),
                const Text(AppConstants.brandPositioning),
                const SizedBox(height: AppSizes.md),
                Text(order.number,
                    style: Theme.of(context).textTheme.titleLarge),
                Text('${order.vehicle.plate} - ${order.vehicle.displayName}'),
                Text('${order.customer.fullName} | ${order.packagePlan.name}'),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Modül Sonuç Özeti'),
          OtotrCard(
            child: Column(
              children: order.modules
                  .map(
                    (module) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(module.name),
                      subtitle: Text(
                          'Checklist ${module.completedCount}/${module.checklistCount} | Kritik ${module.criticalCount}'),
                      trailing: OtotrStatusBadge(label: module.status.label),
                    ),
                  )
                  .toList(),
            ),
          ),
          OtotrAlertCard(title: 'Risk Özeti', message: report.riskSummary),
          OtotrCard(
            child: Text(
              'Fotoğraf kanıt özeti: ${order.photoEvidence.length - order.missingRequiredPhotoCount}/${order.photoEvidence.length}\n'
              'Teknisyen notu: ${report.technicianNote}\n'
              '${report.branchApprovalStatus}\n'
              '${report.qrVerificationPlaceholder}\n'
              '${report.revision}',
            ),
          ),
          const OtotrAlertCard(
            title: 'Yasal açıklama',
            message:
                'Bu rapor OTOTR standartlarına göre hazırlanmış ön değerlendirme raporudur.',
          ),
          OtotrPrimaryButton(
            label: 'PDF Dışa Aktar Placeholder',
            icon: Icons.picture_as_pdf_outlined,
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('PDF export sonradan eklenecek.'))),
          ),
        ],
      ),
    );
  }
}
