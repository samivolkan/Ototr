class WorkOrderRemoteBundle {
  const WorkOrderRemoteBundle({
    required this.caseRow,
    required this.tasks,
    required this.itemValues,
    required this.evidenceAssets,
    required this.externalQueries,
    this.startEvidence,
  });

  final ExpertiseCaseRow caseRow;
  final StartEvidenceRow? startEvidence;
  final List<InspectionTaskRow> tasks;
  final List<InspectionItemValueRow> itemValues;
  final List<EvidenceAssetRow> evidenceAssets;
  final List<ExternalQueryRow> externalQueries;
}

class ExpertiseCaseRow {
  const ExpertiseCaseRow({
    required this.id,
    required this.workOrderNo,
    required this.reportNo,
    required this.status,
    required this.plate,
    required this.vehicleSummary,
    required this.vehicleTransmission,
    required this.packageName,
    required this.assignedTechnicianId,
    required this.managerApproved,
    required this.secretaryGateReady,
    required this.paymentGateReady,
    required this.kvkkGateReady,
  });

  factory ExpertiseCaseRow.fromJson(Map<String, Object?> json) {
    return ExpertiseCaseRow(
      id: _readString(json, 'id'),
      workOrderNo: _readString(json, 'work_order_no'),
      reportNo: _readString(json, 'report_no'),
      status: _readString(json, 'status', fallback: 'DRAFT'),
      plate: _readString(json, 'plate'),
      vehicleSummary: _readString(json, 'vehicle_summary'),
      vehicleTransmission: _readString(json, 'vehicle_transmission'),
      packageName: _readString(json, 'package_name'),
      assignedTechnicianId: _readString(json, 'assigned_technician_id'),
      managerApproved: _readBool(json, 'manager_approved'),
      secretaryGateReady: _readBool(json, 'secretary_gate_ready'),
      paymentGateReady: _readBool(json, 'payment_gate_ready'),
      kvkkGateReady: _readBool(json, 'kvkk_gate_ready'),
    );
  }

  final String id;
  final String workOrderNo;
  final String reportNo;
  final String status;
  final String plate;
  final String vehicleSummary;
  final String vehicleTransmission;
  final String packageName;
  final String assignedTechnicianId;
  final bool managerApproved;
  final bool secretaryGateReady;
  final bool paymentGateReady;
  final bool kvkkGateReady;
}

class StartEvidenceRow {
  const StartEvidenceRow({
    required this.expertiseCaseId,
    required this.vin,
    required this.vinPhotoUrl,
    required this.platePhotoUrl,
    required this.odometerKm,
    required this.odometerPhotoUrl,
    required this.capturedAt,
    required this.capturedBy,
    required this.deviceId,
    required this.gpsApprox,
  });

  factory StartEvidenceRow.fromJson(Map<String, Object?> json) {
    return StartEvidenceRow(
      expertiseCaseId: _readString(json, 'expertise_case_id'),
      vin: _readString(json, 'vin'),
      vinPhotoUrl: _readString(json, 'vin_photo_url'),
      platePhotoUrl: _readString(json, 'plate_photo_url'),
      odometerKm: _readIntOrNull(json, 'odometer_km'),
      odometerPhotoUrl: _readString(json, 'odometer_photo_url'),
      capturedAt: _readDate(json, 'captured_at'),
      capturedBy: _readString(json, 'captured_by'),
      deviceId: _readString(json, 'device_id'),
      gpsApprox: _readString(json, 'gps_approx'),
    );
  }

  final String expertiseCaseId;
  final String vin;
  final String vinPhotoUrl;
  final String platePhotoUrl;
  final int? odometerKm;
  final String odometerPhotoUrl;
  final DateTime capturedAt;
  final String capturedBy;
  final String deviceId;
  final String gpsApprox;
}

class InspectionTaskRow {
  const InspectionTaskRow({
    required this.id,
    required this.expertiseCaseId,
    required this.taskKey,
    required this.title,
    required this.assignedRole,
    required this.assignedUserId,
    required this.status,
    required this.reportFieldKey,
    required this.requiredFields,
    required this.riskyFindings,
    required this.customerFriendlyNote,
    required this.managerReturnReason,
    required this.revisionNo,
    required this.estimatedMinutes,
    required this.ownerUserId,
    required this.claimedAt,
    required this.releaseReason,
    required this.releasedByUserId,
    required this.releasedAt,
    required this.assignedByManagerId,
    required this.managerAssignReason,
    required this.ownershipHistory,
    required this.auditLog,
  });

