import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/technician_operation_model.dart';
import 'package:ototr_branch_app/data/models/user_profile_model.dart';
import 'package:ototr_branch_app/data/remote/work_order_remote_data_source.dart';
import 'package:ototr_branch_app/data/remote/work_order_remote_dto.dart';
import 'package:ototr_branch_app/data/repositories/supabase_work_order_repository.dart';
import 'package:ototr_branch_app/data/services/work_order_remote_mapper.dart';

void main() {
  test('remote bundle TechnicianWorkOrder modeline map edilir', () {
    final order = const WorkOrderRemoteMapper().toDomain(_bundle());

    expect(order.id, 'case-1');
    expect(order.number, 'WO-1');
    expect(order.status.name, 'technicalEntryOpen');
    expect(order.startEvidence?.isComplete, isTrue);
    expect(order.tasks.single.assignedRole, TechnicianRole.bodyPaint);
    expect(order.tasks.single.checklistItems.length, greaterThan(1));
    final riskyItem = order.tasks.single.checklistItems.firstWhere(
      (item) => item.id == 'left-front-door',
    );
    expect(riskyItem.result, TechnicianFindingResult.risky);
    expect(riskyItem.hasEvidence, isTrue);
    expect(order.tasks.single.evidenceAssets.single.fieldKey,
        'body_general_photo');
    expect(order.externalQueries.single.status, ExternalQueryStatus.ready);
  });

  test('remote item value bosken JSON katalog alt basliklari yuklenir', () {
    final order = const WorkOrderRemoteMapper().toDomain(
      _bundle(itemValues: const [], evidenceAssets: const []),
    );

    expect(order.tasks.single.checklistItems.length, greaterThan(20));
    expect(
      order.tasks.single.checklistItems
          .every((item) => item.reportFieldKey.isNotEmpty),
      isTrue,
    );
  });

  test('task remote payload alt baslik cevaplarini ayri tasir', () {
    final order = const WorkOrderRemoteMapper().toDomain(_bundle());
    final payload = const WorkOrderRemoteMapper().taskToRemote(
      order.tasks.single,
    );

    final itemValues = payload['__item_values'] as List<Object?>;

    expect(itemValues.length, order.tasks.single.checklistItems.length);
    expect((itemValues.last as Map)['item_key'], 'left-front-door');
    expect((itemValues.last as Map)['result'], 'RISKY');
    expect((itemValues.last as Map)['task_id'], 'task-body');
  });

  test('SupabaseWorkOrderRepository data source sonucunu domain modele cevirir',
      () async {
    final dataSource = _FakeWorkOrderRemoteDataSource(_bundle());
    final repository = SupabaseWorkOrderRepository(
      dataSource: dataSource,
      currentUser: _user,
      currentTechnicianRole: TechnicianRole.bodyPaint,
    );

    final orders = await repository.visibleWorkOrders();
    final technicians = await repository.activeTechnicians();
    final saved = await repository.saveStartEvidence(
      'case-1',
      StartEvidence(
        workOrderId: 'case-1',
        vin: 'WVWZZZ3CZLE000001',
        vinPhoto: 'remote/vin.jpg',
        platePhoto: 'remote/plate.jpg',
        odometerKm: 84500,
        odometerPhoto: 'remote/km.jpg',
        capturedAt: DateTime(2026, 5, 24, 10, 30),
        capturedBy: 'tech-1',
        deviceId: 'android-demo',
        gpsApprox: 'Bursa Nilüfer',
      ),
    );

    expect(orders.single.id, 'case-1');
    expect(technicians.single.fullName, 'Ahmet Usta');
    expect(saved.startEvidence?.vin, 'WVWZZZ3CZLE000001');
    expect(dataSource.lastStartEvidencePayload?['vin_photo_url'],
        'remote/vin.jpg');
  });

  test('task update remote payload SQL kolon adlarini kullanir', () async {
    final dataSource = _FakeWorkOrderRemoteDataSource(_bundle());
    final repository = SupabaseWorkOrderRepository(
      dataSource: dataSource,
      currentUser: _user,
      currentTechnicianRole: TechnicianRole.bodyPaint,
    );

    final order = await repository.getById('case-1');
    final task = order.tasks.single.copyWith(
      status: TaskStatus.completed,
      customerFriendlyNote: 'Sol ön kapıda boya işlemi tespit edildi.',
    );

    await repository.updateTask('case-1', task);

    expect(dataSource.lastTaskPayload?['status'], 'COMPLETED');
    expect(
      dataSource.lastTaskPayload?['customer_friendly_note'],
      'Sol ön kapıda boya işlemi tespit edildi.',
    );
  });
}

const _user = UserProfile(
  id: 'tech-1',
  fullName: 'Ahmet Usta',
  email: 'ahmet.usta@ototr.test',
  phone: '0555',
  role: UserRole.inspectionTechnician,
  branchId: 'branch-1',
  isActive: true,
);

