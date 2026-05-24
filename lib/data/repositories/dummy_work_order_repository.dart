import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import '../models/work_order_model.dart';
import '../services/role_permission_service.dart';
import '../services/sync_service.dart';
import 'work_order_repository.dart';

class DummyWorkOrderRepository implements WorkOrderRepository {
  DummyWorkOrderRepository._();

  static final DummyWorkOrderRepository instance = DummyWorkOrderRepository._();

  final RolePermissionService _permissionService = const RolePermissionService();
  final SyncService _syncService = SyncService();
  late List<TechnicianWorkOrder> _workOrders = _seedWorkOrders();

  @override
  UserProfile get currentUser => const UserProfile(
        id: 'tech-ahmet',
        fullName: 'Ahmet Usta',
        email: 'ahmet.usta@ototr.test',
        phone: '0555 000 16 16',
        role: UserRole.inspectionTechnician,
        branchId: 'bursa-nilufer',
        isActive: true,
      );

  @override
  TechnicianRole get currentTechnicianRole => TechnicianRole.bodyPaint;

  @override
  List<TechnicianWorkOrder> visibleWorkOrders() {
    return _workOrders
        .where((order) => _permissionService.canSeeWorkOrder(currentUser, order))
        .toList();
  }

  @override
  TechnicianWorkOrder getById(String workOrderId) {
    return _workOrders.firstWhere((order) => order.id == workOrderId);
  }

  @override
  TechnicianWorkOrder claim(String workOrderId) {
    return _replace(getById(workOrderId).claim(currentUser.id));
  }

  @override
  TechnicianWorkOrder saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  ) {
    final status = startEvidence.isComplete
        ? WorkOrderStatus.technicalEntryOpen
        : WorkOrderStatus.startEvidenceRequired;
    return _replace(
      getById(workOrderId).copyWith(
        startEvidence: startEvidence,
        status: status,
      ),
    );
  }

  @override
  TechnicianWorkOrder updateTask(String workOrderId, TechnicianTask task) {
    final order = getById(workOrderId);
    return _replace(
      order.copyWith(
        tasks: [
          for (final current in order.tasks)
            if (current.taskId == task.taskId) task else current,
        ],
      ),
    );
  }

  @override
  TechnicianWorkOrder submitTask(String workOrderId, String taskId) {
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    final idempotencyKey = '$workOrderId-$taskId-r${task.revisionNo}';
    final nextStatus = task.canSubmit ? TaskStatus.completed : TaskStatus.evidenceMissing;
    final nextTask = task.copyWith(status: nextStatus);

    if (task.canSubmit) {
      _syncService.queueOperation(
        operationType: 'technical_task_submit',
        workOrderId: workOrderId,
        taskId: taskId,
        payload: {
          'reportFieldKey': task.reportFieldKey,
          'revisionNo': task.revisionNo,
          'status': nextStatus.name,
        },
        idempotencyKey: idempotencyKey,
      );
    }

    return updateTask(workOrderId, nextTask);
  }

  @override
  List<OfflineSyncQueue> syncQueue() => _syncService.pendingQueue;

  Future<void> flushSyncQueue() => _syncService.flushQueue();

  bool wasSubmitted(String idempotencyKey) {
    return _syncService.wasSubmitted(idempotencyKey);
  }

  void queueDemoOperation() {
    _syncService.queueOperation(
      operationType: 'technical_task_submit',
      workOrderId: 'wo-2026-0001',
      taskId: 'body-paint',
      payload: const {'demo': true},
      idempotencyKey: 'wo-2026-0001-body-paint-demo',
    );
  }

  @override
  void reset() {
    _syncService.reset();
    _workOrders = _seedWorkOrders();
  }

  TechnicianWorkOrder _replace(TechnicianWorkOrder next) {
    _workOrders = [
      for (final order in _workOrders)
        if (order.id == next.id) next else order,
    ];
    return next;
  }
}

