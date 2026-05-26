import '../models/technician_operation_model.dart';
import '../models/work_order_model.dart';
import '../remote/work_order_remote_dto.dart';
import 'inspection_catalog_lookup_service.dart';

class WorkOrderRemoteMapper {
  const WorkOrderRemoteMapper({
    InspectionCatalogLookupService catalogLookup =
        const InspectionCatalogLookupService(),
  }) : _catalogLookup = catalogLookup;

  final InspectionCatalogLookupService _catalogLookup;

  TechnicianWorkOrder toDomain(WorkOrderRemoteBundle bundle) {
    final itemsByTaskId = _groupBy(
      bundle.itemValues,
      (item) => item.taskId,
    );
    final evidenceByTaskId = _groupBy(
      bundle.evidenceAssets.where((asset) => asset.itemValueId.isEmpty),
      (asset) => asset.taskId,
    );
    final evidenceByItemId = _groupBy(
      bundle.evidenceAssets.where((asset) => asset.itemValueId.isNotEmpty),
      (asset) => asset.itemValueId,
    );

    return TechnicianWorkOrder(
      id: bundle.caseRow.id,
      number: bundle.caseRow.workOrderNo,
      plate: bundle.caseRow.plate,
      vehicleSummary: bundle.caseRow.vehicleSummary,
      vehicleTransmission: bundle.caseRow.vehicleTransmission,
      packageName: bundle.caseRow.packageName,
      assignedRoles: bundle.tasks
          .map((task) => _roleFromRemote(task.assignedRole))
          .toSet()
          .toList(growable: false),
      status: _workOrderStatusFromRemote(bundle.caseRow.status),
      ownerUserId: bundle.caseRow.assignedTechnicianId,
      startEvidence: _startEvidenceFromRemote(bundle),
      tasks: [
        for (final task in bundle.tasks)
          _taskFromRemote(
            task,
            packageName: bundle.caseRow.packageName,
            itemRows: itemsByTaskId[task.id] ?? const [],
            taskEvidenceRows: evidenceByTaskId[task.id] ?? const [],
            evidenceByItemId: evidenceByItemId,
          ),
      ],
      externalQueries: [
        for (final query in bundle.externalQueries) _queryFromRemote(query),
      ],
      managerApproved: bundle.caseRow.managerApproved,
      secretaryGateReady: bundle.caseRow.secretaryGateReady,
      paymentGateReady: bundle.caseRow.paymentGateReady,
      kvkkGateReady: bundle.caseRow.kvkkGateReady,
      finalMediaAssets: [
        for (final evidence in bundle.evidenceAssets)
          if (_isFinalMediaEvidence(evidence)) _evidenceFromRemote(evidence),
      ],
    );
  }

  Map<String, Object?> startEvidenceToRemote(StartEvidence evidence) {
    return {
      'expertise_case_id': evidence.workOrderId,
      'vin': evidence.vin,
      'vin_photo_url': evidence.vinPhoto,
      'plate_photo_url': evidence.platePhoto,
      'odometer_km': evidence.odometerKm,
      'odometer_photo_url': evidence.odometerPhoto,
      'captured_at': evidence.capturedAt.toIso8601String(),
      'captured_by': evidence.capturedBy,
      'device_id': evidence.deviceId,
      'gps_approx': evidence.gpsApprox,
    };
  }

  Map<String, Object?> evidenceAssetToRemote(EvidenceAsset asset) {
    return {
      'id': asset.id,
      'expertise_case_id': asset.workOrderId,
      'task_id': asset.taskId.isEmpty ? null : asset.taskId,
      'field_key': asset.fieldKey,
      'report_field_key': asset.reportFieldKey,
      'evidence_type': asset.evidenceType.toUpperCase(),
      'title': asset.title,
      'local_path': asset.localPath,
      'remote_url': asset.remoteUrl,
      'file_hash': asset.hash,
      'sync_status': _evidenceStatusToRemote(asset.syncStatus),
      'is_required': asset.isRequired,
      'quality_status': _qualityStatusToRemote(asset.qualityStatus),
      'rejection_reason': asset.rejectionReason,
      'captured_at': asset.capturedAt.toIso8601String(),
      'uploaded_at': asset.uploadedAt?.toIso8601String(),
      'captured_by': asset.uploadedBy.isEmpty ? null : asset.uploadedBy,
    };
  }