  factory InspectionTaskRow.fromJson(Map<String, Object?> json) {
    return InspectionTaskRow(
      id: _readString(json, 'id'),
      expertiseCaseId: _readString(json, 'expertise_case_id'),
      taskKey: _readString(json, 'task_key'),
      title: _readString(json, 'title'),
      assignedRole: _readString(json, 'assigned_role'),
      assignedUserId: _readString(json, 'assigned_user_id'),
      status: _readString(json, 'status', fallback: 'LOCKED'),
      reportFieldKey: _readString(json, 'report_field_key'),
      requiredFields: _readStringList(json, 'required_fields'),
      riskyFindings: _readStringList(json, 'risky_findings'),
      customerFriendlyNote: _readString(json, 'customer_friendly_note'),
      managerReturnReason: _readString(json, 'manager_return_reason'),
      revisionNo: _readInt(json, 'revision_no', fallback: 1),
      estimatedMinutes: _readInt(json, 'estimated_minutes'),
      ownerUserId: _readStringOrNull(json, 'owner_user_id'),
      claimedAt: _readDateOrNull(json, 'claimed_at'),
      releaseReason: _readString(json, 'release_reason'),
      releasedByUserId: _readStringOrNull(json, 'released_by_user_id'),
      releasedAt: _readDateOrNull(json, 'released_at'),
      assignedByManagerId: _readStringOrNull(json, 'assigned_by_manager_id'),
      managerAssignReason: _readString(json, 'manager_assign_reason'),
      ownershipHistory: _readMapList(json, 'ownership_history'),
      auditLog: _readMapList(json, 'audit_log'),
    );
  }

  final String id;
  final String expertiseCaseId;
  final String taskKey;
  final String title;
  final String assignedRole;
  final String assignedUserId;
  final String status;
  final String reportFieldKey;
  final List<String> requiredFields;
  final List<String> riskyFindings;
  final String customerFriendlyNote;
  final String managerReturnReason;
  final int revisionNo;
  final int estimatedMinutes;
  final String? ownerUserId;
  final DateTime? claimedAt;
  final String releaseReason;
  final String? releasedByUserId;
  final DateTime? releasedAt;
  final String? assignedByManagerId;
  final String managerAssignReason;
  final List<Map<String, Object?>> ownershipHistory;
  final List<Map<String, Object?>> auditLog;
}

class InspectionItemValueRow {
  const InspectionItemValueRow({
    required this.id,
    required this.expertiseCaseId,
    required this.taskId,
    required this.itemKey,
    required this.title,
    required this.result,
    required this.note,
    required this.notDoneReason,
    required this.reportFieldKey,
    required this.requiresEvidenceOnRisk,
    required this.severity,
  });

  factory InspectionItemValueRow.fromJson(Map<String, Object?> json) {
    return InspectionItemValueRow(
      id: _readString(json, 'id'),
      expertiseCaseId: _readString(json, 'expertise_case_id'),
      taskId: _readString(json, 'task_id'),
      itemKey: _readString(json, 'item_key'),
      title: _readString(json, 'title'),
      result: _readString(json, 'result', fallback: 'NORMAL'),
      note: _readString(json, 'note'),
      notDoneReason: _readString(json, 'not_done_reason'),
      reportFieldKey: _readString(json, 'report_field_key'),
      requiresEvidenceOnRisk: _readBool(json, 'requires_evidence_on_risk'),
      severity: _readInt(json, 'severity'),
    );
  }

  final String id;
  final String expertiseCaseId;
  final String taskId;
  final String itemKey;
  final String title;
  final String result;
  final String note;
  final String notDoneReason;
  final String reportFieldKey;
  final bool requiresEvidenceOnRisk;
  final int severity;
}

class EvidenceAssetRow {
  const EvidenceAssetRow({
    required this.id,
    required this.expertiseCaseId,
    required this.taskId,
    required this.itemValueId,
    required this.fieldKey,
    required this.reportFieldKey,
    required this.evidenceType,
    required this.title,
    required this.localPath,
    required this.remoteUrl,
    required this.fileHash,
    required this.syncStatus,
    required this.isRequired,
    required this.qualityStatus,
    required this.rejectionReason,
    required this.capturedAt,
    required this.uploadedAt,
    required this.uploadedBy,
  });

