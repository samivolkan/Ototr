import 'user_profile_model.dart';
import 'work_order_model.dart';

enum TechnicianRole {
  bodyPaint,
  mechanic,
  obd,
  testOperator,
  foreman,
  branchManager,
}

extension TechnicianRoleLabel on TechnicianRole {
  String get label {
    switch (this) {
      case TechnicianRole.bodyPaint:
        return 'Kaporta Ustas\u0131';
      case TechnicianRole.mechanic:
        return 'Mekanik Usta';
      case TechnicianRole.obd:
        return 'OBD Ustas\u0131';
      case TechnicianRole.testOperator:
        return 'Test Operat\u00f6r\u00fc';
      case TechnicianRole.foreman:
        return 'Formen';
      case TechnicianRole.branchManager:
        return '\u015eube M\u00fcd\u00fcr\u00fc';
    }
  }
}

enum TaskStatus {
  available,
  assigned,
  locked,
  open,
  completed,
  evidenceMissing,
  managerReturned,
  conflictDetected,
}

extension TaskStatusLabel on TaskStatus {
  String get label {
    switch (this) {
      case TaskStatus.available:
        return 'Sahiplenilebilir';
      case TaskStatus.assigned:
        return 'Atand\u0131';
      case TaskStatus.locked:
        return 'Kilitli';
      case TaskStatus.open:
        return 'D\u00fczenlemeye a\u00e7\u0131k';
      case TaskStatus.completed:
        return 'G\u00f6nderildi';
      case TaskStatus.evidenceMissing:
        return 'Kan\u0131t eksik';
      case TaskStatus.managerReturned:
        return 'M\u00fcd\u00fcr iadesi';
      case TaskStatus.conflictDetected:
        return '\u00c7ak\u0131\u015fma var';
    }
  }
}

enum EvidenceStatus { missing, localOnly, queued, uploaded, rejected }

enum ReportGateStatus {
  ready,
  blocked,
  externalQueryPending,
  syncPending,
  managerApprovalRequired,
}

enum ReportGateIssueCode {
  startEvidenceMissing,
  taskIncomplete,
  taskMissingEvidence,
  taskReturnedByManager,
  riskyFindingNeedsNote,
  riskyFindingNeedsEvidence,
  notDoneNeedsReason,
  customerFriendlyNoteMissing,
  finalSummaryConflict,
  externalQueryPending,
  secretaryGateMissing,
  kvkkGateMissing,
  paymentGateMissing,
  managerApprovalPending,
  syncPending,
}

enum TechnicianFindingResult { normal, risky, notDone }

enum ExternalQueryStatus { ready, pending, failed }

enum SyncQueueStatus { pending, synced, failed, conflictDetected }

enum TaskOwnershipEventType {
  claimed,
  released,
  managerReleased,
  managerReassigned,
  managerReturned,
  submitted,
}

const _unset = Object();

class StartEvidence {
  const StartEvidence({
    required this.workOrderId,
    required this.vin,
    required this.vinPhoto,
    required this.platePhoto,
    required this.odometerKm,
    required this.odometerPhoto,
    required this.capturedAt,
    required this.capturedBy,
    required this.deviceId,
    required this.gpsApprox,
  });

  final String workOrderId;
  final String vin;
  final String vinPhoto;
  final String platePhoto;
  final int? odometerKm;
  final String odometerPhoto;
  final DateTime capturedAt;
  final String capturedBy;
  final String deviceId;
  final String gpsApprox;

  bool get isComplete =>
      vin.trim().length == 17 &&
      _isCapturedEvidencePhoto(vinPhoto) &&
      _isCapturedEvidencePhoto(platePhoto) &&
      odometerKm != null &&
      _isCapturedEvidencePhoto(odometerPhoto);

  List<String> missingReasons() {
    final reasons = <String>[];
    final normalizedVin = vin.trim();
    if (normalizedVin.isEmpty) {
      reasons.add('\u015easi/VIN bilgisi eksik.');
    } else if (normalizedVin.length != 17) {
      reasons.add('\u015easi/VIN 17 karakter olmal\u0131d\u0131r.');
    }
    if (!_isCapturedEvidencePhoto(vinPhoto)) {
      reasons.add('\u015easi etiketi foto\u011fraf\u0131 eksik.');
    }
    if (!_isCapturedEvidencePhoto(platePhoto)) {
      reasons.add('Plaka foto\u011fraf\u0131 eksik.');
    }
    if (odometerKm == null) {
      reasons.add('Kilometre degeri girilmedi.');
    }
    if (!_isCapturedEvidencePhoto(odometerPhoto)) {
      reasons.add('KM ekran fotografi eksik.');
    }
    return reasons;
  }

