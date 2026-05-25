import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import 'work_order_remote_data_source.dart';
import 'work_order_remote_dto.dart';

class SupabaseWorkOrderDataSource implements WorkOrderRemoteDataSource {
  const SupabaseWorkOrderDataSource(this._client);

  final SupabaseClient _client;

  @override
  Future<List<UserProfile>> fetchActiveTechnicians() async {
    final rows = await _client.rpc('list_branch_technicians');
    return [
      for (final row in _asRowList(rows)) _userProfileFromRow(row),
    ];
  }

  @override
  Future<List<WorkOrderRemoteBundle>> fetchVisibleWorkOrders() async {
    final rows = await _client
        .from('expertise_cases')
        .select('id')
        .order('opened_at', ascending: false);

    return [
      for (final row in _asRowList(rows))
        await fetchWorkOrderById(row['id'].toString()),
    ];
  }

  @override
  Future<WorkOrderRemoteBundle> fetchWorkOrderById(String workOrderId) async {
    final caseRow = await _fetchCase(workOrderId);

    final results = await Future.wait<Object?>([
      _fetchStartEvidence(workOrderId),
      _fetchTasks(workOrderId),
      _fetchItemValues(workOrderId),
      _fetchEvidenceAssets(workOrderId),
      _fetchExternalQueries(workOrderId),
    ]);

    return WorkOrderRemoteBundle(
      caseRow: caseRow,
      startEvidence: results[0] as StartEvidenceRow?,
      tasks: results[1] as List<InspectionTaskRow>,
      itemValues: results[2] as List<InspectionItemValueRow>,
      evidenceAssets: results[3] as List<EvidenceAssetRow>,
      externalQueries: results[4] as List<ExternalQueryRow>,
    );
  }

