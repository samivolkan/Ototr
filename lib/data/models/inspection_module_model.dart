import 'inspection_checklist_item_model.dart';

enum ModuleStatus { pending, inProgress, completed, criticalFinding, notChecked }

extension ModuleStatusLabel on ModuleStatus {
  String get label {
    switch (this) {
      case ModuleStatus.pending:
        return 'Bekliyor';
      case ModuleStatus.inProgress:
        return 'Devam Ediyor';
      case ModuleStatus.completed:
        return 'Tamamlandı';
      case ModuleStatus.criticalFinding:
        return 'Kritik Bulgu';
      case ModuleStatus.notChecked:
        return 'Kontrol Edilmedi';
    }
  }
}

class InspectionModule {
  const InspectionModule({
    required this.id,
    required this.name,
    required this.status,
    required this.technician,
    required this.hasEvidence,
    required this.checklistItems,
  });

  final String id;
  final String name;
  final ModuleStatus status;
  final String technician;
  final bool hasEvidence;
  final List<InspectionChecklistItem> checklistItems;

  int get checklistCount => checklistItems.length;
  int get completedCount => checklistItems
      .where((item) => item.result != ChecklistResultStatus.notChecked)
      .length;
  int get criticalCount => checklistItems
      .where((item) => item.result == ChecklistResultStatus.critical)
      .length;
}
