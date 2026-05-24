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

  test('assigned -> claimed geçişi çalışır', () {
    final claimed = repository.claim('wo-2026-0001');

    expect(claimed.status, WorkOrderStatus.claimed);
    expect(claimed.ownerUserId, repository.currentUser.id);
  });

  test('başlangıç kanıtı eksikken teknik modül açılmaz', () {
    final order = repository.getById('wo-2026-0001');

    expect(order.isStartEvidenceComplete, isFalse);
    expect(const RolePermissionService().canOpenTechnicalEntry(order), isFalse);
  });

  test('başlangıç kanıtı tamamken teknik modül açılır', () {
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
        gpsApprox: 'Bursa Nilüfer',
      ),
    );

    expect(order.status, WorkOrderStatus.technicalEntryOpen);
    expect(const RolePermissionService().canOpenTechnicalEntry(order), isTrue);
  });

  test('riskli bulguda fotoğraf olmadan gönderim engellenir', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final riskyItem = task.checklistItems.first.copyWith(
      result: TechnicianFindingResult.risky,
      note: 'Ön kaputta lokal boya tespit edildi.',
    );
    final nextTask = task.copyWith(checklistItems: [riskyItem, ...task.checklistItems.skip(1)]);

    expect(nextTask.canSubmit, isFalse);
    expect(nextTask.missingReasons().join(' '), contains('fotoğraf'));
  });

  test('yapılamayan testte neden yoksa gönderim engellenir', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final item = task.checklistItems.first.copyWith(
      result: TechnicianFindingResult.notDone,
    );
    final nextTask = task.copyWith(checklistItems: [item, ...task.checklistItems.skip(1)]);

    expect(nextTask.canSubmit, isFalse);
    expect(nextTask.missingReasons().join(' '), contains('nedeni'));
  });

  test('aynı idempotencyKey ile ikinci gönderim rapora tekrar yazılmaz', () async {
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

  test('role permission ile usta finans alanlarını göremez', () {
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
    expect(const RolePermissionService().shouldShowField(user, 'payment'), isFalse);
  });

  test('report gate eksik kanıtla blocked döner', () {
    final result = const ReportGateCalculator().calculate(
      workOrder: repository.getById('wo-2026-0001'),
      syncQueue: const [],
    );

    expect(result.isReady, isFalse);
    expect(result.blockingReasons, contains('Başlangıç kanıtı tamamlanmadı.'));
  });

  test('external query yoksa Dış sorgu bekliyor blokajı üretir', () {
    final order = repository.getById('wo-2026-0001').copyWith(
          externalQueries: const [],
        );
    final result = const ReportGateCalculator().calculate(
      workOrder: order,
      syncQueue: const [],
    );

    expect(result.isReady, isFalse);
    expect(result.blockingReasons.join(' '), contains('Dış sorgu bekliyor'));
  });

  test('müdür iadesinde eski kayıt silinmeden revizyon açılır', () {
    final task = repository.getById('wo-2026-0001').tasks.first;
    final returned = task.returnedByManager('Fotoğraf açısı yetersiz.');

    expect(task.revisionNo, 1);
    expect(returned.revisionNo, 2);
    expect(returned.status, TaskStatus.managerReturned);
    expect(returned.checklistItems.length, task.checklistItems.length);
  });
}
