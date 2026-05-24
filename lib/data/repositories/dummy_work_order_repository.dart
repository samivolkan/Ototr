import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import '../models/work_order_model.dart';
import '../services/role_permission_service.dart';
import '../services/sync_service.dart';
import 'work_order_repository.dart';

class DummyWorkOrderRepository implements WorkOrderRepository {
  DummyWorkOrderRepository._();

  static final DummyWorkOrderRepository instance = DummyWorkOrderRepository._();

  final RolePermissionService _permissionService =
      const RolePermissionService();
  final SyncService _syncService = SyncService();
  late List<TechnicianWorkOrder> _workOrders = _seedWorkOrders();
  UserProfile _currentUser = _ahmetUser;

  @override
  UserProfile get currentUser => _currentUser;

  @override
  TechnicianRole get currentTechnicianRole => TechnicianRole.bodyPaint;

  @override
  List<UserProfile> activeTechnicians() => const [_ahmetUser, _mehmetUser];

  @override
  List<TechnicianWorkOrder> visibleWorkOrders() {
    return _workOrders
        .where(
            (order) => _permissionService.canSeeWorkOrder(currentUser, order))
        .toList();
  }

  @override
  TechnicianWorkOrder getById(String workOrderId) {
    return _workOrders.firstWhere((order) => order.id == workOrderId);
  }

  @override
  TechnicianWorkOrder claim(String workOrderId) {
    final order = getById(workOrderId).claim(currentUser.id);
    return _replace(order);
  }

  @override
  TechnicianWorkOrder claimTask(String workOrderId, String taskId) {
    final now = DateTime.now();
    final order = getById(workOrderId);
    if (!order.isStartEvidenceComplete) {
      throw StateError('Başlangıç kanıtı tamamlanmadan başlık sahiplenilemez.');
    }
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(order, task.claimBy(currentUser, now));
  }

  @override
  TechnicianWorkOrder releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) {
    final now = DateTime.now();
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(order, task.releaseBy(currentUser, releaseReason, now));
  }

  @override
  TechnicianWorkOrder managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) {
    final now = DateTime.now();
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(
      order,
      task.managerAssignTo(
        manager: currentUser,
        nextOwnerUserId: ownerUserId,
        reason: managerAssignReason,
        assignedAt: now,
      ),
    );
  }

  @override
  TechnicianWorkOrder managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) {
    if (currentUser.role != UserRole.branchManager) {
      throw StateError('Sahipliği kaldırma sadece müdür yetkisindedir.');
    }
    if (releaseReason.trim().isEmpty) {
      throw ArgumentError('Gerekçe zorunludur.');
    }

    final now = DateTime.now();
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    final nextTask = task.copyWith(
      ownerUserId: null,
      claimedAt: null,
      status: TaskStatus.available,
      releaseReason: releaseReason.trim(),
      releasedByUserId: currentUser.id,
      releasedAt: now,
      ownershipHistory: [
        ...task.ownershipHistory,
        TaskOwnershipHistoryEntry(
          eventType: TaskOwnershipEventType.managerReleased,
          actorUserId: currentUser.id,
          ownerUserId: null,
          previousOwnerUserId: task.ownerUserId,
          reason: releaseReason.trim(),
          createdAt: now,
        ),
      ],
      auditLog: [
        ...task.auditLog,
        TaskAuditLogEntry(
          action: 'manager_released',
          actorUserId: currentUser.id,
          createdAt: now,
          note: releaseReason.trim(),
        ),
      ],
    );

    return _replaceTask(order, nextTask);
  }

  @override
  TechnicianWorkOrder saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  ) {
    final status = startEvidence.isComplete
        ? WorkOrderStatus.technicalEntryOpen
        : WorkOrderStatus.startEvidenceRequired;
    final order = getById(workOrderId);
    final tasks = startEvidence.isComplete
        ? [
            for (final task in order.tasks)
              if (!task.isOwned &&
                  (task.status == TaskStatus.locked ||
                      task.status == TaskStatus.assigned))
                task.copyWith(
                  status: TaskStatus.available,
                  ownerUserId: null,
                  claimedAt: null,
                )
              else
                task,
          ]
        : order.tasks;
    return _replace(
      order.copyWith(
        startEvidence: startEvidence,
        status: status,
        tasks: tasks,
      ),
    );
  }

  @override
  TechnicianWorkOrder updateTask(String workOrderId, TechnicianTask task) {
    final order = getById(workOrderId);
    final current =
        order.tasks.firstWhere((item) => item.taskId == task.taskId);
    if (!current.canEditBy(currentUser)) {
      throw StateError('Sadece görev sahibi bu başlığı düzenleyebilir.');
    }
    return _replaceTask(
        order,
        task.copyWith(
          ownerUserId: current.ownerUserId,
          claimedAt: current.claimedAt,
          releaseReason: current.releaseReason,
          releasedByUserId: current.releasedByUserId,
          releasedAt: current.releasedAt,
          assignedByManagerId: current.assignedByManagerId,
          managerAssignReason: current.managerAssignReason,
          ownershipHistory: current.ownershipHistory,
          auditLog: current.auditLog,
        ));
  }

  @override
  TechnicianWorkOrder submitTask(String workOrderId, String taskId) {
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    final idempotencyKey = '$workOrderId-$taskId-r${task.revisionNo}';
    final nextTask = task.submittedBy(currentUser, DateTime.now());

    if (task.canSubmit) {
      _syncService.queueOperation(
        operationType: 'technical_task_submit',
        workOrderId: workOrderId,
        taskId: taskId,
        payload: {
          'reportFieldKey': task.reportFieldKey,
          'revisionNo': task.revisionNo,
          'status': nextTask.status.name,
        },
        idempotencyKey: idempotencyKey,
      );
    }

    return _replaceTask(order, nextTask);
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
    _currentUser = _ahmetUser;
    _workOrders = _seedWorkOrders();
  }

  void switchCurrentUserForTest(UserProfile user) {
    _currentUser = user;
  }

  TechnicianWorkOrder _replaceTask(
    TechnicianWorkOrder order,
    TechnicianTask nextTask,
  ) {
    return _replace(
      order.copyWith(
        tasks: [
          for (final current in order.tasks)
            if (current.taskId == nextTask.taskId) nextTask else current,
        ],
      ),
    );
  }

  TechnicianWorkOrder _replace(TechnicianWorkOrder next) {
    _workOrders = [
      for (final order in _workOrders)
        if (order.id == next.id) next else order,
    ];
    return next;
  }
}

const _ahmetUser = UserProfile(
  id: 'tech-ahmet',
  fullName: 'Ahmet Usta',
  email: 'ahmet.usta@ototr.test',
  phone: '0555 000 16 16',
  role: UserRole.inspectionTechnician,
  branchId: 'bursa-nilufer',
  isActive: true,
);

const _mehmetUser = UserProfile(
  id: 'tech-mehmet',
  fullName: 'Mehmet Usta',
  email: 'mehmet.usta@ototr.test',
  phone: '0555 000 16 17',
  role: UserRole.inspectionTechnician,
  branchId: 'bursa-nilufer',
  isActive: true,
);

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
        const ExternalQuery(
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
        _item('right-front-door', 'Sağ Ön Kapı',
            'report.body_paint.right_front_door'),
        _item('left-front-door', 'Sol Ön Kapı',
            'report.body_paint.left_front_door'),
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