  Map<String, Object?> taskToRemote(TechnicianTask task) {
    return {
      'id': task.taskId,
      'expertise_case_id': task.workOrderId,
      'task_key': task.taskId,
      'title': task.title,
      'assigned_role': _roleToRemote(task.assignedRole),
      'assigned_user_id': task.assignedUserId,
      'status': _taskStatusToRemote(task.status),
      'report_field_key': task.reportFieldKey,
      'required_fields': task.requiredFields,
      'risky_findings': task.riskyFindings,
      'customer_friendly_note': task.customerFriendlyNote,
      'manager_return_reason': task.managerReturnReason,
      'revision_no': task.revisionNo,
      'estimated_minutes': task.estimatedMinutes,
      'owner_user_id': task.ownerUserId,
      'claimed_at': task.claimedAt?.toIso8601String(),
      'release_reason': task.releaseReason,
      'released_by_user_id': task.releasedByUserId,
      'released_at': task.releasedAt?.toIso8601String(),
      'assigned_by_manager_id': task.assignedByManagerId,
      'manager_assign_reason': task.managerAssignReason,
      'ownership_history': [
        for (final item in task.ownershipHistory)
          _ownershipHistoryToRemote(item),
      ],
      'audit_log': [
        for (final item in task.auditLog) _auditLogToRemote(item),
      ],
      '__item_values': [
        for (final item in task.checklistItems)
          {
            'expertise_case_id': task.workOrderId,
            'task_id': task.taskId,
            'item_key': item.id,
            'title': item.title,
            'result': _findingResultToRemote(item.result),
            'note': item.note,
            'not_done_reason': item.notDoneReason,
            'report_field_key': item.reportFieldKey,
            'requires_evidence_on_risk': item.requiresEvidenceOnRisk,
            'severity': _severityFor(item.result),
          },
      ],
    };
  }

  StartEvidence _startEvidenceFromRemote(WorkOrderRemoteBundle bundle) {
    final row = bundle.startEvidence;
    if (row == null) {
      return StartEvidence(
        workOrderId: bundle.caseRow.id,
        vin: '',
        vinPhoto: '',
        platePhoto: '',
        odometerKm: null,
        odometerPhoto: '',
        capturedAt: DateTime.fromMillisecondsSinceEpoch(0),
        capturedBy: '',
        deviceId: '',
        gpsApprox: '',
      );
    }

    return StartEvidence(
      workOrderId: bundle.caseRow.id,
      vin: row.vin,
      vinPhoto: row.vinPhotoUrl,
      platePhoto: row.platePhotoUrl,
      odometerKm: row.odometerKm,
      odometerPhoto: row.odometerPhotoUrl,
      capturedAt: row.capturedAt,
      capturedBy: row.capturedBy,
      deviceId: row.deviceId,
      gpsApprox: row.gpsApprox,
    );
  }

  TechnicianTask _taskFromRemote(
    InspectionTaskRow row, {
    required String packageName,
    required List<InspectionItemValueRow> itemRows,
    required List<EvidenceAssetRow> taskEvidenceRows,
    required Map<String, List<EvidenceAssetRow>> evidenceByItemId,
  }) {
    final checklistItems = _checklistItemsFromRemote(
      row: row,
      packageName: packageName,
      itemRows: itemRows,
      evidenceByItemId: evidenceByItemId,
    );

    return TechnicianTask(
      taskId: row.id,
      workOrderId: row.expertiseCaseId,
      assignedRole: _roleFromRemote(row.assignedRole),
      assignedUserId: row.assignedUserId,
      title: row.title,
      status: _taskStatusFromRemote(row.status),
      checklistItems: checklistItems,
      requiredFields: row.requiredFields,
      riskyFindings: row.riskyFindings,
      customerFriendlyNote: row.customerFriendlyNote,
      reportFieldKey: row.reportFieldKey,
      evidenceAssets: [
        for (final evidence in taskEvidenceRows) _evidenceFromRemote(evidence),
      ],
      managerReturnReason: row.managerReturnReason,
      revisionNo: row.revisionNo,
      estimatedMinutes: row.estimatedMinutes,
      ownerUserId: row.ownerUserId,
      claimedAt: row.claimedAt,
      releaseReason: row.releaseReason,
      releasedByUserId: row.releasedByUserId,
      releasedAt: row.releasedAt,
      assignedByManagerId: row.assignedByManagerId,
      managerAssignReason: row.managerAssignReason,
      ownershipHistory: [
        for (final item in row.ownershipHistory)
          _ownershipHistoryFromRemote(item),
      ],
      auditLog: [
        for (final item in row.auditLog) _auditLogFromRemote(item),
      ],
    );
  }

