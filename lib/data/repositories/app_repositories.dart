import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/supabase_config.dart';
import '../models/customer_model.dart';
import '../models/package_plan_model.dart';
import '../models/report_template_model.dart';
import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';
import '../remote/supabase_final_report_data_source.dart';
import '../remote/supabase_report_template_data_source.dart';
import '../remote/supabase_work_order_data_source.dart';
import '../remote/supabase_work_order_report_data_source.dart';
import 'branch_work_order_repository.dart';
import 'final_report_repository.dart';
import 'remote_work_order_repository.dart';
import 'report_template_repository.dart';
import 'supabase_branch_work_order_repository.dart';
import 'supabase_final_report_repository.dart';
import 'supabase_report_template_repository.dart';
import 'supabase_work_order_report_repository.dart';
import 'supabase_work_order_repository.dart';
import 'work_order_report_repository.dart';
import 'work_order_repository.dart';

class AppRepositories {
  AppRepositories._();

  static final AppRepositories instance = AppRepositories._();

  WorkOrderRepository localWorkOrders = const _UnavailableWorkOrderRepository();
  RemoteWorkOrderRepository? remoteWorkOrders;
  ReportTemplateRepository reportTemplates =
      const _UnavailableReportTemplateRepository();
  WorkOrderReportRepository workOrderReports =
      const _UnavailableWorkOrderReportRepository();
  FinalReportRepository finalReports =
      const _UnavailableFinalReportRepository();
  BranchWorkOrderRepository branchWorkOrders =
      const _UnavailableBranchWorkOrderRepository();
  String? liveConnectionError;
  final Map<String, Set<String>> _optimisticCompletedTaskIds = {};

  bool get hasRemoteWorkOrders => remoteWorkOrders != null;

  bool get hasLocalTestWorkOrders =>
      localWorkOrders is! _UnavailableWorkOrderRepository;

  void markOptimisticTaskCompleted(String workOrderId, String taskId) {
    final taskIds =
        _optimisticCompletedTaskIds.putIfAbsent(workOrderId, () => <String>{});
    taskIds.add(taskId);
  }

  bool isOptimisticTaskCompleted(String workOrderId, String taskId) {
    return _optimisticCompletedTaskIds[workOrderId]?.contains(taskId) ?? false;
  }

  void clearOptimisticTaskCompleted(String workOrderId, String taskId) {
    final taskIds = _optimisticCompletedTaskIds[workOrderId];
    if (taskIds == null) {
      return;
    }
    taskIds.remove(taskId);
    if (taskIds.isEmpty) {
      _optimisticCompletedTaskIds.remove(workOrderId);
    }
  }

  Future<void> configureSupabase({
    SupabaseConfig config = SupabaseConfig.fromEnvironment,
  }) async {
    if (!config.isConfigured) {
      _disableLiveRepositories(
        'Supabase konfigurasyonu eksik. Canli veri baglantisi olmadan demo veri gosterilmez.',
      );
      return;
    }

    try {
      await Supabase.initialize(
        url: config.url,
        anonKey: config.anonKey,
      );

      if (config.hasTestLogin) {
        await Supabase.instance.client.auth.signInWithPassword(
          email: config.testEmail,
          password: config.testPassword,
        );
      }

      final currentUser = await _loadCurrentUser(Supabase.instance.client);
      if (currentUser == null) {
        throw StateError('Oturum icin aktif app_users kaydi bulunamadi.');
      }

      remoteWorkOrders = SupabaseWorkOrderRepository(
        dataSource: SupabaseWorkOrderDataSource(Supabase.instance.client),
        currentUser: currentUser,
        currentTechnicianRole: _technicianRoleFromUser(currentUser),
      );
      reportTemplates = SupabaseReportTemplateRepository(
        SupabaseReportTemplateDataSource(Supabase.instance.client),
      );
      workOrderReports = SupabaseWorkOrderReportRepository(
        SupabaseWorkOrderReportDataSource(Supabase.instance.client),
      );
      finalReports = SupabaseFinalReportRepository(
        SupabaseFinalReportDataSource(Supabase.instance.client),
      );
      branchWorkOrders =
          SupabaseBranchWorkOrderRepository(Supabase.instance.client);
      liveConnectionError = null;
    } catch (error) {
      _disableLiveRepositories(
        'Supabase canli veri baglantisi kurulamadigi icin demo veri gosterilmedi: $error',
      );
    }
  }

  void _disableLiveRepositories(String reason) {
    liveConnectionError = reason;
    localWorkOrders = const _UnavailableWorkOrderRepository();
    remoteWorkOrders = null;
    reportTemplates = const _UnavailableReportTemplateRepository();
    workOrderReports = const _UnavailableWorkOrderReportRepository();
    finalReports = const _UnavailableFinalReportRepository();
    branchWorkOrders = const _UnavailableBranchWorkOrderRepository();
  }

  Future<UserProfile?> _loadCurrentUser(SupabaseClient client) async {
    final authUserId = client.auth.currentUser?.id;
    if (authUserId == null || authUserId.isEmpty) {
      return null;
    }

    final row = await client
        .from('app_users')
        .select('id, branch_id, full_name, email, phone, role, is_active')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle();

    if (row == null) {
      return null;
    }

    return UserProfile(
      id: row['id']?.toString() ?? '',
      fullName: row['full_name']?.toString() ?? '',
      email: row['email']?.toString() ?? '',
      phone: row['phone']?.toString() ?? '',
      role: _userRoleFromRemote(row['role']?.toString() ?? ''),
      branchId: row['branch_id']?.toString() ?? '',
      isActive: row['is_active'] == true,
    );
  }

