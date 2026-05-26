import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/technician_operation_model.dart';
import 'package:ototr_branch_app/data/models/user_profile_model.dart';
import 'package:ototr_branch_app/data/models/work_order_model.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/data/services/report_gate_calculator.dart';
import 'package:ototr_branch_app/data/services/role_permission_service.dart';
import 'package:ototr_branch_app/data/services/sync_service.dart';

void main() {
  late DummyWorkOrderRepository repository;

  setUp(() {
    repository = DummyWorkOrderRepository.instance;
    repository.reset();
  });

  test('assigned -> claimed gecisi calisir', () {
    final claimed = repository.claim('wo-2026-0001');

    expect(claimed.status, WorkOrderStatus.claimed);
    expect(claimed.ownerUserId, repository.currentUser.id);
  });

  test('baslangic kaniti eksikken teknik modul acilmaz', () {
    final order = repository.getById('wo-2026-0001');

    expect(order.isStartEvidenceComplete, isFalse);
    expect(const RolePermissionService().canOpenTechnicalEntry(order), isFalse);
  });

  test('baslangic kaniti tamamken teknik modul acilir', () {
    repository.claim('wo-2026-0001');
    final order = repository.saveStartEvidence(
      'wo-2026-0001',
      StartEvidence(
        workOrderId: 'wo-2026-0001',
        vin: 'WVWZZZ3CZEP005235',
        vinPhoto: 'local/vin.jpg',
        platePhoto: 'local/plate.jpg',
        odometerKm: 122450,
        odometerPhoto: 'local/km.jpg',
        capturedAt: DateTime(2026, 5, 24),
        capturedBy: 'tech-ahmet',
        deviceId: 'demo-device',
        gpsApprox: 'Bursa Nilufer',
      ),
    );

    expect(order.status, WorkOrderStatus.technicalEntryOpen);
    expect(const RolePermissionService().canOpenTechnicalEntry(order), isTrue);
    expect(order.tasks.first.status, TaskStatus.available);
    expect(order.tasks.first.ownerUserId, isNull);
  });

  test('baslangic kaniti KM ekrani olmadan tamamlanmaz', () {
    repository.claim('wo-2026-0001');
    final order = repository.saveStartEvidence(
      'wo-2026-0001',
      StartEvidence(
        workOrderId: 'wo-2026-0001',
        vin: 'WVWZZZ3CZEP005235',
        vinPhoto: 'local/vin.jpg',
        platePhoto: 'local/plate.jpg',
        odometerKm: null,
        odometerPhoto: '',
        capturedAt: DateTime(2026, 5, 24),
        capturedBy: 'tech-ahmet',
        deviceId: 'demo-device',
        gpsApprox: 'Bursa Nilufer',
      ),
    );

    expect(order.isStartEvidenceComplete, isFalse);
    expect(
      order.startEvidence?.missingReasons(),
      contains('KM ekran fotografi eksik.'),
    );
    expect(order.status, WorkOrderStatus.startEvidenceRequired);
  });

  test('müsait usta rol kısıtı olmadan açık başlığı sahiplenebilir', () {
    _completeStartEvidence(repository);
    final claimed = repository.claimTask('wo-2026-0001', 'mechanic');
    final task = claimed.tasks.firstWhere((item) => item.taskId == 'mechanic');

    expect(task.status, TaskStatus.open);
    expect(task.ownerUserId, repository.currentUser.id);
    expect(
      const RolePermissionService().canEditTask(
        repository.currentUser,
        task,
      ),
      isTrue,
    );
  });

  test('riskli bulguda fotograf olmadan gonderim engellenir', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final riskyItem = task.checklistItems.first.copyWith(
      result: TechnicianFindingResult.risky,
      note: 'On kaputta lokal boya tespit edildi.',
    );
    final nextTask = task.copyWith(
      checklistItems: [riskyItem, ...task.checklistItems.skip(1)],
    );

    expect(nextTask.canSubmit, isFalse);
    expect(nextTask.missingReasons().join(' '), contains('foto'));
  });

  test('yapilamayan testte neden yoksa gonderim engellenir', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final item = task.checklistItems.first.copyWith(
      result: TechnicianFindingResult.notDone,
    );
    final nextTask = task.copyWith(
      checklistItems: [item, ...task.checklistItems.skip(1)],
    );

    expect(nextTask.canSubmit, isFalse);
    expect(nextTask.missingReasons().join(' '), contains('nedeni'));
  });

  test('ayni idempotencyKey ile ikinci gonderim rapora tekrar yazilmaz',
      () async {
    final syncService = SyncService();
    final first = syncService.queueOperation(
      operationType: 'technical_task_submit',
      workOrderId: 'wo-1',
      taskId: 'body',
      payload: const {'field': 'value'},
      idempotencyKey: 'wo-1-body-r1',
    );
    final second = syncService.queueOperation(
      operationType: 'technical_task_submit',
      workOrderId: 'wo-1',
      taskId: 'body',
      payload: const {'field': 'value'},
      idempotencyKey: 'wo-1-body-r1',
    );

    expect(first.queueId, second.queueId);
    expect(syncService.pendingQueue.length, 1);
    await syncService.flushQueue();
    expect(syncService.wasSubmitted('wo-1-body-r1'), isTrue);
  });

  test('role permission ile usta finans alanlarini goremez', () {
    const user = UserProfile(
      id: 'tech',
      fullName: 'Usta',
      email: 'usta@ototr.test',
      phone: '0555',
      role: UserRole.inspectionTechnician,
      branchId: 'bursa',
      isActive: true,
    );

    expect(const RolePermissionService().canSeeFinancialField(user), isFalse);
    expect(
      const RolePermissionService().shouldShowField(user, 'payment'),
      isFalse,
    );
  });

  test('report gate eksik kanitla blocked doner', () {
    final result = const ReportGateCalculator().calculate(
      workOrder: repository.getById('wo-2026-0001'),
      syncQueue: const [],
    );

    expect(result.isReady, isFalse);
    expect(
      result.issues.map((issue) => issue.code),
      contains(ReportGateIssueCode.startEvidenceMissing),
    );
  });

  test('rapor kapisi final arac medya eksiklerini bloklar', () {
    final result = const ReportGateCalculator().calculate(
      workOrder: repository.getById('wo-2026-0001'),
      syncQueue: const [],
    );

    expect(result.isReady, isFalse);
    expect(
      result.missingEvidence,
      contains('Araç ön fotoğrafı rapor medyası eksik.'),
    );
    expect(
      result.missingEvidence,
      contains('Araç çevre video kaydı rapor medyası eksik.'),
    );
  });

  test('external query yoksa dis sorgu bekliyor blokaji uretir', () {
    final order =
        repository.getById('wo-2026-0001').copyWith(externalQueries: const []);
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: const [],
    );

    expect(result.isReady, isFalse);
    expect(
      result.issues.map((issue) => issue.code),
      contains(ReportGateIssueCode.externalQueryPending),
    );
  });

  test('rapor kapisi mudur onayi beklemez', () {
    final result = const ReportGateCalculator().calculate(
      workOrder: repository.getById('wo-2026-0001'),
      syncQueue: const [],
    );

    expect(result.managerApprovalRequired, isFalse);
    expect(result.status, isNot(ReportGateStatus.managerApprovalRequired));
    expect(
      result.issues.map((issue) => issue.code),
      isNot(contains(ReportGateIssueCode.managerApprovalPending)),
    );
  });

  test('tamamlanan teknik gorev musteri dili ozeti olmadan kilitlenmez', () {
    final order = repository.getById('wo-2026-0001');
    final task = order.tasks.first.copyWith(status: TaskStatus.completed);
    final result = const ReportGateCalculator().calculate(
      workOrder: order.copyWith(tasks: [task, ...order.tasks.skip(1)]),
      syncQueue: const [],
    );

    expect(
      result.issues.map((issue) => issue.code),
      contains(ReportGateIssueCode.customerFriendlyNoteMissing),
    );
  });

  test('riskli bulgu varken musteri ozeti sorunsuz diyemez', () {
    final order = repository.getById('wo-2026-0001');
    final task = order.tasks.first;
    final riskyItem = task.checklistItems.first.copyWith(
      result: TechnicianFindingResult.risky,
      note: 'Sol on kapida boya tespit edildi.',
      evidenceAssets: [
        EvidenceAsset(
          id: 'paint-photo',
          workOrderId: task.workOrderId,
          taskId: task.taskId,
          fieldKey: 'left_front_door_photo',
          reportFieldKey: 'report.photos.left_front_door',
          evidenceType: 'image',
          title: 'Sol on kapi fotografi',
          localPath: 'local/left-front-door.jpg',
          remoteUrl: '',
          hash: 'demo-hash',
          capturedAt: DateTime(2026, 5, 24),
          uploadedAt: null,
          uploadedBy: 'tech-ahmet',
          syncStatus: EvidenceStatus.localOnly,
          isRequired: true,
          qualityStatus: 'unchecked',
          rejectionReason: '',
        ),
      ],
    );
    final conflictingTask = task.copyWith(
      status: TaskStatus.completed,
      checklistItems: [riskyItem, ...task.checklistItems.skip(1)],
      customerFriendlyNote: 'Arac sorunsuz olarak degerlendirildi.',
      evidenceAssets: const [],
    );
    final result = const ReportGateCalculator().calculate(
      workOrder: order.copyWith(
        tasks: [conflictingTask, ...order.tasks.skip(1)],
      ),
      syncQueue: const [],
    );

    expect(
      result.issues.map((issue) => issue.code),
      contains(ReportGateIssueCode.finalSummaryConflict),
    );
  });

  test('mudur iadesinde eski kayit silinmeden revizyon acilir', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final returned = task.returnedByManager('Fotograf acisi yetersiz.');

    expect(task.revisionNo, 1);
    expect(returned.revisionNo, 2);
    expect(returned.status, TaskStatus.managerReturned);
    expect(returned.checklistItems.length, task.checklistItems.length);
  });

  test('sahiplenilmis baslik baska usta tarafindan duzenlenememeli', () {
    _completeStartEvidence(repository);
    final claimed = repository.claimTask('wo-2026-0001', 'body-paint');
    final task =
        claimed.tasks.firstWhere((item) => item.taskId == 'body-paint');

    repository.switchCurrentUserForTest(_mehmetUser);

    expect(
      () => repository.updateTask(
        'wo-2026-0001',
        task.copyWith(customerFriendlyNote: 'Yetkisiz not.'),
      ),
      throwsStateError,
    );
  });

  test('owner usta gorevi birakinca baslik tekrar available olmali', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');

    final released = repository.releaseTask(
      'wo-2026-0001',
      'body-paint',
      'Mekanik kontrol onceligi nedeniyle havuza birakildi.',
    );
    final task =
        released.tasks.firstWhere((item) => item.taskId == 'body-paint');

    expect(task.ownerUserId, isNull);
    expect(task.claimedAt, isNull);
    expect(task.status, TaskStatus.available);
    expect(task.releaseReason, contains('havuza'));
    expect(task.releasedByUserId, repository.currentUser.id);
    expect(task.releasedAt, isNotNull);
  });

  test('releaseReason bossa birakma islemi kabul edilmemeli', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');

    expect(
      () => repository.releaseTask('wo-2026-0001', 'body-paint', '  '),
      throwsArgumentError,
    );
  });

  test('mudur baska ustaya atayabilmeli', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');
    repository.switchCurrentUserForTest(_managerUser);

    final assigned = repository.managerAssignTask(
      'wo-2026-0001',
      'body-paint',
      _mehmetUser.id,
      'Kaporta yogunlugu nedeniyle Mehmet Usta devralacak.',
    );
    final task =
        assigned.tasks.firstWhere((item) => item.taskId == 'body-paint');

    expect(task.ownerUserId, _mehmetUser.id);
    expect(task.assignedByManagerId, _managerUser.id);
    expect(task.managerAssignReason, contains('Mehmet'));
    expect(task.status, TaskStatus.open);
  });

  test('mudur sahipligi kaldirip basligi havuza alabilmeli', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');
    repository.switchCurrentUserForTest(_managerUser);

    final cleared = repository.managerClearTaskOwner(
      'wo-2026-0001',
      'body-paint',
      'Vardiya degisikligi nedeniyle havuza alindi.',
    );
    final task =
        cleared.tasks.firstWhere((item) => item.taskId == 'body-paint');

    expect(task.ownerUserId, isNull);
    expect(task.status, TaskStatus.available);
    expect(
      task.ownershipHistory.map((item) => item.eventType),
      contains(TaskOwnershipEventType.managerReleased),
    );
    expect(
        task.auditLog.map((item) => item.action), contains('manager_released'));
  });

  test('mudur teknik veri duzenleyememeli veya submit edememeli', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');
    repository.switchCurrentUserForTest(_managerUser);

    final task = repository
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((item) => item.taskId == 'body-paint');

    expect(task.canEditBy(_managerUser), isFalse);
    expect(
      () => repository.updateTask(
        'wo-2026-0001',
        task.copyWith(customerFriendlyNote: 'Mudur teknik not giremez.'),
      ),
      throwsStateError,
    );
    expect(
      () => repository.submitTask('wo-2026-0001', 'body-paint'),
      throwsStateError,
    );
  });

  test('usta baska ustaya dogrudan atama yapamamali', () {
    expect(
      () => repository.managerAssignTask(
        'wo-2026-0001',
        'body-paint',
        _mehmetUser.id,
        'Yetkisiz atama.',
      ),
      throwsStateError,
    );
  });

  test('ownershipHistory dogru kayit tutmali ve audit log olusmali', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'body-paint');
    repository.releaseTask(
      'wo-2026-0001',
      'body-paint',
      'Randevu sirasi degisti.',
    );
    final claimedAgain = repository.claimTask('wo-2026-0001', 'body-paint');
    final task = claimedAgain.tasks.firstWhere(
      (item) => item.taskId == 'body-paint',
    );

    expect(
      task.ownershipHistory.map((item) => item.eventType),
      containsAllInOrder([
        TaskOwnershipEventType.claimed,
        TaskOwnershipEventType.released,
        TaskOwnershipEventType.claimed,
      ]),
    );
    expect(
      task.auditLog.map((item) => item.action),
      containsAllInOrder(['claim', 'release', 'claim']),
    );
  });

  test('submit islemi audit log yazar', () {
    _completeStartEvidence(repository);
    repository.claimTask('wo-2026-0001', 'mechanic');

    final submitted = repository.submitTask('wo-2026-0001', 'mechanic');
    final task =
        submitted.tasks.firstWhere((item) => item.taskId == 'mechanic');

    expect(task.status, TaskStatus.evidenceMissing);
    expect(task.auditLog.map((item) => item.action), contains('submit'));
    expect(
      task.ownershipHistory.map((item) => item.eventType),
      contains(TaskOwnershipEventType.submitted),
    );
  });
}

