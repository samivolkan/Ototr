import '../generated/inspection_schema_catalog.dart';
import '../models/customer_model.dart';
import '../models/package_plan_model.dart';
import '../models/vehicle_model.dart';
import '../models/work_order_model.dart';
import 'inspection_catalog_lookup_service.dart';

class WorkOrderProgressCalculator {
  const WorkOrderProgressCalculator({
    InspectionCatalogLookupService catalogLookup =
        const InspectionCatalogLookupService(),
  }) : _catalogLookup = catalogLookup;

  final InspectionCatalogLookupService _catalogLookup;

  WorkOrderProgressSnapshot calculate(WorkOrder order) {
    final secretaryItems = _secretaryItems(order);
    final technicalItems = _technicalItems(order);
    final allItems = [...secretaryItems, ...technicalItems];
    final totalUnits = allItems.fold<int>(
      0,
      (total, item) => total + item.totalUnits,
    );
    final completedUnits = allItems.fold<int>(
      0,
      (total, item) => total + item.completedUnits,
    );
    final blockingItems = allItems.where((item) => item.isBlocking).toList();

    return WorkOrderProgressSnapshot(
      totalPercent: _percent(completedUnits, totalUnits),
      completedUnits: completedUnits,
      totalUnits: totalUnits,
      waitingOwnerLabel:
          blockingItems.isEmpty ? 'Tamamlandi' : blockingItems.first.ownerLabel,
      secretaryItems: secretaryItems,
      technicalItems: technicalItems,
      groups: _groupsFor(allItems),
    );
  }

  List<WorkOrderProgressItem> _secretaryItems(WorkOrder order) {
    return [
      _secretaryItem(
        title: 'Arac Bilgileri',
        isComplete: _vehicleReady(order.vehicle),
        detail: order.vehicle.plate.trim().isEmpty
            ? 'Plaka veya arac bilgisi bekliyor.'
            : '${order.vehicle.plate} - ${order.vehicle.displayName}',
      ),
      _secretaryItem(
        title: 'Alici Bilgileri',
        isComplete: _buyerReady(order.customer),
        detail: order.customer.fullName.trim().isEmpty
            ? 'Alici bilgisi bekliyor.'
            : '${order.customer.fullName} / ${order.customer.phone}',
      ),
      _secretaryItem(
        title: 'Satici Bilgileri',
        isComplete: order.vehicle.sellerType.trim().isNotEmpty,
        detail: order.vehicle.sellerType.trim().isEmpty
            ? 'Satici tipi veya beyan bekliyor.'
            : order.vehicle.sellerType,
      ),
      _secretaryItem(
        title: 'Hizmet / Paket Secimi',
        isComplete: order.packageApproved,
        detail: (order.packageType ?? PackageType.standard).label,
      ),
      _secretaryItem(
        title: 'Kabul Belgeleri ve Onaylar',
        isComplete: order.vehicleIntakeReady && order.customerConsentReady,
        detail: order.customerConsentReady
            ? 'KVKK ve hizmet onayi alindi.'
            : 'KVKK veya hizmet onayi bekliyor.',
      ),
      _secretaryItem(
        title: 'Odemeler',
        isComplete: order.paymentCompleted,
        detail: order.paymentCompleted
            ? 'Odeme tamamlandi.'
            : 'Tahsilat tamamlanmadi.',
      ),
    ];
  }

  WorkOrderProgressItem _secretaryItem({
    required String title,
    required bool isComplete,
    required String detail,
  }) {
    return WorkOrderProgressItem(
      title: title,
      ownerLabel: 'Sekreterya',
      completedUnits: isComplete ? 1 : 0,
      totalUnits: 1,
      statusLabel: isComplete ? 'Tamamlandi' : 'Bekliyor',
      detail: detail,
    );
  }

  List<WorkOrderProgressItem> _technicalItems(WorkOrder order) {
    return [
      for (final task in order.tasks)
        _technicalItem(
          task: task,
          packageType: order.packageType ?? PackageType.standard,
        ),
    ];
  }

  WorkOrderProgressItem _technicalItem({
    required WorkOrderTask task,
    required PackageType packageType,
  }) {
    final catalogTask = _catalogTaskFor(task, packageType);
    final totalUnits = catalogTask?.checklistItems.length ?? 1;
    final completedUnits = _completedUnitsFor(task, totalUnits);
    final owner = catalogTask?.owner ?? _ownerLabelFor(task.type);
    final detail = catalogTask == null
        ? task.type.code
        : '$owner - ${catalogTask.checklistItems.length} kontrol alani';

    return WorkOrderProgressItem(
      title: task.title,
      ownerLabel: _normalizeOwnerLabel(owner),
      completedUnits: completedUnits,
      totalUnits: totalUnits,
      statusLabel: task.status.label,
      detail: detail,
    );
  }

  InspectionTaskCatalog? _catalogTaskFor(
    WorkOrderTask task,
    PackageType packageType,
  ) {
    return _catalogLookup.findTask(
      packageName: packageType.label,
      taskKey: _catalogTaskKeyFor(task.type),
      title: task.title,
      reportFieldKey: '',
    );
  }

