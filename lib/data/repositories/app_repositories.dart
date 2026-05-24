import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/supabase_config.dart';
import '../models/user_profile_model.dart';
import '../remote/supabase_work_order_data_source.dart';
import 'dummy_work_order_repository.dart';
import 'remote_work_order_repository.dart';
import 'supabase_work_order_repository.dart';
import 'work_order_repository.dart';

class AppRepositories {
  AppRepositories._();

  static final AppRepositories instance = AppRepositories._();

  WorkOrderRepository localWorkOrders = DummyWorkOrderRepository.instance;
  RemoteWorkOrderRepository? remoteWorkOrders;

  bool get hasRemoteWorkOrders => remoteWorkOrders != null;

  Future<void> configureSupabase({
    SupabaseConfig config = SupabaseConfig.fromEnvironment,
  }) async {
    if (!config.isConfigured) {
      remoteWorkOrders = null;
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

      final local = DummyWorkOrderRepository.instance;
      final currentUser =
          await _loadCurrentUser(Supabase.instance.client) ?? local.currentUser;
      remoteWorkOrders = SupabaseWorkOrderRepository(
        dataSource: SupabaseWorkOrderDataSource(Supabase.instance.client),
        currentUser: currentUser,
        currentTechnicianRole: local.currentTechnicianRole,
      );
    } catch (_) {
      // Supabase RLS veya bağlantı hatası mobil uygulamanın açılışını
      // engellememeli. Canlı bağlantı düzelene kadar demo veriyle devam edilir.
      remoteWorkOrders = null;
    }
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
}
