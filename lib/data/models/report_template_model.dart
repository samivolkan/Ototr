enum ReportOptionColorType { green, red, orange, gray, neutral }

enum ReportOptionScoreType { positive, negative, warning, neutral }

enum ReportAnswerStatus { draft, completed }

enum FinalReportStatus { draft, locked }

class ReportTemplate {
  const ReportTemplate({
    required this.id,
    required this.name,
    required this.version,
    required this.sourceReportId,
    required this.isActive,
    required this.groups,
  });

  final String id;
  final String name;
  final String version;
  final String sourceReportId;
  final bool isActive;
  final List<ReportTemplateGroup> groups;

  int get totalItems =>
      groups.fold(0, (sum, group) => sum + group.items.length);

  List<ReportTemplateItem> get allItems => [
        for (final group in groups) ...group.items,
      ];

  ReportTemplateGroup groupById(String groupId) {
    return groups.firstWhere((group) => group.id == groupId);
  }

  ReportTemplateItem itemById(String itemId) {
    return allItems.firstWhere((item) => item.id == itemId);
  }
}

class ReportTemplateGroup {
  const ReportTemplateGroup({
    required this.id,
    required this.title,
    required this.code,
    required this.sortOrder,
    required this.pointInfo,
    required this.assignedRole,
    required this.items,
  });

  final String id;
  final String title;
  final String code;
  final int sortOrder;
  final String pointInfo;
  final String assignedRole;
  final List<ReportTemplateItem> items;
}

class ReportTemplateItem {
  const ReportTemplateItem({
    required this.id,
    required this.groupId,
    required this.noktaId,
    required this.title,
    required this.modalTitle,
    required this.sortOrder,
    required this.formUrl,
    required this.itemType,
    required this.hasOptions,
    required this.hasInputs,
    required this.hasDescription,
    required this.hasImages,
    required this.maxImages,
    required this.options,
    required this.inputFields,
  });

  final String id;
  final String groupId;
  final int noktaId;
  final String title;
  final String modalTitle;
  final int sortOrder;
  final String formUrl;
  final String itemType;
  final bool hasOptions;
  final bool hasInputs;
  final bool hasDescription;
  final bool hasImages;
  final int maxImages;
  final List<ReportTemplateOption> options;
  final List<ReportTemplateInputField> inputFields;

  bool get allowsMultipleOptions =>
      itemType.toLowerCase().contains('checkbox') ||
      options.any((option) => option.inputName.toLowerCase() == 'checkbox');

  bool get canBeCompletedWithoutOption => !hasOptions && hasInputs;

  ReportTemplateOption? get defaultPositiveOption {
    for (final option in options) {
      if (option.scoreType == ReportOptionScoreType.positive) {
        return option;
      }
    }
    return options.isEmpty ? null : options.first;
  }
}

class ReportTemplateOption {
  const ReportTemplateOption({
    required this.id,
    required this.itemId,
    required this.secenekId,
    required this.label,
    required this.sortOrder,
    required this.inputName,
    required this.className,
    required this.colorType,
    required this.scoreType,
    required this.isDefault,
    required this.disabled,
  });

  final String id;
  final String itemId;
  final int? secenekId;
  final String label;
  final int sortOrder;
  final String inputName;
  final String className;
  final ReportOptionColorType colorType;
  final ReportOptionScoreType scoreType;
  final bool isDefault;
  final bool disabled;
}

class ReportTemplateInputField {
  const ReportTemplateInputField({
    required this.id,
    required this.itemId,
    required this.type,
    required this.name,
    required this.label,
    required this.placeholder,
    required this.value,
    required this.sortOrder,
    required this.required,
  });

  final String id;
  final String itemId;
  final String type;
  final String name;
  final String label;
  final String placeholder;
  final String value;
  final int sortOrder;
  final bool required;
}

class WorkOrderReportAnswer {
  const WorkOrderReportAnswer({
    required this.id,
    required this.workOrderId,
    required this.templateId,
    required this.groupId,
    required this.itemId,
    required this.noktaId,
    required this.selectedOptionIds,
    required this.selectedOptionLabels,
    required this.inputValues,
    required this.description,
    required this.imageUrls,
    required this.status,
    required this.answeredByUserId,
    required this.answeredByRole,
    required this.startedAt,
    required this.completedAt,
    required this.updatedAt,
    required this.lockedByUserId,
    required this.lockedAt,
  });

  final String id;
  final String workOrderId;
  final String templateId;
  final String groupId;
  final String itemId;
  final int noktaId;
  final List<String> selectedOptionIds;
  final List<String> selectedOptionLabels;
  final Map<String, String> inputValues;
  final String description;
  final List<String> imageUrls;
  final ReportAnswerStatus status;
  final String answeredByUserId;
  final String answeredByRole;
  final DateTime startedAt;
  final DateTime? completedAt;
  final DateTime updatedAt;
  final String? lockedByUserId;
  final DateTime? lockedAt;