List<TechnicianWorkOrder> _seedWorkOrders() {
  final now = DateTime(2026, 5, 24, 10, 30);
  return [
    TechnicianWorkOrder(
      id: 'wo-2026-0001',
      number: 'OTO-2026-0001',
      plate: '16 ABC 123',
      vehicleSummary: '2020 Volkswagen Passat 1.5 TSI',
      packageName: 'OTOTR Premium 360',
      assignedRoles: const [
        TechnicianRole.bodyPaint,
        TechnicianRole.mechanic,
        TechnicianRole.obd,
        TechnicianRole.testOperator,
      ],
      status: WorkOrderStatus.assigned,
      ownerUserId: '',
      startEvidence: StartEvidence(
        workOrderId: 'wo-2026-0001',
        vin: '',
        vinPhoto: '',
        platePhoto: '',
        odometerKm: null,
        odometerPhoto: '',
        capturedAt: now,
        capturedBy: 'tech-ahmet',
        deviceId: 'android-demo-device',
        gpsApprox: 'Bursa Nilüfer',
      ),
      tasks: _seedTasks('wo-2026-0001', now),
      externalQueries: [
        ExternalQuery(
          id: 'tramer-1',
          workOrderId: 'wo-2026-0001',
          type: 'Tramer/SBM',
          source: 'Portal entegrasyonu',
          status: ExternalQueryStatus.pending,
          resultSummary: '',
          queriedAt: null,
          importedToReport: false,
          blockingReason: 'Dış sorgu bekliyor: Tramer/SBM sonucu yok.',
        ),
        ExternalQuery(
          id: 'km-1',
          workOrderId: 'wo-2026-0001',
          type: 'KM geçmişi',
          source: 'Portal entegrasyonu',
          status: ExternalQueryStatus.ready,
          resultSummary: 'Son kayıt: 122.450 km / 16.05.2026',
          queriedAt: now,
          importedToReport: true,
          blockingReason: '',
        ),
      ],
      managerApproved: false,
      secretaryGateReady: true,
      paymentGateReady: false,
      kvkkGateReady: true,
    ),
  ];
}

List<TechnicianTask> _seedTasks(String workOrderId, DateTime now) {
  return [
    TechnicianTask(
      taskId: 'body-paint',
      workOrderId: workOrderId,
      assignedRole: TechnicianRole.bodyPaint,
      assignedUserId: '',
      title: 'Kaporta ve Boya Ekspertizi',
      status: TaskStatus.locked,
      checklistItems: [
        _item('front-hood', 'Ön Kaput', 'report.body_paint.front_hood'),
        _item('roof', 'Tavan', 'report.body_paint.roof'),
        _item('right-front-door', 'Sağ Ön Kapı', 'report.body_paint.right_front_door'),
        _item('left-front-door', 'Sol Ön Kapı', 'report.body_paint.left_front_door'),
        _item('micron', 'Boya mikron değeri', 'report.body_paint.micron'),
      ],
      requiredFields: const ['customerFriendlyNote'],
      riskyFindings: const [],
      customerFriendlyNote: '',
      reportFieldKey: 'report.section.body_paint',
      evidenceAssets: [
        EvidenceAsset(
          id: 'body-general-photo',
          workOrderId: workOrderId,
          taskId: 'body-paint',
          fieldKey: 'body_general_photo',
          reportFieldKey: 'report.photos.body_general',
          evidenceType: 'image',
          title: 'Kaporta genel açı fotoğrafı',
          localPath: '',
          remoteUrl: '',
          hash: '',
          capturedAt: now,
          uploadedAt: null,
          uploadedBy: 'tech-ahmet',
          syncStatus: EvidenceStatus.missing,
          isRequired: true,
          qualityStatus: 'unchecked',
          rejectionReason: '',
        ),
      ],
      managerReturnReason: '',
      revisionNo: 1,
      estimatedMinutes: 15,
    ),
    _moduleTask(
      workOrderId,
      'mechanic',
      TechnicianRole.mechanic,
      'Motor / Mekanik',
      'report.section.engine_mechanic',
      ['Yağ kaçak kontrolü', 'Şanzıman', 'Debriyaj / kavrama'],
    ),
    _moduleTask(
      workOrderId,
      'obd',
      TechnicianRole.obd,
      'OBD / Elektronik',
      'report.section.obd',
      ['Motor beyin arıza kaydı', 'Airbag/SRS ekranı', 'OBD test çıktısı'],
    ),
    _moduleTask(
      workOrderId,
      'test',
      TechnicianRole.testOperator,
      'Fren / Dyno / Yol Testi',
      'report.section.road_test',
      ['Servis fren verimliliği', 'Süspansiyon', 'Yol testi notu'],
    ),
  ];
}

TechnicianTask _moduleTask(
  String workOrderId,
  String taskId,
  TechnicianRole role,
  String title,
  String reportFieldKey,
  List<String> items,
) {
  return TechnicianTask(
    taskId: taskId,
    workOrderId: workOrderId,
    assignedRole: role,
    assignedUserId: '',
    title: title,
    status: TaskStatus.locked,
    checklistItems: [
      for (final item in items)
        _item(
          item.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-'),
          item,
          '$reportFieldKey.${item.hashCode.abs()}',
        ),
    ],
    requiredFields: const ['customerFriendlyNote'],
    riskyFindings: const [],
    customerFriendlyNote: '',
    reportFieldKey: reportFieldKey,
    evidenceAssets: const [],
    managerReturnReason: '',
    revisionNo: 1,
    estimatedMinutes: 8,
  );
}

TechnicianChecklistItem _item(String id, String title, String reportFieldKey) {
  return TechnicianChecklistItem(
    id: id,
    title: title,
    result: TechnicianFindingResult.normal,
    note: '',
    notDoneReason: '',
    reportFieldKey: reportFieldKey,
    requiresEvidenceOnRisk: true,
    evidenceAssets: const [],
  );
}