  @override
  Future<WorkOrderRemoteBundle> claimWorkOrder(String workOrderId) async {
    await _client
        .from('expertise_cases')
        .update({'status': 'CLAIMED'}).eq('id', workOrderId);
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> claimTask(
    String workOrderId,
    String taskId,
  ) async {
    await _client.rpc('claim_inspection_task', params: {
      'target_task_id': taskId,
    });
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    await _client.rpc('release_inspection_task', params: {
      'target_task_id': taskId,
      'release_reason': releaseReason,
    });
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) async {
    await _client.rpc('manager_assign_inspection_task', params: {
      'target_task_id': taskId,
      'next_owner_user_id': ownerUserId,
      'manager_assign_reason': managerAssignReason,
    });
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    await _client.rpc('manager_clear_inspection_task_owner', params: {
      'target_task_id': taskId,
      'release_reason': releaseReason,
    });
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> upsertStartEvidence(
    String workOrderId,
    Map<String, Object?> payload,
  ) async {
    await _client.from('technician_start_evidence').upsert({
      ...payload,
      'expertise_case_id': workOrderId,
    }, onConflict: 'expertise_case_id');

    final complete = _isStartEvidenceComplete(payload);
    await _client.from('expertise_cases').update({
      'status': complete ? 'TECHNICAL_ENTRY_OPEN' : 'START_EVIDENCE_REQUIRED',
      if (complete) 'inspection_started_at': DateTime.now().toIso8601String(),
    }).eq('id', workOrderId);

    if (complete) {
      await _client
          .from('inspection_tasks')
          .update({'status': 'AVAILABLE'})
          .eq('expertise_case_id', workOrderId)
          .isFilter('owner_user_id', null)
          .inFilter('status', ['LOCKED', 'ASSIGNED']);
    }

    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> updateTask(
    String workOrderId,
    String taskId,
    Map<String, Object?> payload,
  ) async {
    final taskPayload = Map<String, Object?>.from(payload)
      ..remove('__item_values')
      ..remove('id')
      ..remove('expertise_case_id')
      ..remove('task_key');
    final itemValuePayloads = _asPayloadList(payload['__item_values']);

    if (taskPayload.isNotEmpty) {
      await _client.from('inspection_tasks').update(taskPayload).eq(
            'id',
            taskId,
          );
    }

    if (itemValuePayloads.isNotEmpty) {
      await _client.from('inspection_item_values').upsert(
        [
          for (final item in itemValuePayloads)
            {
              ...item,
              'expertise_case_id': workOrderId,
              'task_id': taskId,
            },
        ],
        onConflict: 'expertise_case_id,task_id,item_key',
      );
    }

    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<WorkOrderRemoteBundle> submitTask(
    String workOrderId,
    String taskId,
  ) async {
    await _client.rpc('submit_inspection_task', params: {
      'target_task_id': taskId,
    });
    return fetchWorkOrderById(workOrderId);
  }

  @override
  Future<List<OfflineSyncQueue>> fetchSyncQueue() async {
    return const [];
  }

  Future<ExpertiseCaseRow> _fetchCase(String workOrderId) async {
    final row = await _client.from('expertise_cases').select('''
          id,
          work_order_no,
          report_no,
          status,
          assigned_technician_id,
          manager_approved_at,
          secretary_gate_ready,
          payment_gate_ready,
          kvkk_gate_ready,
          vehicles (
            plate,
            brand,
            model,
            model_year,
            fuel_type,
            transmission
          ),
          package_plans (
            name
          ),
          customers (
            kvkk_consent,
            service_consent
          )
        ''').eq('id', workOrderId).single();

    return ExpertiseCaseRow.fromJson(_normalizeCaseRow(_asRow(row)));
  }

  Future<StartEvidenceRow?> _fetchStartEvidence(String workOrderId) async {
    final rows = await _client
        .from('technician_start_evidence')
        .select()
        .eq('expertise_case_id', workOrderId)
        .limit(1);

    final list = _asRowList(rows);
    if (list.isEmpty) {
      return null;
    }

    return StartEvidenceRow.fromJson(list.first);
  }

  Future<List<InspectionTaskRow>> _fetchTasks(String workOrderId) async {
    final rows = await _client
        .from('inspection_tasks')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('created_at');

    return [
      for (final row in _asRowList(rows)) InspectionTaskRow.fromJson(row),
    ];
  }

  Future<List<InspectionItemValueRow>> _fetchItemValues(
    String workOrderId,
  ) async {
    final rows = await _client
        .from('inspection_item_values')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('created_at');

    return [
      for (final row in _asRowList(rows)) InspectionItemValueRow.fromJson(row),
    ];
  }

  Future<List<EvidenceAssetRow>> _fetchEvidenceAssets(
      String workOrderId) async {
    final rows = await _client
        .from('inspection_evidence_assets')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('created_at');

    return [
      for (final row in _asRowList(rows)) EvidenceAssetRow.fromJson(row),
    ];
  }

  Future<List<ExternalQueryRow>> _fetchExternalQueries(
    String workOrderId,
  ) async {
    final rows = await _client
        .from('external_query_results')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('created_at');

    return [
      for (final row in _asRowList(rows)) ExternalQueryRow.fromJson(row),
    ];
  }

  Map<String, Object?> _normalizeCaseRow(Map<String, Object?> row) {
    final vehicle = _nestedRow(row['vehicles']);
    final packagePlan = _nestedRow(row['package_plans']);
    final customer = _nestedRow(row['customers']);

    final brand = vehicle['brand']?.toString() ?? '';
    final model = vehicle['model']?.toString() ?? '';
    final modelYear = vehicle['model_year']?.toString() ?? '';

    return {
      ...row,
      'plate': vehicle['plate']?.toString() ?? '',
      'vehicle_summary': [
        if (modelYear.isNotEmpty) modelYear,
        if (brand.isNotEmpty) brand,
        if (model.isNotEmpty) model,
      ].join(' '),
      'package_name': packagePlan['name']?.toString() ?? '',
      'manager_approved': row['manager_approved_at'] != null,
      'secretary_gate_ready': row['secretary_gate_ready'] == true,
      'payment_gate_ready': row['payment_gate_ready'] == true,
      'kvkk_gate_ready': row['kvkk_gate_ready'] == true ||
          (customer['kvkk_consent'] == true &&
              customer['service_consent'] == true),
    };
  }

  UserProfile _userProfileFromRow(Map<String, Object?> row) {
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

  Map<String, Object?> _nestedRow(Object? value) {
    if (value is Map) {
      return value.cast<String, Object?>();
    }
    return const {};
  }

  bool _isStartEvidenceComplete(Map<String, Object?> payload) {
    final vin = payload['vin']?.toString().trim() ?? '';
    final vinPhoto = payload['vin_photo_url']?.toString() ?? '';
    final platePhoto = payload['plate_photo_url']?.toString() ?? '';
    final odometerPhoto = payload['odometer_photo_url']?.toString() ?? '';
    final odometerKm = payload['odometer_km'];
    final odometerValue = odometerKm is int
        ? odometerKm
        : int.tryParse(odometerKm?.toString() ?? '') ?? 0;

    return vin.length == 17 &&
        vinPhoto.isNotEmpty &&
        platePhoto.isNotEmpty &&
        odometerValue > 0 &&
        odometerPhoto.isNotEmpty;
  }

  Map<String, Object?> _asRow(Object? value) {
    if (value is Map) {
      return value.cast<String, Object?>();
    }
    throw StateError('Supabase row map bekleniyordu.');
  }

  List<Map<String, Object?>> _asRowList(Object? value) {
    if (value is List) {
      return [
        for (final item in value)
          if (item is Map) item.cast<String, Object?>(),
      ];
    }
    return const [];
  }

  List<Map<String, Object?>> _asPayloadList(Object? value) {
    if (value is List) {
      return [
        for (final item in value)
          if (item is Map) item.cast<String, Object?>(),
      ];
    }
    return const [];
  }
}
