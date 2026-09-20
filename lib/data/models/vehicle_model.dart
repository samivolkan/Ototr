class Vehicle {
  const Vehicle({
    required this.plate,
    required this.vin,
    this.engineNumber = '',
    required this.brand,
    required this.model,
    required this.year,
    required this.fuelType,
    this.vehicleType = '',
    this.type = '',
    this.commercialName = '',
    this.variant = '',
    this.version = '',
    this.color = '',
    this.firstRegistrationDate = '',
    this.registrationDate = '',
    required this.transmission,
    required this.kilometers,
    required this.sellerType,
    required this.arrivalNote,
  });

  final String plate;
  final String vin;
  final String engineNumber;
  final String brand;
  final String model;
  final int year;
  final String fuelType;
  final String vehicleType;
  final String type;
  final String commercialName;
  final String variant;
  final String version;
  final String color;
  final String firstRegistrationDate;
  final String registrationDate;
  final String transmission;
  final int kilometers;
  final String sellerType;
  final String arrivalNote;

  String get displayName => '$year $brand $model';

  Map<String, Object?> toJson() {
    return {
      'plate': plate,
      'vin': vin,
      'engineNumber': engineNumber,
      'brand': brand,
      'model': model,
      'year': year,
      'fuelType': fuelType,
      'vehicleType': vehicleType,
      'type': type,
      'commercialName': commercialName,
      'variant': variant,
      'version': version,
      'color': color,
      'firstRegistrationDate': firstRegistrationDate,
      'registrationDate': registrationDate,
      'transmission': transmission,
      'kilometers': kilometers,
      'sellerType': sellerType,
      'arrivalNote': arrivalNote,
    };
  }

  factory Vehicle.fromJson(Map<String, Object?> json) {
    return Vehicle(
      plate: json['plate'] as String? ?? '',
      vin: json['vin'] as String? ?? '',
      engineNumber: json['engineNumber'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      year: json['year'] as int? ?? 0,
      fuelType: json['fuelType'] as String? ?? '',
      vehicleType: json['vehicleType'] as String? ?? '',
      type: json['type'] as String? ?? '',
      commercialName: json['commercialName'] as String? ?? '',
      variant: json['variant'] as String? ?? '',
      version: json['version'] as String? ?? '',
      color: json['color'] as String? ?? '',
      firstRegistrationDate: json['firstRegistrationDate'] as String? ?? '',
      registrationDate: json['registrationDate'] as String? ?? '',
      transmission: json['transmission'] as String? ?? '',
      kilometers: json['kilometers'] as int? ?? 0,
      sellerType: json['sellerType'] as String? ?? '',
      arrivalNote: json['arrivalNote'] as String? ?? '',
    );
  }
}
