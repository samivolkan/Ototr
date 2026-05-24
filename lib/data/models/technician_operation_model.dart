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
        return 'Kaporta Ustası';
      case TechnicianRole.mechanic:
        return 'Mekanik Usta';
      case TechnicianRole.obd:
        return 'OBD Ustası';
      case TechnicianRole.testOperator:
        return 'Test Operatörü';
      case TechnicianRole.foreman:
        return 'Formen';
      case TechnicianRole.branchManager:
        return 'Şube Müdürü';
    }
  }
}

enum TaskStatus {
  assigned,
  locked,
  open,
  completed,
  evidenceMissing,
  managerReturned,
  conflictDetected,
}

enum EvidenceStatus { missing, localOnly, queued, uploaded, rejected }

enum ReportGateStatus {
  ready,
  blocked,
  externalQueryPending,
  syncPending,
  managerApprovalRequired,
}

enum TechnicianFindingResult { normal, risky, notDone }

enum ExternalQueryStatus { ready, pending, failed }

enum SyncQueueStatus { pending, synced, failed, conflictDetected }

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
      vin.trim().length >= 8 &&
      vinPhoto.isNotEmpty &&
      platePhoto.isNotEmpty &&
      odometerKm != null &&
      odometerKm! > 0 &&
      odometerPhoto.isNotEmpty;

  List<String> missingReasons() {
    final reasons = <String>[];
    if (vin.trim().length < 8) {
      reasons.add('Şasi/VIN bilgisi eksik veya çok kısa.');
    }
    if (vinPhoto.isEmpty) {
      reasons.add('Şasi etiketi fotoğrafı eksik.');
    }
    if (platePhoto.isEmpty) {
      reasons.add('Plaka fotoğrafı eksik.');
    }
    if (odometerKm == null || odometerKm! <= 0) {
      reasons.add('Kilometre değeri girilmedi.');
    }
    if (odometerPhoto.isEmpty) {
      reasons.add('Kilometre ekran fotoğrafı eksik.');
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
      localPath.isNotEmpty || remoteUrl.isNotEmpty || syncStatus == EvidenceStatus.uploaded;

  EvidenceAsset copyWith({
    String? localPath,
    String? remoteUrl,
    String? hash,
    DateTime? uploadedAt,
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
      uploadedBy: uploadedBy,
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
  });

  final String id;
  final String title;
  final TechnicianFindingResult result;
  final String note;
  final String notDoneReason;
  final String reportFieldKey;
  final bool requiresEvidenceOnRisk;
  final List<EvidenceAsset> evidenceAssets;

  bool get hasEvidence => evidenceAssets.any((asset) => asset.isAvailable);

  List<String> missingReasons() {
    final reasons = <String>[];
    if (result == TechnicianFindingResult.risky && note.trim().isEmpty) {
      reasons.add('$title için risk açıklaması girilmeli.');
    }
    if (result == TechnicianFindingResult.risky &&
        requiresEvidenceOnRisk &&
        !hasEvidence) {
      reasons.add('$title için fotoğraf veya cihaz çıktısı eklenmeli.');
    }
    if (result == TechnicianFindingResult.notDone &&
        notDoneReason.trim().isEmpty) {
      reasons.add('$title yapılamadıysa nedeni yazılmalı.');
    }
    return reasons;
  }

  TechnicianChecklistItem copyWith({
    TechnicianFindingResult? result,
    String? note,
    String? notDoneReason,
    List<EvidenceAsset>? evidenceAssets,
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

  int get completedCount => checklistItems
      .where((item) => item.result != TechnicianFindingResult.normal || item.note.isNotEmpty)
      .length;

  List<String> missingReasons() {
    return [
      for (final item in checklistItems) ...item.missingReasons(),
      for (final asset in evidenceAssets)
        if (asset.isRequired && !asset.isAvailable) '${asset.title} kanıtı eksik.',
    ];
  }

  bool get canSubmit => missingReasons().isEmpty;

  TechnicianTask copyWith({
    TaskStatus? status,
    List<TechnicianChecklistItem>? checklistItems,
    List<String>? riskyFindings,
    String? customerFriendlyNote,
    List<EvidenceAsset>? evidenceAssets,
    String? managerReturnReason,
    int? revisionNo,
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
    );
  }

  TechnicianTask returnedByManager(String reason) {
    return copyWith(
      status: TaskStatus.managerReturned,
      managerReturnReason: reason,
      revisionNo: revisionNo + 1,
    );
  }
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
  });

  final String id;
  final String number;
  final String plate;
  final String vehicleSummary;
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

  bool visibleFor(UserProfile user, TechnicianRole role) {
    if (user.role == UserRole.branchManager ||
        user.role == UserRole.headquartersAuditor) {
      return true;
    }
    return ownerUserId == user.id || assignedRoles.contains(role);
  }

  bool get isClaimed => ownerUserId.isNotEmpty;

  bool get isStartEvidenceComplete => startEvidence?.isComplete ?? false;

  List<TechnicianTask> tasksFor(TechnicianRole role) {
    return tasks.where((task) => task.assignedRole == role).toList();
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
  }) {
    return TechnicianWorkOrder(
      id: id,
      number: number,
      plate: plate,
      vehicleSummary: vehicleSummary,
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
    );
  }
}

class ReportGateResult {
  const ReportGateResult({
    required this.isReady,
    required this.status,
    required this.blockingReasons,
    required this.missingEvidence,
    required this.missingExternalQueries,
    required this.managerApprovalRequired,
    required this.pendingSyncItems,
    required this.lastCalculatedAt,
  });

  final bool isReady;
  final ReportGateStatus status;
  final List<String> blockingReasons;
  final List<String> missingEvidence;
  final List<String> missingExternalQueries;
  final bool managerApprovalRequired;
  final List<OfflineSyncQueue> pendingSyncItems;
  final DateTime lastCalculatedAt;
}
