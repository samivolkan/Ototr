import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';

abstract class RemoteWorkOrderRepository {
  UserProfile get currentUser;

  TechnicianRole get currentTechnicianRole;

  Future<List<UserProfile>> activeTechnicians();

  Future<List<TechnicianWorkOrder>> visibleWorkOrders();

  Future<TechnicianWorkOrder> getById(String workOrderId);

  Future<TechnicianWorkOrder> claim(String workOrderId);

  Future<TechnicianWorkOrder> claimTask(String workOrderId, String taskId);

  Future<TechnicianWorkOrder> releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  Future<TechnicianWorkOrder> managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  );

  Future<TechnicianWorkOrder> managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  Future<TechnicianWorkOrder> saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  );

  Future<TechnicianWorkOrder> updateTask(
    String workOrderId,
    TechnicianTask task,
  );

  Future<TechnicianWorkOrder> submitTask(String workOrderId, String taskId);

  Future<List<OfflineSyncQueue>> syncQueue();
}
