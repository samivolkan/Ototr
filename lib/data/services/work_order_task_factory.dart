import '../models/package_plan_model.dart';
import '../models/work_order_model.dart';

List<WorkOrderTask> createTasksFromPackage(PackageType packageType) {
  final taskTypes = switch (packageType) {
    PackageType.standard => const [
        TaskType.kaportaKontrol,
        TaskType.boyaKontrol,
        TaskType.motorKontrol,
        TaskType.mekanikKontrol,
        TaskType.genelFoto,
        TaskType.raporKontrol,
      ],
    PackageType.full => const [
        TaskType.kaportaKontrol,
        TaskType.boyaKontrol,
        TaskType.motorKontrol,
        TaskType.mekanikKontrol,
        TaskType.elektrikKontrol,
        TaskType.altTakimKontrol,
        TaskType.frenKontrol,
        TaskType.genelFoto,
        TaskType.raporKontrol,
      ],
    PackageType.premium => const [
        TaskType.kaportaKontrol,
        TaskType.boyaKontrol,
        TaskType.motorKontrol,
        TaskType.mekanikKontrol,
        TaskType.elektrikKontrol,
        TaskType.dynoTest,
        TaskType.altTakimKontrol,
        TaskType.frenKontrol,
        TaskType.icKondisyon,
        TaskType.genelFoto,
        TaskType.raporKontrol,
        TaskType.yoneticiOnay,
      ],
    PackageType.kaportaBoya => const [
        TaskType.kaportaKontrol,
        TaskType.boyaKontrol,
        TaskType.genelFoto,
        TaskType.raporKontrol,
      ],
    PackageType.mekanik => const [
        TaskType.motorKontrol,
        TaskType.mekanikKontrol,
        TaskType.altTakimKontrol,
        TaskType.frenKontrol,
        TaskType.raporKontrol,
      ],
    PackageType.hizliKontrol => const [
        TaskType.genelFoto,
        TaskType.motorKontrol,
        TaskType.frenKontrol,
        TaskType.raporKontrol,
      ],
  };

  final createdAt = DateTime.now();
  return [
    for (var index = 0; index < taskTypes.length; index++)
      WorkOrderTask(
        id: '${packageType.code}-${taskTypes[index].code}-$index',
        type: taskTypes[index],
        title: taskTypes[index].label,
        status: WorkOrderTaskStatus.pending,
        isRequired: true,
        createdAt: createdAt,
      ),
  ];
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
