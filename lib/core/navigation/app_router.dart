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
import '../../features/reports/final_report_preview_screen.dart';
import '../../features/reports/report_preview_screen.dart';
import '../../features/technician/report_entry/report_entry_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/technician/start_evidence_screen.dart';
import '../../features/technician/technician_evidence_screen.dart';
import '../../features/technician/technician_jobs_screen.dart';
import '../../features/technician/technician_queries_screen.dart';
import '../../features/technician/technician_report_gate_screen.dart';
import '../../features/technician/technician_task_form_screen.dart';
import '../../features/technician/technician_tasks_screen.dart';
import '../../features/vehicle_intake/vehicle_intake_screen.dart';
import '../../features/work_orders/new_work_order_screen.dart';
import '../../features/work_orders/work_order_detail_screen.dart';
import '../../features/work_orders/work_order_summary_screen.dart';
import '../../features/work_orders/work_orders_list_screen.dart';
import '../../data/repositories/app_repositories.dart';
import 'app_routes.dart';

class AppRouter {
  const AppRouter._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final Widget screen = switch (settings.name) {
      AppRoutes.splash => const SplashScreen(),
      AppRoutes.login => const LoginScreen(),
      AppRoutes.dashboard => const TechnicianJobsScreen(),
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
      AppRoutes.finalReportPreview => FinalReportPreviewScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.branchSettings => const BranchSettingsScreen(),
      AppRoutes.branchKpi => const BranchKpiScreen(),
      AppRoutes.profile => const ProfileScreen(),
      AppRoutes.technicianJobs => const TechnicianJobsScreen(),
      AppRoutes.technicianStartEvidence => StartEvidenceScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.technicianTasks => TechnicianTasksScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.technicianReportEntry => ReportEntryScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.technicianTaskForm => _guardedTaskForm(settings),
      AppRoutes.technicianEvidence => TechnicianEvidenceScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.technicianQueries => TechnicianQueriesScreen(
          workOrderId: settings.arguments as String,
        ),
      AppRoutes.technicianReportGate => TechnicianReportGateScreen(
          workOrderId: settings.arguments as String,
        ),
      _ => const BranchDashboardScreen(),
    };

    return MaterialPageRoute<void>(
      builder: (_) => screen,
      settings: settings,
    );
  }

  static Widget _guardedTaskForm(RouteSettings settings) {
    final args = settings.arguments as Map<String, String>;
    final workOrderId = args['workOrderId']!;
    final taskId = args['taskId']!;
    if (AppRepositories.instance.hasRemoteWorkOrders) {
      return TechnicianTaskFormScreen(workOrderId: workOrderId, taskId: taskId);
    }
    return TechnicianTasksScreen(workOrderId: workOrderId);
  }
}