  bool get isCompleted => status == ReportAnswerStatus.completed;

  WorkOrderReportAnswer copyWith({
    List<String>? selectedOptionIds,
    List<String>? selectedOptionLabels,
    Map<String, String>? inputValues,
    String? description,
    List<String>? imageUrls,
    ReportAnswerStatus? status,
    DateTime? completedAt,
    DateTime? updatedAt,
    String? lockedByUserId,
    DateTime? lockedAt,
  }) {
    return WorkOrderReportAnswer(
      id: id,
      workOrderId: workOrderId,
      templateId: templateId,
      groupId: groupId,
      itemId: itemId,
      noktaId: noktaId,
      selectedOptionIds: selectedOptionIds ?? this.selectedOptionIds,
      selectedOptionLabels: selectedOptionLabels ?? this.selectedOptionLabels,
      inputValues: inputValues ?? this.inputValues,
      description: description ?? this.description,
      imageUrls: imageUrls ?? this.imageUrls,
      status: status ?? this.status,
      answeredByUserId: answeredByUserId,
      answeredByRole: answeredByRole,
      startedAt: startedAt,
      completedAt: completedAt ?? this.completedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lockedByUserId: lockedByUserId ?? this.lockedByUserId,
      lockedAt: lockedAt ?? this.lockedAt,
    );
  }
}

class ReportGroupProgress {
  const ReportGroupProgress({
    required this.groupId,
    required this.totalItems,
    required this.answeredItems,
    required this.completedItems,
    required this.progressPercent,
    required this.status,
    required this.assignedRole,
    required this.assignedUserId,
  });

  final String groupId;
  final int totalItems;
  final int answeredItems;
  final int completedItems;
  final int progressPercent;
  final String status;
  final String assignedRole;
  final String assignedUserId;
}

class FinalReportSection {
  const FinalReportSection({
    required this.group,
    required this.rows,
    required this.missingItems,
  });

  final ReportTemplateGroup group;
  final List<FinalReportRow> rows;
  final List<ReportTemplateItem> missingItems;
}

class FinalReportRow {
  const FinalReportRow({
    required this.item,
    required this.answer,
  });

  final ReportTemplateItem item;
  final WorkOrderReportAnswer answer;
}

class FinalReportDraft {
  const FinalReportDraft({
    required this.workOrderId,
    required this.templateId,
    required this.sections,
    required this.createdAt,
    required this.isComplete,
    required this.completedCount,
    required this.totalCount,
  });

  final String workOrderId;
  final String templateId;
  final List<FinalReportSection> sections;
  final DateTime createdAt;
  final bool isComplete;
  final int completedCount;
  final int totalCount;

  int get missingCount =>
      sections.fold(0, (sum, section) => sum + section.missingItems.length);

  bool get canLock => isComplete && totalCount > 0;

  Map<String, Object?> toPayload() {
    return {
      'workOrderId': workOrderId,
      'templateId': templateId,
      'createdAt': createdAt.toIso8601String(),
      'completedCount': completedCount,
      'totalCount': totalCount,
      'missingCount': missingCount,
      'sections': [
        for (final section in sections)
          {
            'groupId': section.group.id,
            'groupTitle': section.group.title,
            'rows': [
              for (final row in section.rows)
                {
                  'itemId': row.item.id,
                  'noktaId': row.item.noktaId,
                  'title': row.item.title,
                  'selectedOptionLabels': row.answer.selectedOptionLabels,
                  'inputValues': row.answer.inputValues,
                  'description': row.answer.description,
                  'imageUrls': row.answer.imageUrls,
                  'answeredByUserId': row.answer.answeredByUserId,
                  'answeredByRole': row.answer.answeredByRole,
                  'completedAt': row.answer.completedAt?.toIso8601String(),
                },
            ],
            'missingItems': [
              for (final item in section.missingItems)
                {
                  'itemId': item.id,
                  'noktaId': item.noktaId,
                  'title': item.title,
                },
            ],
          },
      ],
    };
  }
}

class FinalReportRecord {
  const FinalReportRecord({
    required this.id,
    required this.workOrderId,
    required this.templateId,
    required this.revisionNo,
    required this.status,
    required this.payload,
    required this.createdAt,
    required this.lockedAt,
  });

  final String id;
  final String workOrderId;
  final String templateId;
  final int revisionNo;
  final FinalReportStatus status;
  final Map<String, Object?> payload;
  final DateTime createdAt;
  final DateTime? lockedAt;

  bool get isLocked => status == FinalReportStatus.locked;
}