  List<TechnicianChecklistItem> _checklistItemsFromRemote({
    required InspectionTaskRow row,
    required String packageName,
    required List<InspectionItemValueRow> itemRows,
    required Map<String, List<EvidenceAssetRow>> evidenceByItemId,
  }) {
    final remoteByItemKey = {
      for (final item in itemRows) item.itemKey: item,
    };
    final usedRemoteKeys = <String>{};
    final catalogTask = _catalogLookup.findTask(
      packageName: packageName,
      taskKey: row.taskKey,
      title: row.title,
      reportFieldKey: row.reportFieldKey,
    );

    final checklistItems = <TechnicianChecklistItem>[];
    if (catalogTask != null) {
      for (final catalogItem in catalogTask.checklistItems) {
        final remoteItem = remoteByItemKey[catalogItem.itemId];
        if (remoteItem == null) {
          checklistItems.add(_catalogLookup.checklistItemFromCatalog(
            catalogItem,
          ));
          continue;
        }

        usedRemoteKeys.add(remoteItem.itemKey);
        checklistItems.add(
          _itemFromRemote(
            remoteItem,
            evidenceByItemId[remoteItem.id] ?? const [],
          ),
        );
      }
    }

    for (final item in itemRows) {
      if (usedRemoteKeys.contains(item.itemKey)) {
        continue;
      }
      checklistItems.add(
        _itemFromRemote(item, evidenceByItemId[item.id] ?? const []),
      );
    }

    return checklistItems;
  }

  TaskOwnershipHistoryEntry _ownershipHistoryFromRemote(
    Map<String, Object?> json,
  ) {
    return TaskOwnershipHistoryEntry(
      eventType: _ownershipEventFromRemote(json['event_type']?.toString()),
      actorUserId: json['actor_user_id']?.toString() ?? '',
      ownerUserId: _emptyToNull(json['owner_user_id']?.toString()),
      previousOwnerUserId:
          _emptyToNull(json['previous_owner_user_id']?.toString()),
      reason: json['reason']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, Object?> _ownershipHistoryToRemote(
    TaskOwnershipHistoryEntry item,
  ) {
    return {
      'event_type': _ownershipEventToRemote(item.eventType),
      'actor_user_id': item.actorUserId,
      'owner_user_id': item.ownerUserId,
      'previous_owner_user_id': item.previousOwnerUserId,
      'reason': item.reason,
      'created_at': item.createdAt.toIso8601String(),
    };
  }

  TaskAuditLogEntry _auditLogFromRemote(Map<String, Object?> json) {
    return TaskAuditLogEntry(
      action: json['action']?.toString() ?? '',
      actorUserId: json['actor_user_id']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      note: json['note']?.toString() ?? '',
    );
  }

  Map<String, Object?> _auditLogToRemote(TaskAuditLogEntry item) {
    return {
      'action': item.action,
      'actor_user_id': item.actorUserId,
      'created_at': item.createdAt.toIso8601String(),
      'note': item.note,
    };
  }

  TechnicianChecklistItem _itemFromRemote(
    InspectionItemValueRow row,
    List<EvidenceAssetRow> evidenceRows,
  ) {
    return TechnicianChecklistItem(
      id: row.itemKey,
      title: row.title,
      result: _findingResultFromRemote(row.result),
      note: row.note,
      notDoneReason: row.notDoneReason,
      reportFieldKey: row.reportFieldKey,
      requiresEvidenceOnRisk: row.requiresEvidenceOnRisk,
      evidenceAssets: [
        for (final evidence in evidenceRows) _evidenceFromRemote(evidence),
      ],
      isAnswered: true,
    );
  }

  EvidenceAsset _evidenceFromRemote(EvidenceAssetRow row) {
    return EvidenceAsset(
      id: row.id,
      workOrderId: row.expertiseCaseId,
      taskId: row.taskId,
      fieldKey: row.fieldKey,
      reportFieldKey: row.reportFieldKey,
      evidenceType: row.evidenceType.toLowerCase(),
      title: row.title,
      localPath: row.localPath,
      remoteUrl: row.remoteUrl,
      hash: row.fileHash,
      capturedAt: row.capturedAt,
      uploadedAt: row.uploadedAt,
      uploadedBy: row.uploadedBy,
      syncStatus: _evidenceStatusFromRemote(row.syncStatus),
      isRequired: row.isRequired,
      qualityStatus: row.qualityStatus.toLowerCase(),
      rejectionReason: row.rejectionReason,
    );
  }

  bool _isFinalMediaEvidence(EvidenceAssetRow row) {
    return row.fieldKey == 'final_media' ||
        row.fieldKey.startsWith('final_media.') ||
        row.reportFieldKey == 'report.final_media' ||
        row.reportFieldKey.startsWith('report.final_media.');
  }

  ExternalQuery _queryFromRemote(ExternalQueryRow row) {
    return ExternalQuery(
      id: row.id,
      workOrderId: row.expertiseCaseId,
      type: row.queryType,
      source: row.source,
      status: _externalQueryStatusFromRemote(row.status),
      resultSummary: row.resultSummary,
      queriedAt: row.queriedAt,
      importedToReport: row.importedToReport,
      blockingReason: row.blockingReason,
    );
  }

  WorkOrderStatus _workOrderStatusFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'ASSIGNED':
        return WorkOrderStatus.assigned;
      case 'CLAIMED':
        return WorkOrderStatus.claimed;
      case 'START_EVIDENCE_REQUIRED':
        return WorkOrderStatus.startEvidenceRequired;
      case 'TECHNICAL_ENTRY_OPEN':
        return WorkOrderStatus.technicalEntryOpen;
      case 'SUBMITTED':
        return WorkOrderStatus.submitted;
      case 'MANAGER_REVIEW':
        return WorkOrderStatus.managerReview;
      case 'REPORT_GATE_BLOCKED':
        return WorkOrderStatus.reportGateBlocked;
      case 'REPORT_GATE_READY':
        return WorkOrderStatus.reportGateReady;
      case 'APPROVED':
        return WorkOrderStatus.approved;
      case 'DELIVERED':
        return WorkOrderStatus.delivered;
      case 'CANCELLED':
        return WorkOrderStatus.cancelled;
      default:
        return WorkOrderStatus.draft;
    }
  }

