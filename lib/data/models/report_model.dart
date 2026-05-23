class Report {
  const Report({
    required this.id,
    required this.workOrderNumber,
    required this.revision,
    required this.riskSummary,
    required this.technicianNote,
    required this.branchApprovalStatus,
    required this.qrVerificationPlaceholder,
    required this.createdAt,
  });

  final String id;
  final String workOrderNumber;
  final String revision;
  final String riskSummary;
  final String technicianNote;
  final String branchApprovalStatus;
  final String qrVerificationPlaceholder;
  final DateTime createdAt;
}