  factory EvidenceAssetRow.fromJson(Map<String, Object?> json) {
    return EvidenceAssetRow(
      id: _readString(json, 'id'),
      expertiseCaseId: _readString(json, 'expertise_case_id'),
      taskId: _readString(json, 'task_id'),
      itemValueId: _readString(json, 'item_value_id'),
      fieldKey: _readString(json, 'field_key'),
      reportFieldKey: _readString(json, 'report_field_key'),
      evidenceType: _readString(json, 'evidence_type', fallback: 'IMAGE'),
      title: _readString(json, 'title'),
      localPath: _readString(json, 'local_path'),
      remoteUrl: _readString(json, 'remote_url'),
      fileHash: _readString(json, 'file_hash'),
      syncStatus: _readString(json, 'sync_status', fallback: 'MISSING'),
      isRequired: _readBool(json, 'is_required'),
      qualityStatus: _readString(json, 'quality_status', fallback: 'UNCHECKED'),
      rejectionReason: _readString(json, 'rejection_reason'),
      capturedAt: _readDate(json, 'captured_at'),
      uploadedAt: _readDateOrNull(json, 'uploaded_at'),
      uploadedBy: _readString(json, 'captured_by'),
    );
  }

  final String id;
  final String expertiseCaseId;
  final String taskId;
  final String itemValueId;
  final String fieldKey;
  final String reportFieldKey;
  final String evidenceType;
  final String title;
  final String localPath;
  final String remoteUrl;
  final String fileHash;
  final String syncStatus;
  final bool isRequired;
  final String qualityStatus;
  final String rejectionReason;
  final DateTime capturedAt;
  final DateTime? uploadedAt;
  final String uploadedBy;
}

class ExternalQueryRow {
  const ExternalQueryRow({
    required this.id,
    required this.expertiseCaseId,
    required this.queryType,
    required this.source,
    required this.status,
    required this.resultSummary,
    required this.queriedAt,
    required this.importedToReport,
    required this.blockingReason,
  });

  factory ExternalQueryRow.fromJson(Map<String, Object?> json) {
    return ExternalQueryRow(
      id: _readString(json, 'id'),
      expertiseCaseId: _readString(json, 'expertise_case_id'),
      queryType: _readString(json, 'query_type'),
      source: _readString(json, 'source'),
      status: _readString(json, 'status', fallback: 'PENDING'),
      resultSummary: _readString(json, 'result_summary'),
      queriedAt: _readDateOrNull(json, 'queried_at'),
      importedToReport: _readBool(json, 'imported_to_report'),
      blockingReason: _readString(json, 'blocking_reason'),
    );
  }

  final String id;
  final String expertiseCaseId;
  final String queryType;
  final String source;
  final String status;
  final String resultSummary;
  final DateTime? queriedAt;
  final bool importedToReport;
  final String blockingReason;
}

String _readString(
  Map<String, Object?> json,
  String key, {
  String fallback = '',
}) {
  final value = json[key];
  if (value == null) {
    return fallback;
  }
  return value.toString();
}

String? _readStringOrNull(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null || value.toString().isEmpty) {
    return null;
  }
  return value.toString();
}

int _readInt(
  Map<String, Object?> json,
  String key, {
  int fallback = 0,
}) {
  final value = json[key];
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

int? _readIntOrNull(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value.toString());
}

bool _readBool(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is bool) {
    return value;
  }
  return value?.toString().toLowerCase() == 'true';
}

List<String> _readStringList(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is List) {
    return value.map((item) => item.toString()).toList(growable: false);
  }
  return const [];
}

List<Map<String, Object?>> _readMapList(
  Map<String, Object?> json,
  String key,
) {
  final value = json[key];
  if (value is List) {
    return [
      for (final item in value)
        if (item is Map) item.cast<String, Object?>(),
    ];
  }
  return const [];
}

DateTime _readDate(Map<String, Object?> json, String key) {
  return _readDateOrNull(json, key) ?? DateTime.fromMillisecondsSinceEpoch(0);
}

DateTime? _readDateOrNull(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is DateTime) {
    return value;
  }
  if (value == null || value.toString().isEmpty) {
    return null;
  }
  return DateTime.tryParse(value.toString());
}