  TechnicianRole _roleFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'MECHANIC':
        return TechnicianRole.mechanic;
      case 'OBD':
        return TechnicianRole.obd;
      case 'TEST_OPERATOR':
        return TechnicianRole.testOperator;
      case 'FOREMAN':
        return TechnicianRole.foreman;
      case 'BRANCH_MANAGER':
        return TechnicianRole.branchManager;
      case 'BODY_PAINT':
      default:
        return TechnicianRole.bodyPaint;
    }
  }

  String _roleToRemote(TechnicianRole role) {
    switch (role) {
      case TechnicianRole.bodyPaint:
        return 'BODY_PAINT';
      case TechnicianRole.mechanic:
        return 'MECHANIC';
      case TechnicianRole.obd:
        return 'OBD';
      case TechnicianRole.testOperator:
        return 'TEST_OPERATOR';
      case TechnicianRole.foreman:
        return 'FOREMAN';
      case TechnicianRole.branchManager:
        return 'BRANCH_MANAGER';
    }
  }

  TaskStatus _taskStatusFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'AVAILABLE':
        return TaskStatus.available;
      case 'ASSIGNED':
        return TaskStatus.assigned;
      case 'OPEN':
        return TaskStatus.open;
      case 'COMPLETED':
        return TaskStatus.completed;
      case 'EVIDENCE_MISSING':
        return TaskStatus.evidenceMissing;
      case 'MANAGER_RETURNED':
        return TaskStatus.managerReturned;
      case 'CONFLICT_DETECTED':
        return TaskStatus.conflictDetected;
      case 'LOCKED':
      default:
        return TaskStatus.locked;
    }
  }

  String _taskStatusToRemote(TaskStatus status) {
    switch (status) {
      case TaskStatus.available:
        return 'AVAILABLE';
      case TaskStatus.assigned:
        return 'ASSIGNED';
      case TaskStatus.locked:
        return 'LOCKED';
      case TaskStatus.open:
        return 'OPEN';
      case TaskStatus.completed:
        return 'COMPLETED';
      case TaskStatus.evidenceMissing:
        return 'EVIDENCE_MISSING';
      case TaskStatus.managerReturned:
        return 'MANAGER_RETURNED';
      case TaskStatus.conflictDetected:
        return 'CONFLICT_DETECTED';
    }
  }

  TechnicianFindingResult _findingResultFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'RISKY':
        return TechnicianFindingResult.risky;
      case 'NOT_DONE':
        return TechnicianFindingResult.notDone;
      case 'NORMAL':
      default:
        return TechnicianFindingResult.normal;
    }
  }

  String _findingResultToRemote(TechnicianFindingResult value) {
    switch (value) {
      case TechnicianFindingResult.risky:
        return 'RISKY';
      case TechnicianFindingResult.notDone:
        return 'NOT_DONE';
      case TechnicianFindingResult.normal:
        return 'NORMAL';
    }
  }

  int _severityFor(TechnicianFindingResult value) {
    switch (value) {
      case TechnicianFindingResult.risky:
        return 2;
      case TechnicianFindingResult.notDone:
        return 1;
      case TechnicianFindingResult.normal:
        return 0;
    }
  }

  EvidenceStatus _evidenceStatusFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'LOCAL_ONLY':
        return EvidenceStatus.localOnly;
      case 'QUEUED':
        return EvidenceStatus.queued;
      case 'UPLOADED':
        return EvidenceStatus.uploaded;
      case 'REJECTED':
        return EvidenceStatus.rejected;
      case 'MISSING':
      default:
        return EvidenceStatus.missing;
    }
  }

  String _evidenceStatusToRemote(EvidenceStatus status) {
    switch (status) {
      case EvidenceStatus.localOnly:
        return 'LOCAL_ONLY';
      case EvidenceStatus.queued:
        return 'QUEUED';
      case EvidenceStatus.uploaded:
        return 'UPLOADED';
      case EvidenceStatus.rejected:
        return 'REJECTED';
      case EvidenceStatus.missing:
        return 'MISSING';
    }
  }

  String _qualityStatusToRemote(String status) {
    switch (status.trim().toUpperCase()) {
      case 'ACCEPTED':
      case 'REJECTED':
      case 'UNCHECKED':
        return status.trim().toUpperCase();
      case 'OK':
        return 'ACCEPTED';
      default:
        return 'UNCHECKED';
    }
  }

  ExternalQueryStatus _externalQueryStatusFromRemote(String value) {
    switch (value.toUpperCase()) {
      case 'READY':
        return ExternalQueryStatus.ready;
      case 'FAILED':
        return ExternalQueryStatus.failed;
      case 'PENDING':
      default:
        return ExternalQueryStatus.pending;
    }
  }

  TaskOwnershipEventType _ownershipEventFromRemote(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'RELEASED':
        return TaskOwnershipEventType.released;
      case 'MANAGER_RELEASED':
        return TaskOwnershipEventType.managerReleased;
      case 'MANAGER_REASSIGNED':
        return TaskOwnershipEventType.managerReassigned;
      case 'MANAGER_RETURNED':
        return TaskOwnershipEventType.managerReturned;
      case 'SUBMITTED':
        return TaskOwnershipEventType.submitted;
      case 'CLAIMED':
      default:
        return TaskOwnershipEventType.claimed;
    }
  }

  String _ownershipEventToRemote(TaskOwnershipEventType eventType) {
    switch (eventType) {
      case TaskOwnershipEventType.claimed:
        return 'CLAIMED';
      case TaskOwnershipEventType.released:
        return 'RELEASED';
      case TaskOwnershipEventType.managerReleased:
        return 'MANAGER_RELEASED';
      case TaskOwnershipEventType.managerReassigned:
        return 'MANAGER_REASSIGNED';
      case TaskOwnershipEventType.managerReturned:
        return 'MANAGER_RETURNED';
      case TaskOwnershipEventType.submitted:
        return 'SUBMITTED';
    }
  }

  String? _emptyToNull(String? value) {
    if (value == null || value.isEmpty) {
      return null;
    }
    return value;
  }

  Map<K, List<T>> _groupBy<T, K>(Iterable<T> values, K Function(T) keyOf) {
    final result = <K, List<T>>{};
    for (final value in values) {
      (result[keyOf(value)] ??= []).add(value);
    }
    return result;
  }
}
