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
import '../../data/dummy/dummy_data.dart';

class InspectionProgressScreen extends StatelessWidget {
  const InspectionProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = DummyData.workOrder;
    final totalItems = order.modules
        .fold<int>(0, (sum, module) => sum + module.checklistCount);
    final completedItems = order.modules
        .fold<int>(0, (sum, module) => sum + module.completedCount);
    final progress = completedItems / totalItems;

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Ekspertiz İlerlemesi'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('%${(progress * 100).round()} tamamlandı',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSizes.md),
                LinearProgressIndicator(
                    value: progress, minHeight: 10, color: AppColors.red),
                const SizedBox(height: AppSizes.md),
                Text('Tamamlanan checklist: $completedItems/$totalItems'),
                Text('Kritik bulgu: ${order.criticalFindingCount}'),
                Text('Eksik fotoğraf: ${order.missingRequiredPhotoCount}'),
              ],
            ),
          ),
          const OtotrAlertCard(
            title: 'Eksik kanıt uyarısı',
            message:
                'Sol yan, kilometre göstergesi ve VIN etiketi fotoğrafları tamamlanmadan rapor onayına geçilmemeli.',
          ),
          const OtotrSectionTitle(title: 'Aksiyonlar'),
          OtotrPrimaryButton(
            label: 'Modül Kontrollerine Devam Et',
            icon: Icons.fact_check_outlined,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.inspectionModules),
          ),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(
            label: 'Fotoğraf Kanıtına Git',
            icon: Icons.photo_camera_outlined,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.photoEvidence),
          ),
          const SizedBox(height: AppSizes.sm),
          OtotrSecondaryButton(
            label: 'Modülü Tamamlandı İşaretle',
            icon: Icons.done_outline,
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text(
                        'Modül tamamlandı placeholder. Sonradan Firebase sync.'))),
          ),
        ],
      ),
    );
  }
}
