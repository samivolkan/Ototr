import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/navigation/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_alert_card.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../core/widgets/ototr_metric_card.dart';
import '../../core/widgets/ototr_section_title.dart';
import '../../data/dummy/dummy_data.dart';
import '../../data/models/user_profile_model.dart';

class BranchDashboardScreen extends StatelessWidget {
  const BranchDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final branch = DummyData.branch;
    final user = DummyData.user;
    final quickActions = [
      ('Yeni İş Emri', Icons.add_circle_outline, AppRoutes.newWorkOrder),
      ('İş Emirleri', Icons.assignment_outlined, AppRoutes.workOrders),
      ('Raporlar', Icons.description_outlined, AppRoutes.reportPreview),
      ('Şube Performansı', Icons.insights_outlined, AppRoutes.branchKpi),
      ('Şube Ayarları', Icons.settings_outlined, AppRoutes.branchSettings),
    ];

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Şube Paneli'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(branch.name, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSizes.xs),
                Text('${user.fullName} - ${user.role.label}'),
                const SizedBox(height: AppSizes.xs),
                const Text('${AppConstants.syncPending} | ${AppConstants.firebaseLater}'),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Bugünkü Operasyon'),
          const Row(
            children: [
              Expanded(child: OtotrMetricCard(label: 'Toplam İş', value: '12', icon: Icons.directions_car)),
              SizedBox(width: AppSizes.md),
              Expanded(child: OtotrMetricCard(label: 'Teslim', value: '7', icon: Icons.verified_outlined, tone: AppColors.success)),
            ],
          ),
          const Row(
            children: [
              Expanded(child: OtotrMetricCard(label: 'Eksik Foto', value: '3', icon: Icons.photo_camera_outlined, tone: AppColors.warning)),
              SizedBox(width: AppSizes.md),
              Expanded(child: OtotrMetricCard(label: 'Kritik', value: '2', icon: Icons.report_outlined, tone: AppColors.red)),
            ],
          ),
          const OtotrAlertCard(
            title: 'Kritik operasyon uyarısı',
            message: 'OTO-2026-0001 için zorunlu fotoğraf kanıtları eksik. Rapor onayına geçmeden tamamlanmalı.',
          ),
          const OtotrSectionTitle(title: 'Hızlı Aksiyonlar'),
          ...quickActions.map(
            (action) => OtotrCard(
              onTap: () => Navigator.pushNamed(context, action.$3),
              child: Row(
                children: [
                  Icon(action.$2, color: AppColors.red),
                  const SizedBox(width: AppSizes.md),
                  Expanded(child: Text(action.$1, style: const TextStyle(fontWeight: FontWeight.w800))),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
