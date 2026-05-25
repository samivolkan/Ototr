import 'audit_log_model.dart';
import 'customer_model.dart';
import 'inspection_module_model.dart';
import 'package_plan_model.dart';
import 'photo_evidence_model.dart';
import 'vehicle_model.dart';

enum WorkOrderStatus {
  assigned,
  claimed,
  startEvidenceRequired,
  technicalEntryOpen,
  submitted,
  managerReview,
  approved,
  reportGateReady,
  evidenceMissing,
  managerReturned,
  externalQueryPending,
  reportGateBlocked,
  syncPending,
  conflictDetected,
  draft,
  customerWaiting,
  vehicleAccepted,
  inspectionWaiting,
  inspectionInProgress,
  missingPhotoEvidence,
  reportPreparing,
  approvalWaiting,
  delivered,
  cancelled,
}

extension WorkOrderStatusLabel on WorkOrderStatus {
  String get label {
    switch (this) {
      case WorkOrderStatus.assigned:
        return 'Ustaya Atandı';
      case WorkOrderStatus.claimed:
        return 'Usta Sahiplendi';
      case WorkOrderStatus.startEvidenceRequired:
        return 'Araç Başlama İş Emri Gerekli';
      case WorkOrderStatus.technicalEntryOpen:
        return 'Teknik Giriş Açık';
      case WorkOrderStatus.submitted:
        return 'Usta Gönderdi';
      case WorkOrderStatus.managerReview:
        return 'Müdür Kontrolünde';
      case WorkOrderStatus.approved:
        return 'Onaylandı';
      case WorkOrderStatus.reportGateReady:
        return 'Rapor Hazır';
      case WorkOrderStatus.evidenceMissing:
        return 'Kanıt Eksik';
      case WorkOrderStatus.managerReturned:
        return 'Müdür İadesi';
      case WorkOrderStatus.externalQueryPending:
        return 'Dış Sorgu Bekliyor';
      case WorkOrderStatus.reportGateBlocked:
        return 'Eksik Bildirim Var';
      case WorkOrderStatus.syncPending:
        return 'Senkron Bekliyor';
      case WorkOrderStatus.conflictDetected:
        return 'Çakışma Tespit Edildi';
      case WorkOrderStatus.draft:
        return 'Taslak';
      case WorkOrderStatus.customerWaiting:
        return 'Müşteri Bekliyor';
      case WorkOrderStatus.vehicleAccepted:
        return 'Araç Kabul Edildi';
      case WorkOrderStatus.inspectionWaiting:
        return 'Ekspertiz Bekliyor';
      case WorkOrderStatus.inspectionInProgress:
        return 'Ekspertiz Devam Ediyor';
      case WorkOrderStatus.missingPhotoEvidence:
        return 'Fotoğraf Kanıtı Eksik';
      case WorkOrderStatus.reportPreparing:
        return 'Rapor Hazırlanıyor';
      case WorkOrderStatus.approvalWaiting:
        return 'Onay Bekliyor';
      case WorkOrderStatus.delivered:
        return 'Teslim Edildi';
      case WorkOrderStatus.cancelled:
        return 'İptal Edildi';
    }
  }
}

enum TaskType {
  kaportaKontrol,
  boyaKontrol,
  motorKontrol,
  mekanikKontrol,
  elektrikKontrol,
  dynoTest,
  altTakimKontrol,
  frenKontrol,
  icKondisyon,
  genelFoto,
  raporKontrol,
  yoneticiOnay,
}

extension TaskTypeInfo on TaskType {
  String get code {
    return switch (this) {
      TaskType.kaportaKontrol => 'KAPORTA_KONTROL',
      TaskType.boyaKontrol => 'BOYA_KONTROL',
      TaskType.motorKontrol => 'MOTOR_KONTROL',
      TaskType.mekanikKontrol => 'MEKANIK_KONTROL',
      TaskType.elektrikKontrol => 'ELEKTRIK_KONTROL',
      TaskType.dynoTest => 'DYNO_TEST',
      TaskType.altTakimKontrol => 'ALT_TAKIM_KONTROL',
      TaskType.frenKontrol => 'FREN_KONTROL',
      TaskType.icKondisyon => 'IC_KONDISYON',
      TaskType.genelFoto => 'GENEL_FOTO',
      TaskType.raporKontrol => 'RAPOR_KONTROL',
      TaskType.yoneticiOnay => 'YONETICI_ONAY',
    };
  }

  String get label {
    return switch (this) {
      TaskType.kaportaKontrol => 'Kaporta kontrol',
      TaskType.boyaKontrol => 'Boya kontrol',
      TaskType.motorKontrol => 'Motor kontrol',
      TaskType.mekanikKontrol => 'Mekanik kontrol',
      TaskType.elektrikKontrol => 'Elektrik kontrol',
      TaskType.dynoTest => 'Dyno test',
      TaskType.altTakimKontrol => 'Alt takim kontrol',
      TaskType.frenKontrol => 'Fren kontrol',
      TaskType.icKondisyon => 'Ic kondisyon',
      TaskType.genelFoto => 'Genel foto',
      TaskType.raporKontrol => 'Rapor kontrol',
      TaskType.yoneticiOnay => 'Yonetici onay',
    };
  }
}