WorkOrderRemoteBundle _bundle({
  List<InspectionItemValueRow>? itemValues,
  List<EvidenceAssetRow>? evidenceAssets,
}) {
  return WorkOrderRemoteBundle(
    caseRow: ExpertiseCaseRow.fromJson(const {
      'id': 'case-1',
      'work_order_no': 'WO-1',
      'report_no': 'R-1',
      'status': 'TECHNICAL_ENTRY_OPEN',
      'plate': '16 ABC 123',
      'vehicle_summary': '2020 Volkswagen Passat 1.5 TSI',
      'package_name': 'OTOTR Premium 360',
      'assigned_technician_id': 'tech-1',
      'manager_approved': false,
      'secretary_gate_ready': true,
      'payment_gate_ready': true,
      'kvkk_gate_ready': true,
    }),
    startEvidence: StartEvidenceRow.fromJson(const {
      'expertise_case_id': 'case-1',
      'vin': 'WVWZZZ3CZLE000001',
      'vin_photo_url': 'remote/vin.jpg',
      'plate_photo_url': 'remote/plate.jpg',
      'odometer_km': 84500,
      'odometer_photo_url': 'remote/km.jpg',
      'captured_at': '2026-05-24T10:30:00.000',
      'captured_by': 'tech-1',
      'device_id': 'android-demo',
      'gps_approx': 'Bursa Nilüfer',
    }),
    tasks: [
      InspectionTaskRow.fromJson(const {
        'id': 'task-body',
        'expertise_case_id': 'case-1',
        'task_key': 'body-paint',
        'title': 'Kaporta ve Boya Ekspertizi',
        'assigned_role': 'BODY_PAINT',
        'assigned_user_id': 'tech-1',
        'owner_user_id': 'tech-1',
        'claimed_at': '2026-05-24T10:31:00.000',
        'status': 'OPEN',
        'report_field_key': 'report.section.body_paint',
        'required_fields': ['customerFriendlyNote'],
        'risky_findings': ['left-front-door'],
        'customer_friendly_note': 'Sol ön kapıda boya işlemi tespit edildi.',
        'manager_return_reason': '',
        'revision_no': 1,
        'estimated_minutes': 15,
      }),
    ],
    itemValues: itemValues ??
        [
          InspectionItemValueRow.fromJson(const {
            'id': 'item-left-front-door',
            'expertise_case_id': 'case-1',
            'task_id': 'task-body',
            'item_key': 'left-front-door',
            'title': 'Sol Ön Kapı',
            'result': 'RISKY',
            'note': 'Boya tespit edildi.',
            'not_done_reason': '',
            'report_field_key': 'report.body_paint.left_front_door',
            'requires_evidence_on_risk': true,
            'severity': 1,
          }),
        ],
    evidenceAssets: evidenceAssets ??
        [
          EvidenceAssetRow.fromJson(const {
            'id': 'evidence-item',
            'expertise_case_id': 'case-1',
            'task_id': 'task-body',
            'item_value_id': 'item-left-front-door',
            'field_key': 'left_front_door_photo',
            'report_field_key': 'report.photos.left_front_door',
            'evidence_type': 'IMAGE',
            'title': 'Sol ön kapı fotoğrafı',
            'local_path': '',
            'remote_url': 'https://storage.test/left-front-door.jpg',
            'file_hash': 'hash-1',
            'sync_status': 'UPLOADED',
            'is_required': true,
            'quality_status': 'ACCEPTED',
            'rejection_reason': '',
            'captured_at': '2026-05-24T10:35:00.000',
            'uploaded_at': '2026-05-24T10:36:00.000',
            'captured_by': 'tech-1',
          }),
          EvidenceAssetRow.fromJson(const {
            'id': 'evidence-task',
            'expertise_case_id': 'case-1',
            'task_id': 'task-body',
            'item_value_id': '',
            'field_key': 'body_general_photo',
            'report_field_key': 'report.photos.body_general',
            'evidence_type': 'IMAGE',
            'title': 'Kaporta genel açı fotoğrafı',
            'local_path': '',
            'remote_url': 'https://storage.test/body-general.jpg',
            'file_hash': 'hash-2',
            'sync_status': 'UPLOADED',
            'is_required': true,
            'quality_status': 'ACCEPTED',
            'rejection_reason': '',
            'captured_at': '2026-05-24T10:34:00.000',
            'uploaded_at': '2026-05-24T10:36:00.000',
            'captured_by': 'tech-1',
          }),
        ],
    externalQueries: [
      ExternalQueryRow.fromJson(const {
        'id': 'query-km',
        'expertise_case_id': 'case-1',
        'query_type': 'KM geçmişi',
        'source': 'Portal entegrasyonu',
        'status': 'READY',
        'result_summary': 'Son kayıt: 84.500 km',
        'queried_at': '2026-05-24T10:20:00.000',
        'imported_to_report': true,
        'blocking_reason': '',
      }),
    ],
  );
}

class _FakeWorkOrderRemoteDataSource implements WorkOrderRemoteDataSource {
  _FakeWorkOrderRemoteDataSource(this.bundle);

  final WorkOrderRemoteBundle bundle;
  Map<String, Object?>? lastStartEvidencePayload;
  Map<String, Object?>? lastTaskPayload;

  @override
  Future<WorkOrderRemoteBundle> claimWorkOrder(String workOrderId) async {
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> claimTask(
      String workOrderId, String taskId) async {
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) async {
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    return bundle;
  }

  @override
  Future<List<UserProfile>> fetchActiveTechnicians() async {
    return const [_user];
  }

  @override
  Future<WorkOrderRemoteBundle> fetchWorkOrderById(String workOrderId) async {
    return bundle;
  }

  @override
  Future<List<WorkOrderRemoteBundle>> fetchVisibleWorkOrders() async {
    return [bundle];
  }

  @override
  Future<List<OfflineSyncQueue>> fetchSyncQueue() async {
    return const [];
  }

  @override
  Future<WorkOrderRemoteBundle> submitTask(
      String workOrderId, String taskId) async {
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> updateTask(
    String workOrderId,
    String taskId,
    Map<String, Object?> payload,
  ) async {
    lastTaskPayload = payload;
    return bundle;
  }

  @override
  Future<WorkOrderRemoteBundle> upsertStartEvidence(
    String workOrderId,
    Map<String, Object?> payload,
  ) async {
    lastStartEvidencePayload = payload;
    return bundle;
  }
}
