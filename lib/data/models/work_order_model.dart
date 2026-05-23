import 'audit_log_model.dart';
import 'customer_model.dart';
import 'inspection_module_model.dart';
import 'package_plan_model.dart';
import 'photo_evidence_model.dart';
import 'vehicle_model.dart';

enum WorkOrderStatus {
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

  int get completedModules =>
      modules.where((module) => module.status == ModuleStatus.completed).length;

  int get criticalFindingCount =>
      modules.fold(0, (total, module) => total + module.criticalCount);

  int get missingRequiredPhotoCount => photoEvidence
      .where((photo) => photo.isRequired && !photo.isUploaded)
      .length;
}
