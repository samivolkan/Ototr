import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/customer_model.dart';
import 'package:ototr_branch_app/data/models/package_plan_model.dart';
import 'package:ototr_branch_app/data/models/vehicle_model.dart';
import 'package:ototr_branch_app/data/models/work_order_model.dart';
import 'package:ototr_branch_app/data/services/work_order_task_factory.dart';

void main() {
  test('paket secimine gore gorev listesi olusur', () {
    final tasks = createTasksFromPackage(PackageType.premium);

    expect(tasks.map((task) => task.type), contains(TaskType.dynoTest));
    expect(tasks.map((task) => task.type), contains(TaskType.yoneticiOnay));
    expect(tasks.every((task) => task.status == WorkOrderTaskStatus.pending),
        isTrue);
  });

  test('is emri numarasi OTOTR-YYYYMMDD-0001 formatinda uretilir', () {
    final number = generateWorkOrderNumber(
      DateTime(2026, 5, 25),
      [
        _order('OTOTR-20260525-0001'),
        _order('OTOTR-20260525-0002'),
      ],
    );

    expect(number, 'OTOTR-20260525-0003');
  });

  test('gorev durumlari is emri statusunu otomatik hesaplar', () {
    final tasks = createTasksFromPackage(PackageType.hizliKontrol);
    final inProgress = [
      tasks.first.copyWith(status: WorkOrderTaskStatus.completed),
      tasks[1].copyWith(status: WorkOrderTaskStatus.inProgress),
      ...tasks.skip(2),
    ];
    final completed = [
      for (final task in tasks)
        task.copyWith(status: WorkOrderTaskStatus.completed),
    ];

    expect(calculateWorkOrderStatus(inProgress),
        WorkOrderStatus.inspectionInProgress);
    expect(
        calculateWorkOrderStatus(completed), WorkOrderStatus.approvalWaiting);
  });

  test('eksik veri zorunlu gorev ve temel bilgileri sayar', () {
    final tasks = createTasksFromPackage(PackageType.hizliKontrol);
    final order = _order(
      'OTOTR-20260525-0004',
      customer: const Customer(
        fullName: '',
        phone: '',
        identityNumber: '',
        email: '',
        role: 'Musteri',
        kvkkConsent: true,
        serviceConsent: true,
      ),
      tasks: tasks,
    );

    expect(calculateMissingDataCount(order), tasks.length + 2);
  });
}

WorkOrder _order(
  String number, {
  Customer customer = const Customer(
    fullName: 'Demo Musteri',
    phone: '0555',
    identityNumber: '',
    email: '',
    role: 'Musteri',
    kvkkConsent: true,
    serviceConsent: true,
  ),
  List<WorkOrderTask> tasks = const [],
}) {
  return WorkOrder(
    id: number,
    number: number,
    status: WorkOrderStatus.draft,
    vehicle: const Vehicle(
      plate: '16 ABC 123',
      vin: '',
      brand: 'Demo',
      model: 'Arac',
      year: 2020,
      fuelType: '',
      transmission: '',
      kilometers: 1000,
      sellerType: '',
      arrivalNote: '',
    ),
    customer: customer,
    packagePlan: packagePlanFromType(PackageType.standard),
    packageType: PackageType.standard,
    tasks: tasks,
    modules: const [],
    photoEvidence: const [],
    assignedTechnician: 'Demo',
    createdAt: DateTime(2026, 5, 25),
    estimatedDurationMinutes: 45,
    notes: '',
    auditLogs: const [],
    isReportPrinted: false,
    editRequestPending: false,
    appointmentReady: true,
    vehicleIntakeReady: true,
    customerConsentReady: true,
    packageApproved: true,
    technicalAssignmentReady: true,
    technicianStartEvidenceReady: false,
    externalQueriesReady: false,
    qualityApproved: false,
    paymentCompleted: false,
    handoverApproved: false,
  );
}