  StartEvidence copyWith({
    String? vin,
    String? vinPhoto,
    String? platePhoto,
    int? odometerKm,
    String? odometerPhoto,
    DateTime? capturedAt,
    String? capturedBy,
    String? deviceId,
    String? gpsApprox,
  }) {
    return StartEvidence(
      workOrderId: workOrderId,
      vin: vin ?? this.vin,
      vinPhoto: vinPhoto ?? this.vinPhoto,
      platePhoto: platePhoto ?? this.platePhoto,
      odometerKm: odometerKm ?? this.odometerKm,
      odometerPhoto: odometerPhoto ?? this.odometerPhoto,
      capturedAt: capturedAt ?? this.capturedAt,
      capturedBy: capturedBy ?? this.capturedBy,
      deviceId: deviceId ?? this.deviceId,
      gpsApprox: gpsApprox ?? this.gpsApprox,
    );
  }
}

bool _isCapturedEvidencePhoto(String reference) {
  const legacyPlaceholders = {
    'local/vin-label.jpg',
    'local/odometer.jpg',
  };
  return reference.isNotEmpty && !legacyPlaceholders.contains(reference);
}

class EvidenceAsset {
  const EvidenceAsset({
    required this.id,
    required this.workOrderId,
    required this.taskId,
    required this.fieldKey,
    required this.reportFieldKey,
    required this.evidenceType,
    required this.title,
    required this.localPath,
    required this.remoteUrl,
    required this.hash,
    required this.capturedAt,
    required this.uploadedAt,
    required this.uploadedBy,
    required this.syncStatus,
    required this.isRequired,
    required this.qualityStatus,
    required this.rejectionReason,
  });

  final String id;
  final String workOrderId;
  final String taskId;
  final String fieldKey;
  final String reportFieldKey;
  final String evidenceType;
  final String title;
  final String localPath;
  final String remoteUrl;
  final String hash;
  final DateTime capturedAt;
  final DateTime? uploadedAt;
  final String uploadedBy;
  final EvidenceStatus syncStatus;
  final bool isRequired;
  final String qualityStatus;
  final String rejectionReason;

  bool get isAvailable =>
      localPath.isNotEmpty ||
      remoteUrl.isNotEmpty ||
      syncStatus == EvidenceStatus.uploaded;

  EvidenceAsset copyWith({
    String? localPath,
    String? remoteUrl,
    String? hash,
    DateTime? uploadedAt,
    String? uploadedBy,
    EvidenceStatus? syncStatus,
    String? qualityStatus,
    String? rejectionReason,
  }) {
    return EvidenceAsset(
      id: id,
      workOrderId: workOrderId,
      taskId: taskId,
      fieldKey: fieldKey,
      reportFieldKey: reportFieldKey,
      evidenceType: evidenceType,
      title: title,
      localPath: localPath ?? this.localPath,
      remoteUrl: remoteUrl ?? this.remoteUrl,
      hash: hash ?? this.hash,
      capturedAt: capturedAt,
      uploadedAt: uploadedAt ?? this.uploadedAt,
      uploadedBy: uploadedBy ?? this.uploadedBy,
      syncStatus: syncStatus ?? this.syncStatus,
      isRequired: isRequired,
      qualityStatus: qualityStatus ?? this.qualityStatus,
      rejectionReason: rejectionReason ?? this.rejectionReason,
    );
  }
}

class TechnicianChecklistItem {
  const TechnicianChecklistItem({
    required this.id,
    required this.title,
    required this.result,
    required this.note,
    required this.notDoneReason,
    required this.reportFieldKey,
    required this.requiresEvidenceOnRisk,
    required this.evidenceAssets,
    this.isAnswered = false,
  });

  final String id;
  final String title;
  final TechnicianFindingResult result;
  final String note;
  final String notDoneReason;
  final String reportFieldKey;
  final bool requiresEvidenceOnRisk;
  final List<EvidenceAsset> evidenceAssets;
  final bool isAnswered;

  bool get hasEvidence => evidenceAssets.any((asset) => asset.isAvailable);