const _mehmetUser = UserProfile(
  id: 'tech-mehmet',
  fullName: 'Mehmet Usta',
  email: 'mehmet.usta@ototr.test',
  phone: '0555 000 16 17',
  role: UserRole.inspectionTechnician,
  branchId: 'bursa-nilufer',
  isActive: true,
);

const _managerUser = UserProfile(
  id: 'manager-ayse',
  fullName: 'Ayse Mudur',
  email: 'ayse.mudur@ototr.test',
  phone: '0555 000 16 18',
  role: UserRole.branchManager,
  branchId: 'bursa-nilufer',
  isActive: true,
);

TechnicianWorkOrder _completeStartEvidence(
    DummyWorkOrderRepository repository) {
  return repository.saveStartEvidence(
    'wo-2026-0001',
    StartEvidence(
      workOrderId: 'wo-2026-0001',
      vin: 'WVWZZZ3CZEP005235',
      vinPhoto: 'local/vin.jpg',
      platePhoto: 'local/plate.jpg',
      odometerKm: 122450,
      odometerPhoto: 'local/km.jpg',
      capturedAt: DateTime(2026, 5, 24),
      capturedBy: repository.currentUser.id,
      deviceId: 'demo-device',
      gpsApprox: 'Bursa Nilufer',
    ),
  );
}
