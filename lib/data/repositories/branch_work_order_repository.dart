import '../models/customer_model.dart';
import '../models/package_plan_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';
import '../services/work_order_task_factory.dart';
import 'work_order_local_repository.dart';

abstract class BranchWorkOrderRepository {
  const BranchWorkOrderRepository();

  bool get isRemote;

  String get sourceLabel;

  Future<List<WorkOrder>> getAll();

  Future<WorkOrder?> getById(String id);

  Future<WorkOrder> create({
    required Customer customer,
    required Vehicle vehicle,
    required PackageType packageType,
    required String notes,
  });

  Future<WorkOrder> updateTaskStatus(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  );

  Future<WorkOrderSummary> summary() async {
    final orders = await getAll();
    return WorkOrderSummary(
      total: orders.length,
      active: orders
          .where((order) =>
              order.status != WorkOrderStatus.cancelled &&
              order.status != WorkOrderStatus.delivered)
          .length,
      missingData: orders.fold<int>(
        0,
        (total, order) => total + missingDataCount(order),
      ),
      completedTasks: orders.fold<int>(
        0,
        (total, order) =>
            total +
            order.tasks
                .where((task) => task.status == WorkOrderTaskStatus.completed)
                .length,
      ),
    );
  }

  int missingDataCount(WorkOrder order) {
    return calculateMissingDataCount(order);
  }
}

class LocalBranchWorkOrderRepository extends BranchWorkOrderRepository {
  const LocalBranchWorkOrderRepository(this._localRepository);

  final WorkOrderLocalRepository _localRepository;

  @override
  bool get isRemote => false;

  @override
  String get sourceLabel => 'Local demo';

  @override
  Future<List<WorkOrder>> getAll() async => _localRepository.getAll();

  @override
  Future<WorkOrder?> getById(String id) async => _localRepository.getById(id);

  @override
  Future<WorkOrder> create({
    required Customer customer,
    required Vehicle vehicle,
    required PackageType packageType,
    required String notes,
  }) async {
    return _localRepository.create(
      customer: customer,
      vehicle: vehicle,
      packageType: packageType,
      notes: notes,
    );
  }

  @override
  Future<WorkOrder> updateTaskStatus(
    String workOrderId,
    String taskId,
    WorkOrderTaskStatus status,
  ) async {
    return _localRepository.updateTaskStatus(workOrderId, taskId, status);
  }
}
