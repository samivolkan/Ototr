enum ChecklistResultStatus { normal, attention, critical, notChecked }

extension ChecklistResultStatusLabel on ChecklistResultStatus {
  String get label {
    switch (this) {
      case ChecklistResultStatus.normal:
        return 'Normal';
      case ChecklistResultStatus.attention:
        return 'Dikkat';
      case ChecklistResultStatus.critical:
        return 'Kritik';
      case ChecklistResultStatus.notChecked:
        return 'Kontrol Edilemedi';
    }
  }
}

class InspectionChecklistItem {
  const InspectionChecklistItem({
    required this.id,
    required this.title,
    required this.result,
    required this.note,
    required this.photoRequired,
    required this.severity,
  });

  final String id;
  final String title;
  final ChecklistResultStatus result;
  final String note;
  final bool photoRequired;
  final int severity;
}