  List<String> missingReasons() {
    final reasons = <String>[];
    if (result == TechnicianFindingResult.risky && note.trim().isEmpty) {
      reasons.add('$title i\u00e7in risk a\u00e7\u0131klamas\u0131 girilmeli.');
    }
    if (result == TechnicianFindingResult.risky &&
        requiresEvidenceOnRisk &&
        !hasEvidence) {
      reasons.add(
          '$title i\u00e7in foto\u011fraf veya cihaz \u00e7\u0131kt\u0131s\u0131 eklenmeli.');
    }
    if (result == TechnicianFindingResult.notDone &&
        notDoneReason.trim().isEmpty) {
      reasons.add('$title yap\u0131lamad\u0131ysa nedeni yaz\u0131lmal\u0131.');
    }
    return reasons;
  }

  TechnicianChecklistItem copyWith({
    TechnicianFindingResult? result,
    String? note,
    String? notDoneReason,
    List<EvidenceAsset>? evidenceAssets,
    bool? isAnswered,
  }) {
    return TechnicianChecklistItem(
      id: id,
      title: title,
      result: result ?? this.result,
      note: note ?? this.note,
      notDoneReason: notDoneReason ?? this.notDoneReason,
      reportFieldKey: reportFieldKey,
      requiresEvidenceOnRisk: requiresEvidenceOnRisk,
      evidenceAssets: evidenceAssets ?? this.evidenceAssets,
      isAnswered: isAnswered ?? this.isAnswered,
    );
  }
}

class TechnicianTask {
  const TechnicianTask({
    required this.taskId,
    required this.workOrderId,
    required this.assignedRole,
    required this.assignedUserId,
    required this.title,
    required this.status,
    required this.checklistItems,
    required this.requiredFields,
    required this.riskyFindings,
    required this.customerFriendlyNote,
    required this.reportFieldKey,
    required this.evidenceAssets,
    required this.managerReturnReason,
    required this.revisionNo,
    required this.estimatedMinutes,
    this.ownerUserId,
    this.claimedAt,
    this.releaseReason = '',
    this.releasedByUserId,
    this.releasedAt,
    this.assignedByManagerId,
    this.managerAssignReason = '',
    this.ownershipHistory = const [],
    this.auditLog = const [],
  });

  final String taskId;
  final String workOrderId;
  final TechnicianRole assignedRole;
  final String assignedUserId;
  final String title;
  final TaskStatus status;
  final List<TechnicianChecklistItem> checklistItems;
  final List<String> requiredFields;
  final List<String> riskyFindings;
  final String customerFriendlyNote;
  final String reportFieldKey;
  final List<EvidenceAsset> evidenceAssets;
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
  final List<TaskOwnershipHistoryEntry> ownershipHistory;
  final List<TaskAuditLogEntry> auditLog;

  int get completedCount =>
      checklistItems.where((item) => item.isAnswered).length;

  int get completionPercent {
    if (checklistItems.isEmpty) {
      return status == TaskStatus.completed ? 100 : 0;
    }
    if (status == TaskStatus.completed) {
      return 100;
    }
    return ((completedCount / checklistItems.length) * 100).round();
  }

  List<String> missingReasons() {
    final unansweredCount =
        checklistItems.where((item) => !item.isAnswered).length;
    return [
      if (unansweredCount > 0)
        '$title i\u00e7in $unansweredCount kontrol maddesi i\u015faretlenmeli.',
      for (final item in checklistItems) ...item.missingReasons(),
      if (requiredFields.contains('customerFriendlyNote') &&
          customerFriendlyNote.trim().isEmpty)
        '$title i\u00e7in m\u00fc\u015fteri dili teknik notu girilmeli.',
      for (final asset in evidenceAssets)
        if (asset.isRequired && !asset.isAvailable)
          '${asset.title} foto\u011fraf/kan\u0131t\u0131 eksik.',
    ];
  }

  bool get canSubmit => missingReasons().isEmpty;

  bool get isOwned => ownerUserId != null && ownerUserId!.isNotEmpty;

  bool isOwnedBy(String userId) => isOwned && ownerUserId == userId;

  bool canEditBy(UserProfile user) => isOwnedBy(user.id);

  bool canReleaseBy(UserProfile user) => isOwnedBy(user.id);

  bool get isAvailableForClaim => !isOwned && status == TaskStatus.available;