  UserRole _userRoleFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'BRANCH_MANAGER':
        return UserRole.branchManager;
      case 'QUALITY_AUDITOR':
      case 'CEO':
      case 'GENERAL_MANAGER':
      case 'REGIONAL_MANAGER':
        return UserRole.headquartersAuditor;
      case 'RECEPTION_STAFF':
        return UserRole.receptionStaff;
      case 'INSPECTION_TECHNICIAN':
      default:
        return UserRole.inspectionTechnician;
    }
  }

  TechnicianRole _technicianRoleFromUser(UserProfile user) {
    switch (user.role) {
      case UserRole.branchManager:
      case UserRole.headquartersAuditor:
        return TechnicianRole.branchManager;
      case UserRole.receptionStaff:
      case UserRole.inspectionTechnician:
        return TechnicianRole.bodyPaint;
    }
  }
}

const _liveRequiredMessage =
    'Canli Supabase baglantisi gerekli. Mock/local veri kullanimi kapali.';

class _UnavailableWorkOrderRepository implements WorkOrderRepository {
  const _UnavailableWorkOrderRepository();

  Never _fail() => throw StateError(_liveRequiredMessage);

  @override
  UserProfile get currentUser => _fail();

  @override
  TechnicianRole get currentTechnicianRole => _fail();

  @override
  List<UserProfile> activeTechnicians() => _fail();

  @override
  TechnicianWorkOrder claim(String workOrderId) => _fail();

  @override
  TechnicianWorkOrder claimTask(String workOrderId, String taskId) => _fail();

  @override
  TechnicianWorkOrder getById(String workOrderId) => _fail();

  @override
  TechnicianWorkOrder managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) =>
      _fail();

  @override
  TechnicianWorkOrder managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) =>
      _fail();

  @override
  TechnicianWorkOrder releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) =>
      _fail();

  @override
  void reset() {}

  @override
  TechnicianWorkOrder saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  ) =>
      _fail();

  @override
  TechnicianWorkOrder saveFinalMediaAsset(
    String workOrderId,
    EvidenceAsset asset,
  ) =>
      _fail();

  @override
  TechnicianWorkOrder submitTask(String workOrderId, String taskId) => _fail();

  @override
  List<OfflineSyncQueue> syncQueue() => _fail();

  @override
  TechnicianWorkOrder updateTask(String workOrderId, TechnicianTask task) =>
      _fail();

  @override
  List<TechnicianWorkOrder> visibleWorkOrders() => _fail();
}

class _UnavailableBranchWorkOrderRepository extends BranchWorkOrderRepository {
  const _UnavailableBranchWorkOrderRepository();

  Never _fail() => throw StateError(_liveRequiredMessage);

  @override
  bool get isRemote => false;

  @override
  String get sourceLabel => 'Canli veri yok';

  @override
  Future<WorkOrder> create({
    required Customer customer,
    required Vehicle vehicle,
    required PackageType packageType,
    required String notes,
  }) async =>
      _fail();

  @override
  Future<List<WorkOrder>> getAll() async => _fail();

  @override
  Future<WorkOrder?> getById(String id) async => _fail();

  @override
  Future<WorkOrder> updateTaskStatus(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  ) async =>
      _fail();
}

class _UnavailableReportTemplateRepository implements ReportTemplateRepository {
  const _UnavailableReportTemplateRepository();

  Never _fail() => throw StateError(_liveRequiredMessage);

  @override
  Future<ReportTemplate> getActiveTemplate() async => _fail();

  @override
  Future<ReportTemplateItem> getItemDetail(String itemId) async => _fail();

  @override
  Future<List<ReportTemplateGroup>> getTemplateGroups(
    String templateId,
  ) async =>
      _fail();

  @override
  Future<List<ReportTemplateItem>> getTemplateItems(String groupId) async =>
      _fail();
}

class _UnavailableWorkOrderReportRepository
    implements WorkOrderReportRepository {
  const _UnavailableWorkOrderReportRepository();

  Never _fail() => throw StateError(_liveRequiredMessage);

  @override
  Future<List<WorkOrderReportAnswer>> getAnswers(String workOrderId) async =>
      _fail();

  @override
  Future<WorkOrderReportAnswer?> getItemAnswer(
    String workOrderId,
    String itemId,
  ) async =>
      _fail();

  @override
  Future<void> lockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async =>
      _fail();

  @override
  Future<WorkOrderReportAnswer> saveAnswer(
    WorkOrderReportAnswer answer,
  ) async =>
      _fail();

  @override
  Future<void> unlockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async =>
      _fail();
}

class _UnavailableFinalReportRepository implements FinalReportRepository {
  const _UnavailableFinalReportRepository();

  Never _fail() => throw StateError(_liveRequiredMessage);

  @override
  Future<FinalReportRecord?> getLatest(String workOrderId) async => _fail();

  @override
  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft) async =>
      _fail();

  @override
  Future<FinalReportRecord> saveDraft(FinalReportDraft draft) async => _fail();
}
