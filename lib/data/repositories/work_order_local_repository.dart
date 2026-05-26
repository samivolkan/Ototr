import 'dart:convert';

import '../models/audit_log_model.dart';
import '../models/customer_model.dart';
import '../models/package_plan_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';
import '../services/work_order_storage.dart';
import '../services/work_order_task_factory.dart';

class WorkOrderLocalRepository {
  WorkOrderLocalRepository._() {
    _load();
  }

  static final WorkOrderLocalRepository instance = WorkOrderLocalRepository._();

  static const String _storageKey = 'ototr_work_orders_v1';

  final WorkOrderStorageBackend _storage = createWorkOrderStorage();
  List<WorkOrder> _orders = [];

  List<WorkOrder> getAll() {
    return List.unmodifiable(_orders);
  }

  WorkOrder? getById(String id) {
    for (final order in _orders) {
      if (order.id == id) {
        return order;
      }
    }
    return null;
  }

  WorkOrder create({
    required Customer customer,
    required Vehicle vehicle,
    required PackageType packageType,
    required String notes,
  }) {
    final now = DateTime.now();
    final tasks = createTasksFromPackage(packageType);
    final order = WorkOrder(
      id: 'wo-${now.microsecondsSinceEpoch}',
      number: generateWorkOrderNumber(now, _orders),
      status: calculateWorkOrderStatus(tasks),
      vehicle: vehicle,
      customer: customer,
      packagePlan: packagePlanFromType(packageType),
      packageType: packageType,
      tasks: tasks,
      modules: const [],
      photoEvidence: const [],
      assignedTechnician: 'Atanmadi',
      createdAt: now,
      estimatedDurationMinutes: packageType.durationMinutes,
      notes: notes.trim(),
      auditLogs: [
        AuditLog(
          id: 'audit-${now.microsecondsSinceEpoch}',
          userName: 'Demo Kullanici',
          action: 'Is emri olusturuldu',
          createdAt: now,
        ),
      ],
      isReportPrinted: false,
      editRequestPending: false,
      appointmentReady: true,
      vehicleIntakeReady: vehicle.plate.trim().isNotEmpty,
      customerConsentReady: customer.fullName.trim().isNotEmpty,
      packageApproved: true,
      technicalAssignmentReady: tasks.isNotEmpty,
      technicianStartEvidenceReady: false,
      externalQueriesReady: false,
      qualityApproved: false,
      paymentCompleted: false,
      handoverApproved: false,
    );

    _orders = [order, ..._orders];
    _save();
    return order;
  }

  WorkOrder updateTaskStatus(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  ) {
    final order = getById(workOrderId);
    if (order == null) {
      throw StateError('Is emri bulunamadi: $workOrderId');
    }
    final now = DateTime.now();
    final tasks = [
      for (final task in order.tasks)
        if (task.id == taskId)
          task.copyWith(
            status: status,
            completedAt: status == WorkOrderTaskStatus.completed ? now : null,
          )
        else
          task,
    ];
    final next = order.copyWith(
      tasks: tasks,
      status: calculateWorkOrderStatus(tasks),
      qualityApproved: tasks.any((task) =>
              task.type == TaskType.yoneticiOnay &&
              task.status == WorkOrderTaskStatus.completed) ||
          order.qualityApproved,
    );

    _orders = [
      for (final current in _orders)
        if (current.id == workOrderId) next else current,
    ];
    _save();
    return next;
  }

  int missingDataCount(WorkOrder order) {
    return calculateMissingDataCount(order);
  }

  WorkOrderSummary summary() {
    final orders = getAll();
    return WorkOrderSummary(
      total: orders.length,
      active: orders
          .where((order) =>
              order.status != WorkOrderStatus.cancelled &&
              order.status != WorkOrderStatus.delivered)
          .length,
      missingData: orders.fold<int>(
        0,
        (total, order) => total + missingDataCount(order),
      ),
      completedTasks: orders.fold<int>(
        0,
        (total, order) =>
            total +
            order.tasks
                .where((task) => task.status == WorkOrderTaskStatus.completed)
                .length,
      ),
    );
  }

