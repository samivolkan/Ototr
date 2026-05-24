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
        return 'Başlangıç Kanıtı Gerekli';
      case WorkOrderStatus.technicalEntryOpen:
        return 'Teknik Giriş Açık';
      case WorkOrderStatus.submitted:
        return 'Usta Gönderdi';
      case WorkOrderStatus.managerReview:
        return 'Müdür Kontrolünde';
      case WorkOrderStatus.approved:
        return 'Onaylandı';
      case WorkOrderStatus.reportGateReady:
        return 'Rapor Kapısı Hazır';
      case WorkOrderStatus.evidenceMissing:
        return 'Kanıt Eksik';
      case WorkOrderStatus.managerReturned:
        return 'Müdür İadesi';
      case WorkOrderStatus.externalQueryPending:
        return 'Dış Sorgu Bekliyor';
      case WorkOrderStatus.reportGateBlocked:
        return 'Rapor Kapısı Kapalı';
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

class WorkOrder {
  const WorkOrder({
    required this.id,
    required this.number,
    required this.status,
    required this.vehicle,
    required this.customer,
    required this.packagePlan,
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
        OperationGate('Usta Başlangıç Kanıtı', technicianStartEvidenceReady),
        OperationGate('Ekspertiz Modülleri', modulesReady),
        OperationGate('Fotoğraf Kanıtları', requiredPhotosReady),
        OperationGate('Dış Sorgular', externalQueriesReady),
        OperationGate('Kalite Kontrol', qualityApproved),
        OperationGate('Rapor Basımı', isReportPrinted),
        OperationGate('Teslim', deliveryGateReady),
        OperationGate('Rapor Sonrası Değişiklik', !isReportPrinted || editRequestPending),
      ];
}

class OperationGate {
  const OperationGate(this.title, this.isPassed);

  final String title;
  final bool isPassed;
}
