import '../models/technician_operation_model.dart';
import '../models/user_profile_model.dart';

class RolePermissionService {
  const RolePermissionService();

  TechnicianRole technicianRoleFor(UserProfile user) {
    if (user.role == UserRole.branchManager) {
      return TechnicianRole.branchManager;
    }
    return TechnicianRole.bodyPaint;
  }

  bool canSeeWorkOrder(UserProfile user, TechnicianWorkOrder workOrder) {
    final role = technicianRoleFor(user);
    return workOrder.visibleFor(user, role);
  }

  bool canEditTask(UserProfile user, TechnicianTask task) {
    final role = technicianRoleFor(user);
    if (role == TechnicianRole.branchManager || role == TechnicianRole.foreman) {
      return false;
    }
    return task.assignedRole == role;
  }

  bool canMonitorTask(UserProfile user, TechnicianTask task) {
    final role = technicianRoleFor(user);
    return role == TechnicianRole.branchManager ||
        role == TechnicianRole.foreman ||
        task.assignedRole == role;
  }

  bool canOpenTechnicalEntry(TechnicianWorkOrder workOrder) {
    return workOrder.isStartEvidenceComplete;
  }

  bool canSeeFinancialField(UserProfile user) {
    return user.role == UserRole.branchManager;
  }

  bool shouldShowField(UserProfile user, String fieldKey) {
    const hiddenForTechnician = {
      'payment',
      'discount',
      'collection',
      'customer_negotiation_note',
      'cash_register',
      'invoice',
      'secretary_sensitive',
    };
    if (canSeeFinancialField(user)) {
      return true;
    }
    return !hiddenForTechnician.contains(fieldKey);
  }
}
