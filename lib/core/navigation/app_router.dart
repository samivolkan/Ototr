import 'package:flutter/material.dart';

import '../../features/auth/login_screen.dart';
import '../../features/branch/branch_kpi_screen.dart';
import '../../features/branch/branch_settings_screen.dart';
import '../../features/customer/customer_info_screen.dart';
import '../../features/dashboard/branch_dashboard_screen.dart';
import '../../features/inspection/inspection_module_detail_screen.dart';
import '../../features/inspection/inspection_modules_screen.dart';
import '../../features/inspection/inspection_progress_screen.dart';
import '../../features/packages/package_selection_screen.dart';
import '../../features/photo_evidence/photo_evidence_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/reports/report_preview_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/vehicle_intake/vehicle_intake_screen.dart';
import '../../features/work_orders/new_work_order_screen.dart';
import '../../features/work_orders/work_order_detail_screen.dart';
import '../../features/work_orders/work_order_summary_screen.dart';
import '../../features/work_orders/work_orders_list_screen.dart';
import 'app_routes.dart';

class AppRouter {
  const AppRouter._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final Widget screen = switch (settings.name) {
      AppRoutes.splash => const SplashScreen(),
      AppRoutes.login => const LoginScreen(),
      AppRoutes.dashboard => const BranchDashboardScreen(),
      AppRoutes.workOrders => const WorkOrdersListScreen(),
      AppRoutes.newWorkOrder => const NewWorkOrderScreen(),
      AppRoutes.vehicleIntake => const VehicleIntakeScreen(),
      AppRoutes.customerInfo => const CustomerInfoScreen(),
      AppRoutes.packageSelection => const PackageSelectionScreen(),
      AppRoutes.workOrderSummary => const WorkOrderSummaryScreen(),
      AppRoutes.workOrderDetail => const WorkOrderDetailScreen(),
      AppRoutes.inspectionModules => const InspectionModulesScreen(),
      AppRoutes.inspectionProgress => const InspectionProgressScreen(),
      AppRoutes.inspectionModuleDetail =>
        InspectionModuleDetailScreen(moduleId: settings.arguments as String?),
      AppRoutes.photoEvidence => const PhotoEvidenceScreen(),
      AppRoutes.reportPreview => const ReportPreviewScreen(),
      AppRoutes.branchSettings => const BranchSettingsScreen(),
      AppRoutes.branchKpi => const BranchKpiScreen(),
      AppRoutes.profile => const ProfileScreen(),
      _ => const BranchDashboardScreen(),
    };

    return MaterialPageRoute<void>(
      builder: (_) => screen,
      settings: settings,
    );
  }
}
