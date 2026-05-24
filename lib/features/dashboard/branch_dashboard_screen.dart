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
import '../../data/repositories/work_order_local_repository.dart';

class BranchDashboardScreen extends StatelessWidget {
  const BranchDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const branch = DummyData.branch;
    const user = DummyData.user;
    final workOrderSummary = WorkOrderLocalRepository.instance.summary();
    final quickActions = [
      ('Yeni Is Emri', Icons.add_circle_outline, AppRoutes.newWorkOrder),
      ('Is Emirleri', Icons.assignment_outlined, AppRoutes.workOrders),
      ('Raporlar', Icons.description_outlined, AppRoutes.reportPreview),
      (
        'Baslik Sahipligi',
        Icons.manage_accounts,
        AppRoutes.managerTaskOwnership
      ),
      ('Sube Performansi', Icons.insights_outlined, AppRoutes.branchKpi),
      ('Sube Ayarlari', Icons.settings_outlined, AppRoutes.branchSettings),
    ];

    return Scaffold(
      appBar: const OtotrAppBar(title: 'Sube Paneli'),
      body: ListView(
        padding: const EdgeInsets.all(AppSizes.lg),
        children: [
          OtotrCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(branch.name,
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSizes.xs),
                Text('${user.fullName} - ${user.role.label}'),
                const SizedBox(height: AppSizes.xs),
                const Text(
                  '${AppConstants.syncPending} | ${AppConstants.firebaseLater}',
                ),
              ],
            ),
          ),
          const OtotrSectionTitle(title: 'Bugunku Operasyon'),
          Row(
            children: [
              Expanded(
                child: OtotrMetricCard(
                  label: 'Toplam Is',
                  value: workOrderSummary.total.toString(),
                  icon: Icons.directions_car,
                ),
              ),
              const SizedBox(width: AppSizes.md),
              Expanded(
                child: OtotrMetricCard(
                  label: 'Aktif',
                  value: workOrderSummary.active.toString(),
                  icon: Icons.pending_actions_outlined,
                  tone: AppColors.info,
                ),
              ),
            ],
          ),
          Row(
            children: [
              Expanded(
                child: OtotrMetricCard(
                  label: 'Eksik Veri',
                  value: workOrderSummary.missingData.toString(),
                  icon: Icons.warning_amber_outlined,
                  tone: AppColors.warning,
                ),
              ),
              const SizedBox(width: AppSizes.md),
              Expanded(
                child: OtotrMetricCard(
                  label: 'Tamam Gorev',
                  value: workOrderSummary.completedTasks.toString(),
                  icon: Icons.task_alt,
                  tone: AppColors.success,
                ),
              ),
            ],
          ),
          const OtotrAlertCard(
            title: 'Kritik operasyon uyarisi',
            message:
                'OTO-2026-0001 icin zorunlu fotograf kanitlari eksik. Rapor onayina gecmeden tamamlanmali.',
          ),
          const OtotrSectionTitle(title: 'Hizli Aksiyonlar'),
          ...quickActions.map(
            (action) => OtotrCard(
              onTap: () => Navigator.pushNamed(context, action.$3),
              child: Row(
                children: [
                  Icon(action.$2, color: AppColors.red),
                  const SizedBox(width: AppSizes.md),
                  Expanded(
                    child: Text(
                      action.$1,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
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
