import '../../data/models/photo_evidence_model.dart';

class Validators {
  const Validators._();

  static String? requiredField(String? value, {String fieldName = 'Alan'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName zorunludur';
    }
    return null;
  }

  static String? plate(String? value) {
    return requiredField(value, fieldName: 'Plaka');
  }

  static String? phone(String? value) {
    final cleaned = value?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (cleaned.length < 10) {
      return 'Telefon numarası eksik';
    }
    return null;
  }

  static String? numeric(String? value, {String fieldName = 'Sayı'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName zorunludur';
    }
    if (num.tryParse(value.trim()) == null) {
      return '$fieldName sayı olmalıdır';
    }
    return null;
  }

  static String? vinWarning(String? value) {
    final vin = value?.trim() ?? '';
    if (vin.isNotEmpty && vin.length > 17) {
      return 'Şasi/VIN 17 karakterden uzun olamaz';
    }
    if (vin.isNotEmpty && vin.length != 17) {
      return 'Şasi/VIN 17 karakter olmalıdır';
    }
    return null;
  }

  static bool requiredPhotosCompleted(List<PhotoEvidence> photos) {
    return photos.every((photo) => !photo.isRequired || photo.isUploaded);
  }

  static bool packageSelected(String? packageId) {
    return packageId != null && packageId.isNotEmpty;
  }
}
