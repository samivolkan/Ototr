import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';

abstract class WorkOrderRepository {
  UserProfile get currentUser;

  TechnicianRole get currentTechnicianRole;

  List<UserProfile> activeTechnicians();

  List<TechnicianWorkOrder> visibleWorkOrders();

  TechnicianWorkOrder getById(String workOrderId);

  TechnicianWorkOrder claim(String workOrderId);

  TechnicianWorkOrder claimTask(String workOrderId, String taskId);

  TechnicianWorkOrder releaseTask(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  TechnicianWorkOrder managerAssignTask(
    String workOrderId,
    String taskId,
    String ownerUserId,
    String managerAssignReason,
  );

  TechnicianWorkOrder managerClearTaskOwner(
    String workOrderId,
    String taskId,
    String releaseReason,
  );

  TechnicianWorkOrder saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  );

  TechnicianWorkOrder updateTask(String workOrderId, TechnicianTask task);

  TechnicianWorkOrder submitTask(String workOrderId, String taskId);

  TechnicianWorkOrder saveFinalMediaAsset(
    String workOrderId,
    EvidenceAsset asset,
  );

  List<OfflineSyncQueue> syncQueue();

  void reset();
}