  TechnicianTask copyWith({
    TaskStatus? status,
    List<TechnicianChecklistItem>? checklistItems,
    List<String>? riskyFindings,
    String? customerFriendlyNote,
    List<EvidenceAsset>? evidenceAssets,
    String? managerReturnReason,
    int? revisionNo,
    Object? ownerUserId = _unset,
    Object? claimedAt = _unset,
    String? releaseReason,
    Object? releasedByUserId = _unset,
    Object? releasedAt = _unset,
    Object? assignedByManagerId = _unset,
    String? managerAssignReason,
    List<TaskOwnershipHistoryEntry>? ownershipHistory,
    List<TaskAuditLogEntry>? auditLog,
  }) {
    return TechnicianTask(
      taskId: taskId,
      workOrderId: workOrderId,
      assignedRole: assignedRole,
      assignedUserId: assignedUserId,
      title: title,
      status: status ?? this.status,
      checklistItems: checklistItems ?? this.checklistItems,
      requiredFields: requiredFields,
      riskyFindings: riskyFindings ?? this.riskyFindings,
      customerFriendlyNote: customerFriendlyNote ?? this.customerFriendlyNote,
      reportFieldKey: reportFieldKey,
      evidenceAssets: evidenceAssets ?? this.evidenceAssets,
      managerReturnReason: managerReturnReason ?? this.managerReturnReason,
      revisionNo: revisionNo ?? this.revisionNo,
      estimatedMinutes: estimatedMinutes,
      ownerUserId: identical(ownerUserId, _unset)
          ? this.ownerUserId
          : ownerUserId as String?,
      claimedAt: identical(claimedAt, _unset)
          ? this.claimedAt
          : claimedAt as DateTime?,
      releaseReason: releaseReason ?? this.releaseReason,
      releasedByUserId: identical(releasedByUserId, _unset)
          ? this.releasedByUserId
          : releasedByUserId as String?,
      releasedAt: identical(releasedAt, _unset)
          ? this.releasedAt
          : releasedAt as DateTime?,
      assignedByManagerId: identical(assignedByManagerId, _unset)
          ? this.assignedByManagerId
          : assignedByManagerId as String?,
      managerAssignReason: managerAssignReason ?? this.managerAssignReason,
      ownershipHistory: ownershipHistory ?? this.ownershipHistory,
      auditLog: auditLog ?? this.auditLog,
    );
  }

  TechnicianTask returnedByManager(String reason) {
    return copyWith(
      status: TaskStatus.managerReturned,
      managerReturnReason: reason,
      revisionNo: revisionNo + 1,
    );
  }

  TechnicianTask claimBy(UserProfile user, DateTime claimedAt) {
    if (user.role != UserRole.inspectionTechnician) {
      throw StateError('Sadece usta basligi sahiplenebilir.');
    }
    if (isOwned && ownerUserId != user.id) {
      throw StateError('Bu baslik baska bir usta tarafindan sahiplenilmis.');
    }

    return copyWith(
      ownerUserId: user.id,
      claimedAt: claimedAt,
      status: TaskStatus.open,
      releaseReason: '',
      releasedByUserId: null,
      releasedAt: null,
      ownershipHistory: [
        ...ownershipHistory,
        TaskOwnershipHistoryEntry(
          eventType: TaskOwnershipEventType.claimed,
          actorUserId: user.id,
          ownerUserId: user.id,
          previousOwnerUserId: ownerUserId,
          reason: '',
          createdAt: claimedAt,
        ),
      ],
      auditLog: [
        ...auditLog,
        TaskAuditLogEntry(
          action: 'claim',
          actorUserId: user.id,
          createdAt: claimedAt,
          note: '',
        ),
      ],
    );
  }

  TechnicianTask releaseBy(
      UserProfile user, String reason, DateTime releasedAt) {
    if (!canReleaseBy(user)) {
      throw StateError('Sadece gorevin sahibi bu basligi birakabilir.');
    }
    if (reason.trim().isEmpty) {
      throw ArgumentError('releaseReason zorunludur.');
    }

    return copyWith(
      ownerUserId: null,
      claimedAt: null,
      status: TaskStatus.available,
      releaseReason: reason.trim(),
      releasedByUserId: user.id,
      releasedAt: releasedAt,
      ownershipHistory: [
        ...ownershipHistory,
        TaskOwnershipHistoryEntry(
          eventType: TaskOwnershipEventType.released,
          actorUserId: user.id,
          ownerUserId: null,
          previousOwnerUserId: ownerUserId,
          reason: reason.trim(),
          createdAt: releasedAt,
        ),
      ],
      auditLog: [
        ...auditLog,
        TaskAuditLogEntry(
          action: 'release',
          actorUserId: user.id,
          createdAt: releasedAt,
          note: reason.trim(),
        ),
      ],
    );
  }

