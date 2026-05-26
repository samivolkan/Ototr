import '../models/technician_operation_model.dart';
import 'report_consistency_validator.dart';

class ReportGateCalculator {
  const ReportGateCalculator();

  ReportGateResult calculate({
    required TechnicianWorkOrder workOrder,
    required List<OfflineSyncQueue> syncQueue,
  }) {
    final issues = const ReportConsistencyValidator().validate(
      workOrder: workOrder,
      syncQueue: syncQueue,
    );
    final blockingReasons = _uniqueMessages(issues);
    final missingEvidence = _uniqueMessages(
      issues.where((issue) => issue.evidenceRelated),
    );
    final missingExternalQueries = _uniqueMessages(
      issues.where((issue) => issue.externalQueryRelated),
    );
    final pendingSyncItems = syncQueue
        .where((item) => item.status != SyncQueueStatus.synced)
        .toList();

    final status = _statusFor(
      issues: issues,
      missingExternalQueries: missingExternalQueries,
    );

    return ReportGateResult(
      isReady: blockingReasons.isEmpty,
      status: status,
      issues: issues,
      blockingReasons: blockingReasons,
      missingEvidence: missingEvidence,
      missingExternalQueries: missingExternalQueries,
      managerApprovalRequired: false,
      pendingSyncItems: pendingSyncItems,
      lastCalculatedAt: DateTime.now(),
    );
  }

  ReportGateStatus _statusFor({
    required List<ReportGateIssue> issues,
    required List<String> missingExternalQueries,
  }) {
    if (issues.isEmpty) {
      return ReportGateStatus.ready;
    }
    if (missingExternalQueries.isNotEmpty) {
      return ReportGateStatus.externalQueryPending;
    }
    return ReportGateStatus.blocked;
  }

  List<String> _uniqueMessages(Iterable<ReportGateIssue> issues) {
    return {for (final issue in issues) issue.message}.toList(growable: false);
  }
}
