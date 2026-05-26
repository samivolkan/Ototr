import '../generated/inspection_schema_catalog.dart';

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

enum PackageType {
  mini,
  esnaf,
  standard,
  full,
  premium,
  corporate,
  kaportaBoya,
  mekanik,
  hizliKontrol,
}

extension PackageTypeInfo on PackageType {
  String get code {
    return switch (this) {
      PackageType.mini => 'MINI',
      PackageType.esnaf => 'ESNAF',
      PackageType.standard => 'STANDARD',
      PackageType.full => 'FULL',
      PackageType.premium => 'PREMIUM',
      PackageType.corporate => 'CORPORATE',
      PackageType.kaportaBoya => 'KAPORTA_BOYA',
      PackageType.mekanik => 'MEKANIK',
      PackageType.hizliKontrol => 'HIZLI_KONTROL',
    };
  }

  String get label {
    return inspectionPackageByCode(code).name;
  }

  int get durationMinutes {
    return inspectionPackageByCode(code).durationMinutes;
  }
}

PackageType packageTypeFromCode(String code) {
  final normalized = code.trim().toUpperCase().replaceAll('-', '_');
  if (normalized == 'PREMIUM_360' || normalized == 'OTOTR_PREMIUM_360') {
    return PackageType.premium;
  }
  if (normalized == 'KAPORTA_BOYA') {
    return PackageType.kaportaBoya;
  }
  if (normalized == 'HIZLI_KONTROL') {
    return PackageType.hizliKontrol;
  }
  if (normalized == 'MINI_EKSPERTIZ') return PackageType.mini;
  if (normalized == 'ESNAF_EKSPERTIZ') return PackageType.esnaf;
  if (normalized == 'KURUMSAL' || normalized == 'FILO') {
    return PackageType.corporate;
  }
  return PackageType.values.firstWhere(
    (type) => type.code == normalized,
    orElse: () => PackageType.standard,
  );
}

PackagePlan packagePlanFromType(PackageType type) {
  final catalogPackage = inspectionPackageByCode(type.code);
  return PackagePlan(
    id: type.code.toLowerCase(),
    name: catalogPackage.name,
    listPrice: 'Liste fiyati: Demo',
    dealerDiscount: 'Bayi iskonto alani: Demo',
    maxDiscountWarning: 'Maksimum iskonto uyarisi: Demo',
    netCollection: 'Net tahsilat: Demo',
    paymentStatus: 'Odeme durumu: Bekliyor',
    durationMinutes: catalogPackage.durationMinutes,
    includedModules: catalogPackage.includedModules,
    isRecommended: type == PackageType.premium,
  );
}
