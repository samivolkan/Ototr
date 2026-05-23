class PackagePlan {
  const PackagePlan({
    required this.id,
    required this.name,
    required this.listPrice,
    required this.dealerDiscount,
    required this.maxDiscountWarning,
    required this.netCollection,
    required this.paymentStatus,
    required this.durationMinutes,
    required this.includedModules,
    required this.isRecommended,
  });

  final String id;
  final String name;
  final String listPrice;
  final String dealerDiscount;
  final String maxDiscountWarning;
  final String netCollection;
  final String paymentStatus;
  final int durationMinutes;
  final List<String> includedModules;
  final bool isRecommended;
}