  TechnicianTask managerAssignTo({
    required UserProfile manager,
    required String nextOwnerUserId,
    required String reason,
    required DateTime assignedAt,
  }) {
    if (manager.role != UserRole.branchManager) {
      throw StateError('Dogrudan usta atamasi sadece mudur yetkisindedir.');
    }
    if (nextOwnerUserId.trim().isEmpty) {
      throw ArgumentError('Yeni usta zorunludur.');
    }
    if (reason.trim().isEmpty) {
      throw ArgumentError('managerAssignReason zorunludur.');
    }

    return copyWith(
      ownerUserId: nextOwnerUserId,
      claimedAt: assignedAt,
      status: TaskStatus.open,
      assignedByManagerId: manager.id,
      managerAssignReason: reason.trim(),
      ownershipHistory: [
        ...ownershipHistory,
        TaskOwnershipHistoryEntry(
          eventType: TaskOwnershipEventType.managerReassigned,
          actorUserId: manager.id,
          ownerUserId: nextOwnerUserId,
          previousOwnerUserId: ownerUserId,
          reason: reason.trim(),
          createdAt: assignedAt,
        ),
      ],
      auditLog: [
        ...auditLog,
        TaskAuditLogEntry(
          action: 'manager_reassigned',
          actorUserId: manager.id,
          createdAt: assignedAt,
          note: reason.trim(),
        ),
      ],
    );
  }

  TechnicianTask submittedBy(UserProfile user, DateTime submittedAt) {
    if (!canEditBy(user)) {
      throw StateError(
          'Sadece g\u00f6rev sahibi ba\u015fl\u0131\u011f\u0131 g\u00f6nderebilir.');
    }

    return copyWith(
      status: canSubmit ? TaskStatus.completed : TaskStatus.evidenceMissing,
      auditLog: [
        ...auditLog,
        TaskAuditLogEntry(
          action: 'submit',
          actorUserId: user.id,
          createdAt: submittedAt,
          note: canSubmit ? 'completed' : 'evidence_missing',
        ),
      ],
      ownershipHistory: [
        ...ownershipHistory,
        TaskOwnershipHistoryEntry(
          eventType: TaskOwnershipEventType.submitted,
          actorUserId: user.id,
          ownerUserId: ownerUserId,
          previousOwnerUserId: ownerUserId,
          reason: canSubmit ? 'completed' : 'evidence_missing',
          createdAt: submittedAt,
        ),
      ],
    );
  }
}

class TaskOwnershipHistoryEntry {
  const TaskOwnershipHistoryEntry({
    required this.eventType,
    required this.actorUserId,
    required this.ownerUserId,
    required this.previousOwnerUserId,
    required this.reason,
    required this.createdAt,
  });

  final TaskOwnershipEventType eventType;
  final String actorUserId;
  final String? ownerUserId;
  final String? previousOwnerUserId;
  final String reason;
  final DateTime createdAt;
}

class TaskAuditLogEntry {
  const TaskAuditLogEntry({
    required this.action,
    required this.actorUserId,
    required this.createdAt,
    required this.note,
  });

  final String action;
  final String actorUserId;
  final DateTime createdAt;
  final String note;
}

class ExternalQuery {
  const ExternalQuery({
    required this.id,
    required this.workOrderId,
    required this.type,
    required this.source,
    required this.status,
    required this.resultSummary,
    required this.queriedAt,
    required this.importedToReport,
    required this.blockingReason,
  });

  final String id;
  final String workOrderId;
  final String type;
  final String source;
  final ExternalQueryStatus status;
  final String resultSummary;
  final DateTime? queriedAt;
  final bool importedToReport;
  final String blockingReason;

  bool get isBlocking =>
      status != ExternalQueryStatus.ready || !importedToReport;
}

class OfflineSyncQueue {
  const OfflineSyncQueue({
    required this.queueId,
    required this.operationType,
    required this.workOrderId,
    required this.taskId,
    required this.payload,
    required this.idempotencyKey,
    required this.retryCount,
    required this.lastError,
    required this.createdAt,
    required this.syncedAt,
    required this.status,
  });

  final String queueId;
  final String operationType;
  final String workOrderId;
  final String taskId;
  final Map<String, Object?> payload;
  final String idempotencyKey;
  final int retryCount;
  final String lastError;
  final DateTime createdAt;
  final DateTime? syncedAt;
  final SyncQueueStatus status;

