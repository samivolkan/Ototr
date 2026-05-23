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
}
