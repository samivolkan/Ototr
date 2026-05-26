import '../generated/inspection_schema_catalog.dart';
import '../models/package_plan_model.dart';
import '../models/work_order_model.dart';

List<WorkOrderTask> createTasksFromPackage(PackageType packageType) {
  final createdAt = DateTime.now();
  final catalogTasks = inspectionTaskCatalogForPackage(packageType.code);
  final tasks = [
    for (var index = 0; index < catalogTasks.length; index++)
      WorkOrderTask(
        id: '${packageType.code}-${catalogTasks[index].taskTypeCode}-$index',
        type: _taskTypeFromInspectionGroup(catalogTasks[index].taskTypeCode),
        title: catalogTasks[index].title,
        status: WorkOrderTaskStatus.pending,
        isRequired: true,
        createdAt: createdAt,
      ),
  ];
  if ((packageType == PackageType.premium ||
          packageType == PackageType.corporate) &&
      !tasks.any((task) => task.type == TaskType.yoneticiOnay)) {
    tasks.add(
      WorkOrderTask(
        id: '${packageType.code}-${TaskType.yoneticiOnay.code}',
        type: TaskType.yoneticiOnay,
        title: 'Kalite ikinci kontrol / yönetici onayı',
        status: WorkOrderTaskStatus.pending,
        isRequired: true,
        createdAt: createdAt,
      ),
    );
  }
  tasks.add(
    WorkOrderTask(
      id: '${packageType.code}-${TaskType.raporKontrol.code}',
      type: TaskType.raporKontrol,
      title: 'Rapor kapısı kontrolü',
      status: WorkOrderTaskStatus.pending,
      isRequired: true,
      createdAt: createdAt,
    ),
  );
  return tasks;
}

TaskType _taskTypeFromInspectionGroup(String groupCode) {
  return switch (groupCode) {
    'BODY_PAINT_CHECKUP' => TaskType.kaportaKontrol,
    'MOTOR_CHECKUP' => TaskType.motorKontrol,
    'MECHANICAL_CHECKUP' => TaskType.mekanikKontrol,
    'OBD_ECU_TEST' || 'AIRBAG_CHECK' => TaskType.elektrikKontrol,
    'BRAKE_SUSPENSION_TEST' => TaskType.frenKontrol,
    'DYNO_ROAD_TEST' => TaskType.dynoTest,
    'INTERIOR_CHECKUP' => TaskType.icKondisyon,
    'EXTERIOR_CONDITION' => TaskType.genelFoto,
    'HEAD_GASKET_LEAK_TEST' => TaskType.motorKontrol,
    _ => TaskType.genelFoto,
  };
}

WorkOrderStatus calculateWorkOrderStatus(List<WorkOrderTask> tasks) {
  if (tasks.isEmpty) {
    return WorkOrderStatus.draft;
  }
  if (tasks.every((task) => task.status == WorkOrderTaskStatus.cancelled)) {
    return WorkOrderStatus.cancelled;
  }
  if (tasks
      .where((task) => task.status != WorkOrderTaskStatus.cancelled)
      .every((task) => task.status == WorkOrderTaskStatus.completed)) {
    return WorkOrderStatus.approvalWaiting;
  }
  if (tasks.any((task) => task.status == WorkOrderTaskStatus.inProgress)) {
    return WorkOrderStatus.inspectionInProgress;
  }
  if (tasks.any((task) => task.status == WorkOrderTaskStatus.assigned)) {
    return WorkOrderStatus.assigned;
  }
  return WorkOrderStatus.inspectionWaiting;
}

int calculateMissingDataCount(WorkOrder order) {
  var count = 0;
  if (order.customer.fullName.trim().isEmpty) count++;
  if (order.customer.phone.trim().isEmpty) count++;
  if (order.vehicle.plate.trim().isEmpty) count++;
  if (order.vehicle.brand.trim().isEmpty) count++;
  if (order.vehicle.model.trim().isEmpty) count++;
  if (order.vehicle.year <= 0) count++;
  if (order.vehicle.kilometers < 0) count++;
  count += order.tasks.where((task) {
    return task.isRequired &&
        task.status != WorkOrderTaskStatus.completed &&
        task.status != WorkOrderTaskStatus.cancelled;
  }).length;
  return count;
}

String generateWorkOrderNumber(DateTime date, Iterable<WorkOrder> orders) {
  final datePart = _yyyymmdd(date);
  final prefix = 'OTOTR-$datePart-';
  final nextSequence = orders
          .where((order) => order.number.startsWith(prefix))
          .map((order) => int.tryParse(order.number.split('-').last) ?? 0)
          .fold<int>(0, (max, current) => current > max ? current : max) +
      1;
  return '$prefix${nextSequence.toString().padLeft(4, '0')}';
}

String _yyyymmdd(DateTime date) {
  final year = date.year.toString().padLeft(4, '0');
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '$year$month$day';
}