TaskType taskTypeFromCode(String code) {
  final normalized = code.trim().toUpperCase();
  switch (normalized) {
    case 'BODY-PAINT':
    case 'BODY_PAINT':
      return TaskType.kaportaKontrol;
    case 'MECHANIC':
      return TaskType.mekanikKontrol;
    case 'OBD':
      return TaskType.elektrikKontrol;
    case 'TEST':
    case 'ROAD_TEST':
      return TaskType.frenKontrol;
  }
  return TaskType.values.firstWhere(
    (type) => type.code == normalized,
    orElse: () => TaskType.genelFoto,
  );
}

enum WorkOrderTaskStatus {
  pending,
  assigned,
  inProgress,
  completed,
  cancelled,
}

extension WorkOrderTaskStatusInfo on WorkOrderTaskStatus {
  String get code {
    return switch (this) {
      WorkOrderTaskStatus.pending => 'PENDING',
      WorkOrderTaskStatus.assigned => 'ASSIGNED',
      WorkOrderTaskStatus.inProgress => 'IN_PROGRESS',
      WorkOrderTaskStatus.completed => 'COMPLETED',
      WorkOrderTaskStatus.cancelled => 'CANCELLED',
    };
  }

  String get label {
    return switch (this) {
      WorkOrderTaskStatus.pending => 'Bekliyor',
      WorkOrderTaskStatus.assigned => 'Atandi',
      WorkOrderTaskStatus.inProgress => 'Devam ediyor',
      WorkOrderTaskStatus.completed => 'Tamamlandi',
      WorkOrderTaskStatus.cancelled => 'Iptal',
    };
  }
}

WorkOrderTaskStatus workOrderTaskStatusFromCode(String code) {
  final normalized = code.trim().toUpperCase();
  return WorkOrderTaskStatus.values.firstWhere(
    (status) => status.code == normalized,
    orElse: () => WorkOrderTaskStatus.pending,
  );
}

class WorkOrderTask {
  const WorkOrderTask({
    required this.id,
    required this.type,
    required this.title,
    required this.status,
    required this.isRequired,
    required this.createdAt,
    this.completedAt,
  });

  final String id;
  final TaskType type;
  final String title;
  final WorkOrderTaskStatus status;
  final bool isRequired;
  final DateTime createdAt;
  final DateTime? completedAt;

  WorkOrderTask copyWith({
    WorkOrderTaskStatus? status,
    Object? completedAt = _unsetWorkOrderTaskField,
  }) {
    return WorkOrderTask(
      id: id,
      type: type,
      title: title,
      status: status ?? this.status,
      isRequired: isRequired,
      createdAt: createdAt,
      completedAt: identical(completedAt, _unsetWorkOrderTaskField)
          ? this.completedAt
          : completedAt as DateTime?,
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'type': type.code,
      'title': title,
      'status': status.code,
      'isRequired': isRequired,
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
    };
  }

  factory WorkOrderTask.fromJson(Map<String, Object?> json) {
    final completedAtText = json['completedAt'] as String?;
    return WorkOrderTask(
      id: json['id'] as String? ?? '',
      type: taskTypeFromCode(json['type'] as String? ?? ''),
      title: json['title'] as String? ?? '',
      status: workOrderTaskStatusFromCode(json['status'] as String? ?? ''),
      isRequired: json['isRequired'] as bool? ?? true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      completedAt:
          completedAtText == null ? null : DateTime.tryParse(completedAtText),
    );
  }
}

const _unsetWorkOrderTaskField = Object();

class WorkOrder {
  const WorkOrder({
    required this.id,
    required this.number,
    required this.status,
    required this.vehicle,
    required this.customer,
    required this.packagePlan,
    this.packageType,
    this.tasks = const [],
    required this.modules,
    required this.photoEvidence,
    required this.assignedTechnician,
    required this.createdAt,
    required this.estimatedDurationMinutes,
    required this.notes,
    required this.auditLogs,
    required this.isReportPrinted,
    required this.editRequestPending,
    required this.appointmentReady,
    required this.vehicleIntakeReady,
    required this.customerConsentReady,
    required this.packageApproved,
    required this.technicalAssignmentReady,
    required this.technicianStartEvidenceReady,
    required this.externalQueriesReady,
    required this.qualityApproved,
    required this.paymentCompleted,
    required this.handoverApproved,
  });

  final String id;
  final String number;
  final WorkOrderStatus status;
  final Vehicle vehicle;
  final Customer customer;
  final PackagePlan packagePlan;
  final PackageType? packageType;
  final List<WorkOrderTask> tasks;
  final List<InspectionModule> modules;
  final List<PhotoEvidence> photoEvidence;
  final String assignedTechnician;
  final DateTime createdAt;
  final int estimatedDurationMinutes;
  final String notes;
  final List<AuditLog> auditLogs;
  final bool isReportPrinted;
  final bool editRequestPending;
  final bool appointmentReady;
  final bool vehicleIntakeReady;
  final bool customerConsentReady;
  final bool packageApproved;
  final bool technicalAssignmentReady;
  final bool technicianStartEvidenceReady;
  final bool externalQueriesReady;
  final bool qualityApproved;
  final bool paymentCompleted;
  final bool handoverApproved;