  OfflineSyncQueue copyWith({
    int? retryCount,
    String? lastError,
    DateTime? syncedAt,
    SyncQueueStatus? status,
  }) {
    return OfflineSyncQueue(
      queueId: queueId,
      operationType: operationType,
      workOrderId: workOrderId,
      taskId: taskId,
      payload: payload,
      idempotencyKey: idempotencyKey,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      createdAt: createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
      status: status ?? this.status,
    );
  }
}

class TechnicianWorkOrder {
  const TechnicianWorkOrder({
    required this.id,
    required this.number,
    required this.plate,
    required this.vehicleSummary,
    this.vehicleTransmission = '',
    required this.packageName,
    required this.assignedRoles,
    required this.status,
    required this.ownerUserId,
    required this.startEvidence,
    required this.tasks,
    required this.externalQueries,
    required this.managerApproved,
    required this.secretaryGateReady,
    required this.paymentGateReady,
    required this.kvkkGateReady,
    this.finalMediaAssets = const [],
  });

  final String id;
  final String number;
  final String plate;
  final String vehicleSummary;
  final String vehicleTransmission;
  final String packageName;
  final List<TechnicianRole> assignedRoles;
  final WorkOrderStatus status;
  final String ownerUserId;
  final StartEvidence? startEvidence;
  final List<TechnicianTask> tasks;
  final List<ExternalQuery> externalQueries;
  final bool managerApproved;
  final bool secretaryGateReady;
  final bool paymentGateReady;
  final bool kvkkGateReady;
  final List<EvidenceAsset> finalMediaAssets;

  bool visibleFor(UserProfile user, TechnicianRole role) {
    if (user.role == UserRole.branchManager ||
        user.role == UserRole.headquartersAuditor) {
      return true;
    }
    return user.role == UserRole.inspectionTechnician;
  }

  bool get isClaimed => ownerUserId.isNotEmpty;

  bool get isStartEvidenceComplete => startEvidence?.isComplete ?? false;

  List<TechnicianTask> tasksFor(TechnicianRole role) {
    return tasks;
  }

  TechnicianWorkOrder claim(String userId) {
    return copyWith(ownerUserId: userId, status: WorkOrderStatus.claimed);
  }

  TechnicianWorkOrder copyWith({
    WorkOrderStatus? status,
    String? ownerUserId,
    StartEvidence? startEvidence,
    List<TechnicianTask>? tasks,
    List<ExternalQuery>? externalQueries,
    bool? managerApproved,
    bool? secretaryGateReady,
    bool? paymentGateReady,
    bool? kvkkGateReady,
    List<EvidenceAsset>? finalMediaAssets,
  }) {
    return TechnicianWorkOrder(
      id: id,
      number: number,
      plate: plate,
      vehicleSummary: vehicleSummary,
      vehicleTransmission: vehicleTransmission,
      packageName: packageName,
      assignedRoles: assignedRoles,
      status: status ?? this.status,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      startEvidence: startEvidence ?? this.startEvidence,
      tasks: tasks ?? this.tasks,
      externalQueries: externalQueries ?? this.externalQueries,
      managerApproved: managerApproved ?? this.managerApproved,
      secretaryGateReady: secretaryGateReady ?? this.secretaryGateReady,
      paymentGateReady: paymentGateReady ?? this.paymentGateReady,
      kvkkGateReady: kvkkGateReady ?? this.kvkkGateReady,
      finalMediaAssets: finalMediaAssets ?? this.finalMediaAssets,
    );
  }
}

class ReportGateResult {
  const ReportGateResult({
    required this.isReady,
    required this.status,
    this.issues = const [],
    required this.blockingReasons,
    required this.missingEvidence,
    required this.missingExternalQueries,
    required this.managerApprovalRequired,
    required this.pendingSyncItems,
    required this.lastCalculatedAt,
  });

  final bool isReady;
  final ReportGateStatus status;
  final List<ReportGateIssue> issues;
  final List<String> blockingReasons;
  final List<String> missingEvidence;
  final List<String> missingExternalQueries;
  final bool managerApprovalRequired;
  final List<OfflineSyncQueue> pendingSyncItems;
  final DateTime lastCalculatedAt;
}

class ReportGateIssue {
  const ReportGateIssue({
    required this.code,
    required this.message,
    this.taskId,
    this.fieldKey,
    this.evidenceRelated = false,
    this.externalQueryRelated = false,
  });

  final ReportGateIssueCode code;
  final String message;
  final String? taskId;
  final String? fieldKey;
  final bool evidenceRelated;
  final bool externalQueryRelated;
}