  int _completedUnitsFor(WorkOrderTask task, int totalUnits) {
    switch (task.status) {
      case WorkOrderTaskStatus.completed:
      case WorkOrderTaskStatus.cancelled:
        return totalUnits;
      case WorkOrderTaskStatus.inProgress:
        return totalUnits == 1 ? 0 : totalUnits ~/ 2;
      case WorkOrderTaskStatus.assigned:
      case WorkOrderTaskStatus.pending:
        return 0;
    }
  }

  List<WorkOrderProgressGroup> _groupsFor(List<WorkOrderProgressItem> items) {
    final grouped = <String, List<WorkOrderProgressItem>>{};
    for (final item in items) {
      grouped.putIfAbsent(item.ownerLabel, () => []).add(item);
    }
    return [
      for (final entry in grouped.entries)
        WorkOrderProgressGroup(
          ownerLabel: entry.key,
          completedUnits: entry.value.fold<int>(
            0,
            (total, item) => total + item.completedUnits,
          ),
          totalUnits: entry.value.fold<int>(
            0,
            (total, item) => total + item.totalUnits,
          ),
          items: entry.value,
        ),
    ];
  }

  bool _vehicleReady(Vehicle vehicle) {
    return vehicle.plate.trim().isNotEmpty &&
        vehicle.brand.trim().isNotEmpty &&
        vehicle.model.trim().isNotEmpty &&
        vehicle.year > 0 &&
        vehicle.kilometers >= 0;
  }

  bool _buyerReady(Customer customer) {
    return customer.fullName.trim().isNotEmpty &&
        customer.phone.trim().isNotEmpty;
  }

  String _catalogTaskKeyFor(TaskType type) {
    return switch (type) {
      TaskType.kaportaKontrol || TaskType.boyaKontrol => 'BODY_PAINT_CHECKUP',
      TaskType.motorKontrol => 'MOTOR_CHECKUP',
      TaskType.mekanikKontrol ||
      TaskType.altTakimKontrol =>
        'MECHANICAL_CHECKUP',
      TaskType.elektrikKontrol => 'OBD_ECU_TEST',
      TaskType.dynoTest => 'DYNO_ROAD_TEST',
      TaskType.frenKontrol => 'BRAKE_SUSPENSION_TEST',
      TaskType.icKondisyon => 'INTERIOR_CHECKUP',
      TaskType.genelFoto => 'EXTERIOR_CONDITION',
      TaskType.raporKontrol => 'REPORT_CHECK',
      TaskType.yoneticiOnay => 'MANAGER_APPROVAL',
    };
  }

  String _ownerLabelFor(TaskType type) {
    return switch (type) {
      TaskType.kaportaKontrol ||
      TaskType.boyaKontrol ||
      TaskType.genelFoto ||
      TaskType.icKondisyon =>
        'Kaporta Ustasi',
      TaskType.motorKontrol ||
      TaskType.mekanikKontrol ||
      TaskType.altTakimKontrol =>
        'Mekanik Usta',
      TaskType.elektrikKontrol => 'OBD Ustasi',
      TaskType.dynoTest || TaskType.frenKontrol => 'Test Operatoru',
      TaskType.raporKontrol => 'Sekreterya',
      TaskType.yoneticiOnay => 'Yonetici',
    };
  }

  String _normalizeOwnerLabel(String owner) {
    final normalized = owner.trim();
    if (normalized.isEmpty) {
      return 'Atanmamis';
    }
    return normalized;
  }

  int _percent(int completedUnits, int totalUnits) {
    if (totalUnits <= 0) {
      return 0;
    }
    return (completedUnits * 100 / totalUnits).round();
  }
}

class WorkOrderProgressSnapshot {
  const WorkOrderProgressSnapshot({
    required this.totalPercent,
    required this.completedUnits,
    required this.totalUnits,
    required this.waitingOwnerLabel,
    required this.secretaryItems,
    required this.technicalItems,
    required this.groups,
  });

  final int totalPercent;
  final int completedUnits;
  final int totalUnits;
  final String waitingOwnerLabel;
  final List<WorkOrderProgressItem> secretaryItems;
  final List<WorkOrderProgressItem> technicalItems;
  final List<WorkOrderProgressGroup> groups;
}

class WorkOrderProgressGroup {
  const WorkOrderProgressGroup({
    required this.ownerLabel,
    required this.completedUnits,
    required this.totalUnits,
    required this.items,
  });

  final String ownerLabel;
  final int completedUnits;
  final int totalUnits;
  final List<WorkOrderProgressItem> items;

  int get percent {
    if (totalUnits <= 0) {
      return 0;
    }
    return (completedUnits * 100 / totalUnits).round();
  }

  int get blockingCount {
    return items.where((item) => item.isBlocking).length;
  }
}

class WorkOrderProgressItem {
  const WorkOrderProgressItem({
    required this.title,
    required this.ownerLabel,
    required this.completedUnits,
    required this.totalUnits,
    required this.statusLabel,
    required this.detail,
  });

  final String title;
  final String ownerLabel;
  final int completedUnits;
  final int totalUnits;
  final String statusLabel;
  final String detail;

  int get percent {
    if (totalUnits <= 0) {
      return 0;
    }
    return (completedUnits * 100 / totalUnits).round();
  }

  bool get isBlocking => completedUnits < totalUnits;
}
