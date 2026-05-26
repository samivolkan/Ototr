import '../models/technician_operation_model.dart';

class ReportMapper {
  const ReportMapper();

  Map<String, Object?> taskToReportSection(TechnicianTask task) {
    return {
      'sectionKey': task.reportFieldKey,
      'revisionNo': task.revisionNo,
      'customerFriendlyNote': task.customerFriendlyNote,
      'answers': [
        for (final item in task.checklistItems)
          {
            'reportFieldKey': item.reportFieldKey,
            'result': item.result.name,
            'note': item.note,
            'notDoneReason': item.notDoneReason,
          },
      ],
    };
  }

  Map<String, Object?> evidenceToPhotoIndex(EvidenceAsset evidence) {
    return {
      'workOrderId': evidence.workOrderId,
      'taskId': evidence.taskId,
      'fieldKey': evidence.fieldKey,
      'reportFieldKey': evidence.reportFieldKey,
      'evidenceType': evidence.evidenceType,
      'uploadedBy': evidence.uploadedBy,
      'capturedAt': evidence.capturedAt.toIso8601String(),
      'qualityStatus': evidence.qualityStatus,
    };
  }

  Map<String, Object?> externalQueryToDisclosure(ExternalQuery query) {
    return {
      'type': query.type,
      'source': query.source,
      'status': query.status.name,
      'resultSummary': query.resultSummary,
      'queriedAt': query.queriedAt?.toIso8601String(),
      'importedToReport': query.importedToReport,
      'blockingReason': query.blockingReason,
    };
  }
}
