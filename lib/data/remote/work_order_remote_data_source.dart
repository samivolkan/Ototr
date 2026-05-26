import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';
import 'work_order_remote_dto.dart';

abstract class WorkOrderRemoteDataSource {
  Future<List<UserProfile>> fetchActiveTechnicians();

  Future<List<WorkOrderRemoteBundle>> fetchVisibleWorkOrders({
    int? limit,
    int offset = 0,
  });

  Future<WorkOrderRemoteBundle> fetchWorkOrderById(String workOrderId);

  Future<WorkOrderRemoteBundle> claimWorkOrder(String workOrderId);

  Future<WorkOrderRemoteBundle> claimTask(String workOrderId, String taskId);

  Future<WorkOrderRemoteBundle> releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  Future<WorkOrderRemoteBundle> managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  );

  Future<WorkOrderRemoteBundle> managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  Future<WorkOrderRemoteBundle> upsertStartEvidence(
    String workOrderId,
    Map<String, Object?> payload,
  );

  Future<WorkOrderRemoteBundle> updateTask(
    String workOrderId,
    String taskId,
    Map<String, Object?> payload,
  );

  Future<WorkOrderRemoteBundle> submitTask(String workOrderId, String taskId);

  Future<WorkOrderRemoteBundle> upsertEvidenceAsset(
    String workOrderId,
    Map<String, Object?> payload,
  );

  Future<List<OfflineSyncQueue>> fetchSyncQueue();
}
