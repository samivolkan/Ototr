import '../models/registration_scan_model.dart';

class RegistrationValidators {
  const RegistrationValidators();

  String normalizeVin(String value) =>
      value.toUpperCase().replaceAll(RegExp(r'\s+'), '');

  String normalizeEngineNumber(String value) =>
      value.toUpperCase().replaceAll(RegExp(r'\s+'), '');

  String normalizePlate(String value) =>
      value.toUpperCase().replaceAll(RegExp(r'\s+'), ' ').trim();

  bool isVinValid(String value) {
    final normalized = normalizeVin(value);
    return normalized.length == 17 &&
        RegExp(r'^[A-HJ-NPR-Z0-9]{17}$').hasMatch(normalized);
  }

  bool hasVinAmbiguity(String value) {
    return RegExp(r'[IOQ]').hasMatch(value.toUpperCase());
  }

  RegistrationFieldState validateVinCandidate({
    required String? ocrValue,
    required String? visionValue,
  }) {
    final ocr = ocrValue == null ? null : normalizeVin(ocrValue);
    final vision = visionValue == null ? null : normalizeVin(visionValue);
    final candidate = vision ?? ocr;
    if (candidate == null || candidate.isEmpty) {
      return RegistrationFieldState.notRead;
    }
    if (!isVinValid(candidate)) return RegistrationFieldState.invalid;
    if (ocr != null && vision != null && ocr != vision) {
      return RegistrationFieldState.reviewRequired;
    }
    return RegistrationFieldState.reviewRequired;
  }

  RegistrationFieldState validateEngineCandidate({
    required String? ocrValue,
    required String? visionValue,
  }) {
    final ocr = ocrValue == null ? null : normalizeEngineNumber(ocrValue);
    final vision =
        visionValue == null ? null : normalizeEngineNumber(visionValue);
    final candidate = vision ?? ocr;
    if (candidate == null || candidate.isEmpty) {
      return RegistrationFieldState.notRead;
    }
    if (!RegExp(r'^[A-Z0-9][A-Z0-9\-\/\.]{2,31}$').hasMatch(candidate)) {
      return RegistrationFieldState.invalid;
    }
    if (ocr != null && vision != null && ocr != vision) {
      return RegistrationFieldState.reviewRequired;
    }
    return RegistrationFieldState.reviewRequired;
  }

  RegistrationFieldState validatePlateCandidate(String? value) {
    if (value == null || value.trim().isEmpty) {
      return RegistrationFieldState.notRead;
    }
    final normalized = normalizePlate(value);
    if (!RegExp(r'^[0-9]{2}\s?[A-Z]{1,3}\s?[0-9]{1,5}$').hasMatch(normalized)) {
      return RegistrationFieldState.reviewRequired;
    }
    return RegistrationFieldState.autoAcceptCandidate;
  }

  RegistrationFieldState validateModelYearCandidate(
    String? value, {
    required RegistrationDocumentType documentType,
  }) {
    if (value == null || value.trim().isEmpty) {
      return RegistrationFieldState.notRead;
    }
    final year = int.tryParse(value.trim());
    final maxYear = DateTime.now().year + 1;
    if (year == null || year < 1950 || year > maxYear) {
      return RegistrationFieldState.invalid;
    }
    return RegistrationFieldState.autoAcceptCandidate;
  }
}
