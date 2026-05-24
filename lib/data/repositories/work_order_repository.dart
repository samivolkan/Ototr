import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';

abstract class WorkOrderRepository {
  UserProfile get currentUser;

  TechnicianRole get currentTechnicianRole;

  List<TechnicianWorkOrder> visibleWorkOrders();

  TechnicianWorkOrder getById(String workOrderId);

  TechnicianWorkOrder claim(String workOrderId);

  TechnicianWorkOrder saveStartEvidence(
    String workOrderId,
    StartEvidence startEvidence,
  );

  TechnicianWorkOrder updateTask(String workOrderId, TechnicianTask task);

  TechnicianWorkOrder submitTask(String workOrderId, String taskId);

  List<OfflineSyncQueue> syncQueue();

  void reset();
}
