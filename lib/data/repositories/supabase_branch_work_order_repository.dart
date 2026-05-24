import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/audit_log_model.dart';
import '../models/customer_model.dart';
import '../models/package_plan_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';
import 'branch_work_order_repository.dart';

class SupabaseBranchWorkOrderRepository extends BranchWorkOrderRepository {
  const SupabaseBranchWorkOrderRepository(this._client);

  final SupabaseClient _client;

  @override
  bool get isRemote => true;

  @override
  String get sourceLabel => 'Supabase canli';

  @override
  Future<List<WorkOrder>> getAll() async {
    final rows = await _client
        .from('expertise_cases')
        .select('id')
        .order('opened_at', ascending: false);

    return [
      for (final row in _asRowList(rows))
        await _fetchWorkOrder(row['id'].toString()),
    ];
  }

  @override
  Future<WorkOrder?> getById(String id) async {
    try {
      return await _fetchWorkOrder(id);
    } on PostgrestException catch (error) {
      if (error.code == 'PGRST116') {
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<WorkOrder> create({
    required Customer customer,
    required Vehicle vehicle,
    required PackageType packageType,
    required String notes,
  }) async {
    final createdId = await _client.rpc(
      'create_branch_work_order',
      params: {
        'customer_full_name': customer.fullName,
        'customer_phone': customer.phone,
        'customer_email': customer.email,
        'customer_identity_number': customer.identityNumber,
        'customer_role': customer.role,
        'vehicle_plate': vehicle.plate,
        'vehicle_vin': vehicle.vin,
        'vehicle_brand': vehicle.brand,
        'vehicle_model': vehicle.model,
        'vehicle_year': vehicle.year,
        'vehicle_fuel_type': vehicle.fuelType,
        'vehicle_transmission': vehicle.transmission,
        'vehicle_kilometers': vehicle.kilometers,
        'vehicle_seller_type': vehicle.sellerType,
        'vehicle_arrival_note': vehicle.arrivalNote,
        'package_type': packageType.code,
        'work_order_notes': notes,
      },
    );

    return _fetchWorkOrder(createdId.toString());
  }

  @override
  Future<WorkOrder> updateTaskStatus(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  ) async {
    final updatedId = await _client.rpc(
      'update_branch_work_order_task_status',
      params: {
        'target_task_id': taskId,
        'next_status': status.code,
      },
    );
    return _fetchWorkOrder(updatedId?.toString() ?? workOrderId);
  }

  Future<WorkOrder> _fetchWorkOrder(String id) async {
    final row = _asRow(await _client.from('expertise_cases').select('''
          id,
          work_order_no,
          status,
          opened_at,
          customer_summary,
          manager_approved_at,
          secretary_gate_ready,
          payment_gate_ready,
          kvkk_gate_ready,
          package_plans (
            code,
            name,
            duration_minutes,
            included_modules
          ),
          customers (
            full_name,
            phone,
            email,
            identity_number,
            customer_role,
            kvkk_consent,
            service_consent
          ),
          vehicles (
            plate,
            vin,
            brand,
            model,
            model_year,
            fuel_type,
            transmission,
            mileage_km,
            seller_type,
            arrival_note
          )
        ''').eq('id', id).single());

    final tasks = await _fetchTasks(id);
    return _workOrderFromRow(row, tasks);
  }

  Future<List<WorkOrderTask>> _fetchTasks(String workOrderId) async {
    final rows = await _client
        .from('inspection_tasks')
        .select('id, task_key, title, status, created_at, updated_at')
        .eq('expertise_case_id', workOrderId)
        .order('created_at');

    return [
      for (final row in _asRowList(rows)) _taskFromRow(row),
    ];
  }

  WorkOrder _workOrderFromRow(
    Map<String, Object?> row,
    List<WorkOrderTask> tasks,
  ) {
    final packageRow = _nestedRow(row['package_plans']);
    final customerRow = _nestedRow(row['customers']);
    final vehicleRow = _nestedRow(row['vehicles']);
    final packageType =
        packageTypeFromCode(packageRow['code']?.toString() ?? '');
    final openedAt =
        DateTime.tryParse(row['opened_at']?.toString() ?? '') ?? DateTime.now();

    return WorkOrder(
      id: row['id']?.toString() ?? '',
      number: row['work_order_no']?.toString() ?? '',
      status:
          _workOrderStatusFromRemote(row['status']?.toString() ?? '', tasks),
      vehicle: Vehicle(
        plate: vehicleRow['plate']?.toString() ?? '',
        vin: vehicleRow['vin']?.toString() ?? '',
        brand: vehicleRow['brand']?.toString() ?? '',
        model: vehicleRow['model']?.toString() ?? '',
        year: _readInt(vehicleRow['model_year']),
        fuelType: vehicleRow['fuel_type']?.toString() ?? '',
        transmission: vehicleRow['transmission']?.toString() ?? '',
        kilometers: _readInt(vehicleRow['mileage_km']),
        sellerType: vehicleRow['seller_type']?.toString() ?? '',
        arrivalNote: vehicleRow['arrival_note']?.toString() ?? '',
      ),
      customer: Customer(
        fullName: customerRow['full_name']?.toString() ?? '',
        phone: customerRow['phone']?.toString() ?? '',
        identityNumber: customerRow['identity_number']?.toString() ?? '',
        email: customerRow['email']?.toString() ?? '',
        role: customerRow['customer_role']?.toString() ?? 'Musteri',
        kvkkConsent: customerRow['kvkk_consent'] == true,
        serviceConsent: customerRow['service_consent'] == true,
      ),
      packagePlan: PackagePlan(
        id: packageRow['code']?.toString() ?? packageType.code,
        name: packageRow['name']?.toString() ?? packageType.label,
        listPrice: 'Supabase paket kaydi',
        dealerDiscount: '',
        maxDiscountWarning: '',
        netCollection: '',
        paymentStatus: '',
        durationMinutes: _readInt(
            packageRow['duration_minutes'], packageType.durationMinutes),
        includedModules: _readStringList(packageRow['included_modules']),
        isRecommended: packageType == PackageType.premium,
      ),
      packageType: packageType,
      tasks: tasks,
      modules: const [],
      photoEvidence: const [],
      assignedTechnician: 'Canli havuz',
      createdAt: openedAt,
      estimatedDurationMinutes:
          _readInt(packageRow['duration_minutes'], packageType.durationMinutes),
      notes: row['customer_summary']?.toString() ?? '',
      auditLogs: [
        AuditLog(
          id: '${row['id']}-remote',
          userName: 'Supabase',
          action: 'Canli veri',
          createdAt: openedAt,
        ),
      ],
      isReportPrinted: false,
      editRequestPending: false,
      appointmentReady: true,
      vehicleIntakeReady: true,
      customerConsentReady: customerRow['kvkk_consent'] == true &&
          customerRow['service_consent'] == true,
      packageApproved: row['package_plans'] != null,
      technicalAssignmentReady: tasks.isNotEmpty,
      technicianStartEvidenceReady: false,
      externalQueriesReady: false,
      qualityApproved: row['manager_approved_at'] != null,
      paymentCompleted: row['payment_gate_ready'] == true,
      handoverApproved: false,
    );
  }

  WorkOrderTask _taskFromRow(Map<String, Object?> row) {
    final status = _taskStatusFromRemote(row['status']?.toString() ?? '');
    return WorkOrderTask(
      id: row['id']?.toString() ?? '',
      type: taskTypeFromCode(row['task_key']?.toString() ?? ''),
      title: row['title']?.toString() ?? '',
      status: status,
      isRequired: true,
      createdAt: DateTime.tryParse(row['created_at']?.toString() ?? '') ??
          DateTime.now(),
      completedAt: status == WorkOrderTaskStatus.completed
          ? DateTime.tryParse(row['updated_at']?.toString() ?? '')
          : null,
    );
  }

  WorkOrderStatus _workOrderStatusFromRemote(
    String value,
    List<WorkOrderTask> tasks,
  ) {
    switch (value.toUpperCase()) {
      case 'ASSIGNED':
        return WorkOrderStatus.assigned;
      case 'TECHNICAL_ENTRY_OPEN':
        return WorkOrderStatus.inspectionInProgress;
      case 'SUBMITTED':
      case 'MANAGER_REVIEW':
        return WorkOrderStatus.approvalWaiting;
      case 'APPROVED':
      case 'REPORT_GATE_READY':
        return WorkOrderStatus.approved;
      case 'DELIVERED':
        return WorkOrderStatus.delivered;
      case 'CANCELLED':
        return WorkOrderStatus.cancelled;
      case 'DRAFT':
      default:
        if (tasks
            .any((task) => task.status == WorkOrderTaskStatus.inProgress)) {
          return WorkOrderStatus.inspectionInProgress;
        }
        return WorkOrderStatus.draft;
    }
  }

  WorkOrderTaskStatus _taskStatusFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'ASSIGNED':
        return WorkOrderTaskStatus.assigned;
      case 'OPEN':
        return WorkOrderTaskStatus.inProgress;
      case 'COMPLETED':
        return WorkOrderTaskStatus.completed;
      case 'CANCELLED':
        return WorkOrderTaskStatus.cancelled;
      case 'LOCKED':
      case 'AVAILABLE':
      default:
        return WorkOrderTaskStatus.pending;
    }
  }

  int _readInt(Object? value, [int fallback = 0]) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  List<String> _readStringList(Object? value) {
    if (value is List) {
      return value.map((item) => item.toString()).toList(growable: false);
    }
    return const [];
  }

  Map<String, Object?> _nestedRow(Object? value) {
    if (value is Map) {
      return value.cast<String, Object?>();
    }
    return const {};
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
}
