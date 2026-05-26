enum UserRole {
  receptionStaff,
  inspectionTechnician,
  branchManager,
  headquartersAuditor,
}

extension UserRoleLabel on UserRole {
  String get label {
    switch (this) {
      case UserRole.receptionStaff:
        return 'Karşılama Personeli';
      case UserRole.inspectionTechnician:
        return 'Ekspertiz Teknisyeni';
      case UserRole.branchManager:
        return 'Şube Müdürü';
      case UserRole.headquartersAuditor:
        return 'Genel Merkez Denetçisi';
    }
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.branchId,
    required this.isActive,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final UserRole role;
  final String branchId;
  final bool isActive;
}
