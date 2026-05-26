class AuditLog {
  const AuditLog({
    required this.id,
    required this.userName,
    required this.action,
    required this.createdAt,
  });

  final String id;
  final String userName;
  final String action;
  final DateTime createdAt;
}