  void _load() {
    final raw = _storage.read(_storageKey);
    if (raw == null || raw.trim().isEmpty) {
      _orders = _seedOrders();
      _save();
      return;
    }
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      _orders = decoded
          .whereType<Map<String, Object?>>()
          .map(_orderFromJson)
          .toList();
    } catch (_) {
      _orders = _seedOrders();
      _save();
    }
  }

  void _save() {
    _storage.write(
      _storageKey,
      jsonEncode(_orders.map(_orderToJson).toList()),
    );
  }

  List<WorkOrder> _seedOrders() {
    final firstDate = DateTime(2026, 5, 25, 9, 30);
    final secondDate = DateTime(2026, 5, 25, 10, 15);
    final firstTasks = createTasksFromPackage(PackageType.premium);
    final secondTasks = createTasksFromPackage(PackageType.standard);
    final firstDone = [
      for (var index = 0; index < firstTasks.length; index++)
        if (index < 3)
          firstTasks[index].copyWith(
            status: WorkOrderTaskStatus.completed,
            completedAt: firstDate.add(Duration(minutes: 15 + index)),
          )
        else if (index == 3)
          firstTasks[index].copyWith(status: WorkOrderTaskStatus.inProgress)
        else
          firstTasks[index],
    ];

    return [
      _buildSeedOrder(
        id: 'wo-demo-1',
        number: 'OTOTR-20260525-0001',
        createdAt: firstDate,
        packageType: PackageType.premium,
        customer: const Customer(
          fullName: 'Mehmet Yilmaz',
          phone: '0532 000 16 16',
          identityNumber: '',
          email: 'mehmet.yilmaz@example.test',
          role: 'Alici',
          kvkkConsent: true,
          serviceConsent: true,
        ),
        vehicle: const Vehicle(
          plate: '16 ABC 123',
          vin: 'WVWZZZ3CZLE000001',
          brand: 'Volkswagen',
          model: 'Passat 1.5 TSI',
          year: 2020,
          fuelType: 'Benzin',
          transmission: 'Otomatik',
          kilometers: 84500,
          sellerType: 'Bireysel',
          arrivalNote: 'Sol arka kapida boya beyan edildi.',
        ),
        tasks: firstDone,
        notes: 'Premium paket demo is emri.',
      ),
      _buildSeedOrder(
        id: 'wo-demo-2',
        number: 'OTOTR-20260525-0002',
        createdAt: secondDate,
        packageType: PackageType.standard,
        customer: const Customer(
          fullName: 'Ayse Demir',
          phone: '0533 000 16 16',
          identityNumber: '',
          email: '',
          role: 'Satici',
          kvkkConsent: true,
          serviceConsent: true,
        ),
        vehicle: const Vehicle(
          plate: '34 XYZ 987',
          vin: '',
          brand: 'Renault',
          model: 'Megane',
          year: 2019,
          fuelType: 'Dizel',
          transmission: 'Manuel',
          kilometers: 126200,
          sellerType: 'Bireysel',
          arrivalNote: '',
        ),
        tasks: secondTasks,
        notes: 'Standart paket kabul bekliyor.',
      ),
    ];
  }

  WorkOrder _buildSeedOrder({
    required String id,
    required String number,
    required DateTime createdAt,
    required PackageType packageType,
    required Customer customer,
    required Vehicle vehicle,
    required List<WorkOrderTask> tasks,
    required String notes,
  }) {
    return WorkOrder(
      id: id,
      number: number,
      status: calculateWorkOrderStatus(tasks),
      vehicle: vehicle,
      customer: customer,
      packagePlan: packagePlanFromType(packageType),
      packageType: packageType,
      tasks: tasks,
      modules: const [],
      photoEvidence: const [],
      assignedTechnician: 'Demo Usta',
      createdAt: createdAt,
      estimatedDurationMinutes: packageType.durationMinutes,
      notes: notes,
      auditLogs: const [],
      isReportPrinted: false,
      editRequestPending: false,
      appointmentReady: true,
      vehicleIntakeReady: vehicle.plate.trim().isNotEmpty,
      customerConsentReady: customer.fullName.trim().isNotEmpty,
      packageApproved: true,
      technicalAssignmentReady: tasks.isNotEmpty,
      technicianStartEvidenceReady: false,
      externalQueriesReady: false,
      qualityApproved: tasks.any((task) =>
          task.type == TaskType.yoneticiOnay &&
          task.status == WorkOrderTaskStatus.completed),
      paymentCompleted: false,
      handoverApproved: false,
    );
  }

  Map<String, Object?> _orderToJson(WorkOrder order) {
    return {
      'id': order.id,
      'number': order.number,
      'status': order.status.name,
      'vehicle': order.vehicle.toJson(),
      'customer': order.customer.toJson(),
      'packageType': (order.packageType ?? PackageType.standard).code,
      'tasks': order.tasks.map((task) => task.toJson()).toList(),
      'assignedTechnician': order.assignedTechnician,
      'createdAt': order.createdAt.toIso8601String(),
      'estimatedDurationMinutes': order.estimatedDurationMinutes,
      'notes': order.notes,
      'isReportPrinted': order.isReportPrinted,
      'editRequestPending': order.editRequestPending,
      'appointmentReady': order.appointmentReady,
      'vehicleIntakeReady': order.vehicleIntakeReady,
      'customerConsentReady': order.customerConsentReady,
      'packageApproved': order.packageApproved,
      'technicalAssignmentReady': order.technicalAssignmentReady,
      'technicianStartEvidenceReady': order.technicianStartEvidenceReady,
      'externalQueriesReady': order.externalQueriesReady,
      'qualityApproved': order.qualityApproved,
      'paymentCompleted': order.paymentCompleted,
      'handoverApproved': order.handoverApproved,
    };
  }

  WorkOrder _orderFromJson(Map<String, Object?> json) {
    final packageType =
        packageTypeFromCode(json['packageType'] as String? ?? '');
    final taskValues = json['tasks'] as List<dynamic>? ?? const [];
    final tasks = taskValues
        .whereType<Map<String, Object?>>()
        .map(WorkOrderTask.fromJson)
        .toList();
    return WorkOrder(
      id: json['id'] as String? ?? '',
      number: json['number'] as String? ?? '',
      status: _statusFromName(json['status'] as String? ?? '') ??
          calculateWorkOrderStatus(tasks),
      vehicle: Vehicle.fromJson(
          (json['vehicle'] as Map<dynamic, dynamic>? ?? const {})
              .cast<String, Object?>()),
      customer: Customer.fromJson(
          (json['customer'] as Map<dynamic, dynamic>? ?? const {})
              .cast<String, Object?>()),
      packagePlan: packagePlanFromType(packageType),
      packageType: packageType,
      tasks: tasks,
      modules: const [],
      photoEvidence: const [],
      assignedTechnician: json['assignedTechnician'] as String? ?? 'Atanmadi',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      estimatedDurationMinutes: json['estimatedDurationMinutes'] as int? ??
          packageType.durationMinutes,
      notes: json['notes'] as String? ?? '',
      auditLogs: const [],
      isReportPrinted: json['isReportPrinted'] as bool? ?? false,
      editRequestPending: json['editRequestPending'] as bool? ?? false,
      appointmentReady: json['appointmentReady'] as bool? ?? true,
      vehicleIntakeReady: json['vehicleIntakeReady'] as bool? ?? false,
      customerConsentReady: json['customerConsentReady'] as bool? ?? false,
      packageApproved: json['packageApproved'] as bool? ?? true,
      technicalAssignmentReady:
          json['technicalAssignmentReady'] as bool? ?? tasks.isNotEmpty,
      technicianStartEvidenceReady:
          json['technicianStartEvidenceReady'] as bool? ?? false,
      externalQueriesReady: json['externalQueriesReady'] as bool? ?? false,
      qualityApproved: json['qualityApproved'] as bool? ?? false,
      paymentCompleted: json['paymentCompleted'] as bool? ?? false,
      handoverApproved: json['handoverApproved'] as bool? ?? false,
    );
  }

  WorkOrderStatus? _statusFromName(String name) {
    for (final status in WorkOrderStatus.values) {
      if (status.name == name) {
        return status;
      }
    }
    return null;
  }
}

class WorkOrderSummary {
  const WorkOrderSummary({
    required this.total,
    required this.active,
    required this.missingData,
    required this.completedTasks,
  });

  final int total;
  final int active;
  final int missingData;
  final int completedTasks;
}
