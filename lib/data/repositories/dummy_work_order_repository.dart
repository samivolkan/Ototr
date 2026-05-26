import '../generated/inspection_schema_catalog.dart';
import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import '../models/work_order_model.dart';
import '../services/role_permission_service.dart';
import '../services/sync_service.dart';
import 'final_report_repository.dart';
import 'work_order_report_repository.dart';
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
    return _replace(getById(workOrderId).claim(currentUser.id));
  }

  @override
  TechnicianWorkOrder claimTask(String workOrderId, String taskId) {
    final order = getById(workOrderId);
    if (!order.isStartEvidenceComplete) {
      throw StateError(
        'Araç başlama iş emri tamamlanmadan başlık sahiplenilemez.',
      );
    }
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(order, task.claimBy(currentUser, DateTime.now()));
  }

  @override
  TechnicianWorkOrder releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) {
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(
      order,
      task.releaseBy(currentUser, releaseReason, DateTime.now()),
    );
  }

  @override
  TechnicianWorkOrder managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) {
    final order = getById(workOrderId);
    final task = order.tasks.firstWhere((item) => item.taskId == taskId);
    return _replaceTask(
      order,
      task.managerAssignTo(
        manager: currentUser,
        nextOwnerUserId: ownerUserId,
        reason: managerAssignReason,
        assignedAt: DateTime.now(),
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
    final order = getById(workOrderId);
    final tasks = startEvidence.isComplete
        ? [
            for (final task in order.tasks)
              if (!task.isOwned &&
                  (task.status == TaskStatus.locked ||
                      task.status == TaskStatus.assigned))
                task.copyWith(status: TaskStatus.available)
              else
                task,
          ]
        : order.tasks;
    return _replace(
      order.copyWith(
        startEvidence: startEvidence,
        status: startEvidence.isComplete
            ? WorkOrderStatus.technicalEntryOpen
            : WorkOrderStatus.startEvidenceRequired,
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
      ),
    );
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

  @override
  TechnicianWorkOrder saveFinalMediaAsset(
    String workOrderId,
    EvidenceAsset asset,
  ) {
    final order = getById(workOrderId);
    return _replace(
      order.copyWith(
        finalMediaAssets: [
          for (final current in order.finalMediaAssets)
            if (current.id == asset.id) asset else current,
        ],
      ),
    );
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
    LocalWorkOrderReportRepository.instance.reset();
    LocalFinalReportRepository.instance.reset();
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
      finalMediaAssets: _finalMediaAssets('wo-2026-0001', now),
    ),
  ];
}

List<EvidenceAsset> _finalMediaAssets(String workOrderId, DateTime now) {
  const specs = [
    ('front', 'Araç ön fotoğrafı', 'image'),
    ('rear', 'Araç arka fotoğrafı', 'image'),
    ('right', 'Araç sağ yan fotoğrafı', 'image'),
    ('left', 'Araç sol yan fotoğrafı', 'image'),
    ('roof', 'Araç üst / tavan fotoğrafı', 'image'),
    ('interior', 'Araç iç mekan fotoğrafı', 'image'),
    ('trunk', 'Bagaj fotoğrafı', 'image'),
    ('engine-bay', 'Motor bölmesi fotoğrafı', 'image'),
    ('walkaround-video', 'Araç çevre video kaydı', 'video'),
  ];

  return [
    for (final spec in specs)
      EvidenceAsset(
        id: 'final-media-${spec.$1}',
        workOrderId: workOrderId,
        taskId: 'final-report-media',
        fieldKey: 'final_media.${spec.$1}',
        reportFieldKey: 'report.final_media.${spec.$1}',
        evidenceType: spec.$3,
        title: spec.$2,
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
  ];
}

List<TechnicianTask> _seedTasks(String workOrderId, DateTime now) {
  return [
    for (final task in inspectionTaskCatalogForPackage('PREMIUM'))
      _catalogTask(workOrderId, task, now),
  ];
}

TechnicianTask _catalogTask(
  String workOrderId,
  InspectionTaskCatalog catalogTask,
  DateTime now,
) {
  final requiredEvidenceItems = catalogTask.checklistItems
      .where((item) => item.requiresMediaAlways)
      .take(4)
      .toList(growable: false);

  return TechnicianTask(
    taskId: _taskIdFromInspectionGroup(catalogTask.taskTypeCode),
    workOrderId: workOrderId,
    assignedRole: _roleFromInspectionGroup(catalogTask.taskTypeCode),
    assignedUserId: '',
    title: catalogTask.title,
    status: TaskStatus.locked,
    checklistItems: [
      for (final item in catalogTask.checklistItems)
        _item(
          item.itemId,
          item.title,
          item.reportFieldKey,
          requiresEvidenceOnRisk: true,
        ),
    ],
    requiredFields: const ['customerFriendlyNote'],
    riskyFindings: const [],
    customerFriendlyNote: '',
    reportFieldKey: catalogTask.reportFieldKey,
    evidenceAssets: [
      for (final item in requiredEvidenceItems)
        EvidenceAsset(
          id: '${_taskIdFromInspectionGroup(catalogTask.taskTypeCode)}-${item.itemId}-evidence',
          workOrderId: workOrderId,
          taskId: _taskIdFromInspectionGroup(catalogTask.taskTypeCode),
          fieldKey: item.itemId,
          reportFieldKey: item.reportFieldKey,
          evidenceType: item.inputType == 'document_or_image'
              ? 'document_or_image'
              : 'image',
          title: '${item.title} kanıtı',
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
    estimatedMinutes: catalogTask.estimatedMinutes,
  );
}

String _taskIdFromInspectionGroup(String groupCode) {
  return switch (groupCode) {
    'BODY_PAINT_CHECKUP' => 'body-paint',
    'MOTOR_CHECKUP' => 'mechanic',
    'MECHANICAL_CHECKUP' => 'underbody',
    'OBD_ECU_TEST' => 'obd',
    'BRAKE_SUSPENSION_TEST' => 'brake',
    'DYNO_ROAD_TEST' => 'dyno',
    'EXTERIOR_CONDITION' => 'exterior',
    'INTERIOR_CHECKUP' => 'interior',
    'AIRBAG_CHECK' => 'airbag',
    'HEAD_GASKET_LEAK_TEST' => 'head-gasket',
    _ => groupCode.toLowerCase().replaceAll('_', '-'),
  };
}

TechnicianRole _roleFromInspectionGroup(String groupCode) {
  return switch (groupCode) {
    'BODY_PAINT_CHECKUP' ||
    'EXTERIOR_CONDITION' ||
    'INTERIOR_CHECKUP' =>
      TechnicianRole.bodyPaint,
    'MOTOR_CHECKUP' ||
    'MECHANICAL_CHECKUP' ||
    'HEAD_GASKET_LEAK_TEST' =>
      TechnicianRole.mechanic,
    'OBD_ECU_TEST' || 'AIRBAG_CHECK' => TechnicianRole.obd,
    'BRAKE_SUSPENSION_TEST' || 'DYNO_ROAD_TEST' => TechnicianRole.testOperator,
    _ => TechnicianRole.bodyPaint,
  };
}

TechnicianChecklistItem _item(
  String id,
  String title,
  String reportFieldKey, {
  required bool requiresEvidenceOnRisk,
}) {
  return TechnicianChecklistItem(
    id: id,
    title: title,
    result: TechnicianFindingResult.normal,
    note: '',
    notDoneReason: '',
    reportFieldKey: reportFieldKey,
    requiresEvidenceOnRisk: requiresEvidenceOnRisk,
    evidenceAssets: const [],
  );
}
