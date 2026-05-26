import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import '../remote/work_order_remote_data_source.dart';
import '../services/work_order_remote_mapper.dart';
import 'remote_work_order_repository.dart';

class SupabaseWorkOrderRepository implements RemoteWorkOrderRepository {
  const SupabaseWorkOrderRepository({
    required WorkOrderRemoteDataSource dataSource,
    required UserProfile currentUser,
    required TechnicianRole currentTechnicianRole,
    WorkOrderRemoteMapper mapper = const WorkOrderRemoteMapper(),
  })  : _dataSource = dataSource,
        _currentUser = currentUser,
        _currentTechnicianRole = currentTechnicianRole,
        _mapper = mapper;

  final WorkOrderRemoteDataSource _dataSource;
  final UserProfile _currentUser;
  final TechnicianRole _currentTechnicianRole;
  final WorkOrderRemoteMapper _mapper;

  @override
  UserProfile get currentUser => _currentUser;

  @override
  TechnicianRole get currentTechnicianRole => _currentTechnicianRole;

  @override
  Future<List<UserProfile>> activeTechnicians() {
    return _dataSource.fetchActiveTechnicians();
  }

  @override
  Future<List<TechnicianWorkOrder>> visibleWorkOrders({
    int? limit,
    int offset = 0,
  }) async {
    final bundles = await _dataSource.fetchVisibleWorkOrders(
      limit: limit,
      offset: offset,
    );
    return [
      for (final bundle in bundles) _mapper.toDomain(bundle),
    ];
  }

  @override
  Future<TechnicianWorkOrder> getById(String workOrderId) async {
    final bundle = await _dataSource.fetchWorkOrderById(workOrderId);
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> claim(String workOrderId) async {
    final bundle = await _dataSource.claimWorkOrder(workOrderId);
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> claimTask(
    String workOrderId,
    String taskId,
  ) async {
    final bundle = await _dataSource.claimTask(workOrderId, taskId);
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    final bundle = await _dataSource.releaseTask(
      workOrderId,
      taskId,
      releaseReason,
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  ) async {
    final bundle = await _dataSource.managerAssignTask(
      workOrderId,
      taskId,
      ownerUserId,
      managerAssignReason,
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  ) async {
    final bundle = await _dataSource.managerClearTaskOwner(
      workOrderId,
      taskId,
      releaseReason,
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  ) async {
    final bundle = await _dataSource.upsertStartEvidence(
      workOrderId,
      _mapper.startEvidenceToRemote(startEvidence),
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> updateTask(
    String workOrderId,
    TechnicianTask task,
  ) async {
    final bundle = await _dataSource.updateTask(
      workOrderId,
      task.taskId,
      _mapper.taskToRemote(task),
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> submitTask(
    String workOrderId,
    String taskId,
  ) async {
    final bundle = await _dataSource.submitTask(workOrderId, taskId);
    return _mapper.toDomain(bundle);
  }

  @override
  Future<TechnicianWorkOrder> saveFinalMediaAsset(
    String workOrderId,
    EvidenceAsset asset,
  ) async {
    final bundle = await _dataSource.upsertEvidenceAsset(
      workOrderId,
      _mapper.evidenceAssetToRemote(asset),
    );
    return _mapper.toDomain(bundle);
  }

  @override
  Future<List<OfflineSyncQueue>> syncQueue() {
    return _dataSource.fetchSyncQueue();
  }
}