  int get completedModules =>
      modules.where((module) => module.status == ModuleStatus.completed).length;

  int get criticalFindingCount =>
      modules.fold(0, (total, module) => total + module.criticalCount);

  int get missingRequiredPhotoCount => photoEvidence
      .where((photo) => photo.isRequired && !photo.isUploaded)
      .length;

  bool get modulesReady =>
      modules.isNotEmpty &&
      modules.every((module) => module.status == ModuleStatus.completed);

  bool get requiredPhotosReady => missingRequiredPhotoCount == 0;

  bool get reportPrintGateReady =>
      appointmentReady &&
      vehicleIntakeReady &&
      customerConsentReady &&
      packageApproved &&
      technicalAssignmentReady &&
      technicianStartEvidenceReady &&
      modulesReady &&
      requiredPhotosReady &&
      externalQueriesReady &&
      qualityApproved;

  bool get deliveryGateReady =>
      isReportPrinted && paymentCompleted && handoverApproved;

  List<OperationGate> get operationGates => [
        OperationGate('Randevu / Ön Kayıt', appointmentReady),
        OperationGate('Araç Kabul', vehicleIntakeReady),
        OperationGate('Müşteri ve Onaylar', customerConsentReady),
        OperationGate('Paket Seçimi', packageApproved),
        OperationGate('Teknik İş Dağılımı', technicalAssignmentReady),
        OperationGate('Araç Başlama İş Emri', technicianStartEvidenceReady),
        OperationGate('Ekspertiz Modülleri', modulesReady),
        OperationGate('Fotoğraf Kanıtları', requiredPhotosReady),
        OperationGate('Dış Sorgular', externalQueriesReady),
        OperationGate('Kalite Kontrol', qualityApproved),
        OperationGate('Rapor Basımı', isReportPrinted),
        OperationGate('Teslim', deliveryGateReady),
        OperationGate(
            'Rapor Sonrası Değişiklik', !isReportPrinted || editRequestPending),
      ];

  WorkOrder copyWith({
    String? id,
    String? number,
    WorkOrderStatus? status,
    Vehicle? vehicle,
    Customer? customer,
    PackagePlan? packagePlan,
    PackageType? packageType,
    List<WorkOrderTask>? tasks,
    List<InspectionModule>? modules,
    List<PhotoEvidence>? photoEvidence,
    String? assignedTechnician,
    DateTime? createdAt,
    int? estimatedDurationMinutes,
    String? notes,
    List<AuditLog>? auditLogs,
    bool? isReportPrinted,
    bool? editRequestPending,
    bool? appointmentReady,
    bool? vehicleIntakeReady,
    bool? customerConsentReady,
    bool? packageApproved,
    bool? technicalAssignmentReady,
    bool? technicianStartEvidenceReady,
    bool? externalQueriesReady,
    bool? qualityApproved,
    bool? paymentCompleted,
    bool? handoverApproved,
  }) {
    return WorkOrder(
      id: id ?? this.id,
      number: number ?? this.number,
      status: status ?? this.status,
      vehicle: vehicle ?? this.vehicle,
      customer: customer ?? this.customer,
      packagePlan: packagePlan ?? this.packagePlan,
      packageType: packageType ?? this.packageType,
      tasks: tasks ?? this.tasks,
      modules: modules ?? this.modules,
      photoEvidence: photoEvidence ?? this.photoEvidence,
      assignedTechnician: assignedTechnician ?? this.assignedTechnician,
      createdAt: createdAt ?? this.createdAt,
      estimatedDurationMinutes:
          estimatedDurationMinutes ?? this.estimatedDurationMinutes,
      notes: notes ?? this.notes,
      auditLogs: auditLogs ?? this.auditLogs,
      isReportPrinted: isReportPrinted ?? this.isReportPrinted,
      editRequestPending: editRequestPending ?? this.editRequestPending,
      appointmentReady: appointmentReady ?? this.appointmentReady,
      vehicleIntakeReady: vehicleIntakeReady ?? this.vehicleIntakeReady,
      customerConsentReady: customerConsentReady ?? this.customerConsentReady,
      packageApproved: packageApproved ?? this.packageApproved,
      technicalAssignmentReady:
          technicalAssignmentReady ?? this.technicalAssignmentReady,
      technicianStartEvidenceReady:
          technicianStartEvidenceReady ?? this.technicianStartEvidenceReady,
      externalQueriesReady: externalQueriesReady ?? this.externalQueriesReady,
      qualityApproved: qualityApproved ?? this.qualityApproved,
      paymentCompleted: paymentCompleted ?? this.paymentCompleted,
      handoverApproved: handoverApproved ?? this.handoverApproved,
    );
  }
}

class OperationGate {
  const OperationGate(this.title, this.isPassed);

  final String title;
  final bool isPassed;
}
