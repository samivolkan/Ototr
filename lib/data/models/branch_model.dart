class Branch {
  const Branch({
    required this.id,
    required this.name,
    required this.code,
    required this.city,
    required this.district,
    required this.authorizedUser,
    required this.technicalResponsible,
    required this.workingHours,
    required this.staffCount,
    required this.hasTseHybDocument,
    required this.hasLiabilityInsurance,
  });

  final String id;
  final String name;
  final String code;
  final String city;
  final String district;
  final String authorizedUser;
  final String technicalResponsible;
  final String workingHours;
  final int staffCount;
  final bool hasTseHybDocument;
  final bool hasLiabilityInsurance;
}
