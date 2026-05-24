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
  standard,
  full,
  premium,
  kaportaBoya,
  mekanik,
  hizliKontrol,
}

extension PackageTypeInfo on PackageType {
  String get code {
    return switch (this) {
      PackageType.standard => 'STANDARD',
      PackageType.full => 'FULL',
      PackageType.premium => 'PREMIUM',
      PackageType.kaportaBoya => 'KAPORTA_BOYA',
      PackageType.mekanik => 'MEKANIK',
      PackageType.hizliKontrol => 'HIZLI_KONTROL',
    };
  }

  String get label {
    return switch (this) {
      PackageType.standard => 'Standard',
      PackageType.full => 'Full',
      PackageType.premium => 'Premium',
      PackageType.kaportaBoya => 'Kaporta Boya',
      PackageType.mekanik => 'Mekanik',
      PackageType.hizliKontrol => 'Hizli Kontrol',
    };
  }

  int get durationMinutes {
    return switch (this) {
      PackageType.standard => 45,
      PackageType.full => 75,
      PackageType.premium => 95,
      PackageType.kaportaBoya => 35,
      PackageType.mekanik => 40,
      PackageType.hizliKontrol => 20,
    };
  }
}

PackageType packageTypeFromCode(String code) {
  final normalized = code.trim().toUpperCase();
  return PackageType.values.firstWhere(
    (type) => type.code == normalized,
    orElse: () => PackageType.standard,
  );
}

PackagePlan packagePlanFromType(PackageType type) {
  return PackagePlan(
    id: type.code.toLowerCase(),
    name: type.label,
    listPrice: 'Liste fiyati: Demo',
    dealerDiscount: 'Bayi iskonto alani: Demo',
    maxDiscountWarning: 'Maksimum iskonto uyarisi: Demo',
    netCollection: 'Net tahsilat: Demo',
    paymentStatus: 'Odeme durumu: Bekliyor',
    durationMinutes: type.durationMinutes,
    includedModules: switch (type) {
      PackageType.standard => const ['Kaporta', 'Boya', 'Motor', 'Mekanik'],
      PackageType.full => const [
          'Kaporta',
          'Boya',
          'Motor',
          'Mekanik',
          'Elektrik',
          'Fren',
        ],
      PackageType.premium => const [
          'Kaporta',
          'Boya',
          'Motor',
          'Mekanik',
          'Elektrik',
          'Dyno',
          'Alt takim',
          'Fren',
          'Ic kondisyon',
          'Foto',
          'Rapor kontrol',
          'Yonetici onay',
        ],
      PackageType.kaportaBoya => const ['Kaporta', 'Boya', 'Foto'],
      PackageType.mekanik => const ['Motor', 'Mekanik', 'Alt takim', 'Fren'],
      PackageType.hizliKontrol => const [
          'Genel foto',
          'Motor',
          'Rapor kontrol'
        ],
    },
    isRecommended: type == PackageType.premium,
  );
}
