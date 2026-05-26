import '../generated/inspection_schema_catalog.dart';
import '../models/technician_operation_model.dart';

class InspectionCatalogLookupService {
  const InspectionCatalogLookupService();

  String packageCodeFromName(String value) {
    final normalized = _normalize(value);
    if (normalized.isEmpty) {
      return 'STANDARD';
    }

    for (final package in inspectionPackageDefinitions) {
      if (_normalize(package.code) == normalized ||
          _normalize(package.name) == normalized) {
        return package.code;
      }
    }

    if (normalized.contains('PREMIUM') || normalized.contains('360')) {
      return 'PREMIUM';
    }
    if (normalized.contains('KURUMSAL') || normalized.contains('FILO')) {
      return 'CORPORATE';
    }
    if (normalized.contains('FULL')) {
      return 'FULL';
    }
    if (normalized.contains('STANDART') || normalized.contains('STANDARD')) {
      return 'STANDARD';
    }
    if (normalized.contains('ESNAF')) {
      return 'ESNAF';
    }
    if (normalized.contains('MINI')) {
      return 'MINI';
    }
    if (normalized.contains('KAPORTA') || normalized.contains('BOYA')) {
      return 'KAPORTA_BOYA';
    }
    if (normalized.contains('MEKANIK') || normalized.contains('MEKANİK')) {
      return 'MEKANIK';
    }
    if (normalized.contains('HIZLI')) {
      return 'HIZLI_KONTROL';
    }

    return 'STANDARD';
  }

  InspectionTaskCatalog? findTask({
    required String packageName,
    required String taskKey,
    required String title,
    required String reportFieldKey,
  }) {
    final packageCode = packageCodeFromName(packageName);
    final tasks = inspectionTaskCatalogForPackage(packageCode);
    return _findInTasks(
          tasks: tasks,
          taskKey: taskKey,
          title: title,
          reportFieldKey: reportFieldKey,
        ) ??
        _findInTasks(
          tasks: inspectionTaskCatalog,
          taskKey: taskKey,
          title: title,
          reportFieldKey: reportFieldKey,
        );
  }

  List<TechnicianChecklistItem> checklistItemsFor(
    InspectionTaskCatalog task,
  ) {
    return [
      for (final item in task.checklistItems) checklistItemFromCatalog(item),
    ];
  }

  TechnicianChecklistItem checklistItemFromCatalog(
    InspectionChecklistCatalogItem item,
  ) {
    return TechnicianChecklistItem(
      id: item.itemId,
      title: item.title,
      result: TechnicianFindingResult.normal,
      note: '',
      notDoneReason: '',
      reportFieldKey: item.reportFieldKey,
      requiresEvidenceOnRisk:
          item.requiresMediaOnRisk || item.requiresMediaAlways,
      evidenceAssets: const [],
    );
  }

  InspectionTaskCatalog? _findInTasks({
    required List<InspectionTaskCatalog> tasks,
    required String taskKey,
    required String title,
    required String reportFieldKey,
  }) {
    final expectedTypeCode = _taskTypeCodeFromKey(taskKey);
    if (expectedTypeCode != null) {
      final match = tasks.where((task) {
        return task.taskTypeCode == expectedTypeCode;
      }).firstOrNull;
      if (match != null) {
        return match;
      }
    }

    final normalizedKey = _normalize(taskKey);
    final normalizedTitle = _normalize(title);
    final normalizedReportKey = _normalize(reportFieldKey);

    return tasks.where((task) {
      return _normalize(task.taskId) == normalizedKey ||
          _normalize(task.taskTypeCode) == normalizedKey ||
          _normalize(task.title) == normalizedTitle ||
          (normalizedReportKey.isNotEmpty &&
              _normalize(task.reportFieldKey) == normalizedReportKey);
    }).firstOrNull;
  }

  String? _taskTypeCodeFromKey(String taskKey) {
    switch (_normalize(taskKey)) {
      case 'BODY_PAINT':
      case 'BODY_PAINT_CHECKUP':
        return 'BODY_PAINT_CHECKUP';
      case 'MECHANIC':
      case 'MOTOR':
      case 'MOTOR_CHECKUP':
        return 'MOTOR_CHECKUP';
      case 'UNDERBODY':
      case 'MECHANICAL':
      case 'MECHANICAL_CHECKUP':
        return 'MECHANICAL_CHECKUP';
      case 'OBD':
      case 'OBD_ECU':
      case 'OBD_ECU_TEST':
        return 'OBD_ECU_TEST';
      case 'BRAKE':
      case 'BRAKE_SUSPENSION':
      case 'BRAKE_SUSPENSION_TEST':
        return 'BRAKE_SUSPENSION_TEST';
      case 'DYNO':
      case 'ROAD_TEST':
      case 'DYNO_ROAD_TEST':
        return 'DYNO_ROAD_TEST';
      case 'EXTERIOR':
      case 'EXTERIOR_CONDITION':
        return 'EXTERIOR_CONDITION';
      case 'INTERIOR':
      case 'INTERIOR_CHECKUP':
        return 'INTERIOR_CHECKUP';
      case 'AIRBAG':
      case 'AIRBAG_CHECK':
        return 'AIRBAG_CHECK';
      case 'HEAD_GASKET':
      case 'HEAD_GASKET_LEAK_TEST':
        return 'HEAD_GASKET_LEAK_TEST';
    }
    return null;
  }

  String _normalize(String value) {
    return value
        .trim()
        .toUpperCase()
        .replaceAll('-', '_')
        .replaceAll('/', '_')
        .replaceAll(RegExp(r'\s+'), '_');
  }
}
