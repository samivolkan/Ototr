class Vehicle {
  const Vehicle({
    required this.plate,
    required this.vin,
    required this.brand,
    required this.model,
    required this.year,
    required this.fuelType,
    required this.transmission,
    required this.kilometers,
    required this.sellerType,
    required this.arrivalNote,
  });

  final String plate;
  final String vin;
  final String brand;
  final String model;
  final int year;
  final String fuelType;
  final String transmission;
  final int kilometers;
  final String sellerType;
  final String arrivalNote;

  String get displayName => '$year $brand $model';

  Map<String, Object?> toJson() {
    return {
      'plate': plate,
      'vin': vin,
      'brand': brand,
      'model': model,
      'year': year,
      'fuelType': fuelType,
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
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      year: json['year'] as int? ?? 0,
      fuelType: json['fuelType'] as String? ?? '',
      transmission: json['transmission'] as String? ?? '',
      kilometers: json['kilometers'] as int? ?? 0,
      sellerType: json['sellerType'] as String? ?? '',
      arrivalNote: json['arrivalNote'] as String? ?? '',
    );
  }
}
