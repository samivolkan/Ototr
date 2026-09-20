import 'package:flutter/foundation.dart';

import 'package:ototr_branch_app/data/models/package_plan_model.dart';
import 'package:ototr_branch_app/data/models/vehicle_model.dart';

enum RegistrationDocumentType {
  modernRegistration,
  oldRegistration,
  temporaryRegistration,
  unknown,
}

enum RegistrationFieldState {
  autoAcceptCandidate,
  reviewRequired,
  invalid,
  notRead,
}

enum RegistrationCorrectionErrorCode {
  captureBlur,
  captureGlare,
  captureCrop,
  captureRotation,
  ocrCharConfusion,
  ocrMissedText,
  labelValueAssociation,
  documentTypeMisclassified,
  modelHallucination,
  normalizationError,
  vinValidationError,
  engineNumberError,
  plateError,
  modelYearDateConfusion,
  brandModelSwap,
  backendMappingError,
  duplicateWorkOrder,
  wrongPackageMapping,
  piiLeakRisk,
  unknown,
}

extension RegistrationDocumentTypeWire on RegistrationDocumentType {
  String get code => switch (this) {
        RegistrationDocumentType.modernRegistration => 'MODERN_REGISTRATION',
        RegistrationDocumentType.oldRegistration => 'OLD_REGISTRATION',
        RegistrationDocumentType.temporaryRegistration =>
          'TEMPORARY_REGISTRATION',
        RegistrationDocumentType.unknown => 'UNKNOWN',
      };
}

extension RegistrationFieldStateWire on RegistrationFieldState {
  String get code => switch (this) {
        RegistrationFieldState.autoAcceptCandidate => 'AUTO_ACCEPT_CANDIDATE',
        RegistrationFieldState.reviewRequired => 'REVIEW_REQUIRED',
        RegistrationFieldState.invalid => 'INVALID',
        RegistrationFieldState.notRead => 'NOT_READ',
      };
}

@immutable
class OcrEvidence {
  const OcrEvidence({
    required this.id,
    required this.text,
    required this.bbox,
    required this.page,
  });

  final String id;
  final String text;
  final List<double> bbox;
  final int page;

  Map<String, Object?> toJson() => {
        'id': id,
        'text': text,
        'bbox': bbox,
        'page': page,
      };

  factory OcrEvidence.fromJson(Map<String, Object?> json) {
    return OcrEvidence(
      id: json['id']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      bbox: [
        for (final value in (json['bbox'] as List<Object?>? ?? const []))
          (value as num).toDouble(),
      ],
      page: json['page'] is num ? (json['page'] as num).toInt() : 1,
    );
  }
}

@immutable
class RegistrationScanResult {
  const RegistrationScanResult({
    required this.imagePaths,
    required this.evidence,
    this.cancelled = false,
    this.errorMessage,
  });

  final List<String> imagePaths;
  final List<OcrEvidence> evidence;
  final bool cancelled;
  final String? errorMessage;
}

@immutable
class RegistrationFieldReview {
  const RegistrationFieldReview({
    required this.key,
    required this.label,
    required this.value,
    required this.state,
    this.ocrValue,
    this.aiValue,
    this.evidenceId,
    this.evidenceImagePath,
    this.humanConfirmed = false,
    this.errorCode,
  });

  final String key;
  final String label;
  final String? value;
  final RegistrationFieldState state;
  final String? ocrValue;
  final String? aiValue;
  final String? evidenceId;
  final String? evidenceImagePath;
  final bool humanConfirmed;
  final RegistrationCorrectionErrorCode? errorCode;

  bool get blocksQuickOrder =>
      state == RegistrationFieldState.invalid ||
      (state == RegistrationFieldState.notRead &&
          const {'plate', 'vin', 'engine_number', 'brand', 'model_year'}
              .contains(key)) ||
      ((key == 'vin' || key == 'engine_number') && !humanConfirmed);

  RegistrationFieldReview copyWith({
    String? value,
    RegistrationFieldState? state,
    bool? humanConfirmed,
    RegistrationCorrectionErrorCode? errorCode,
  }) {
    return RegistrationFieldReview(
      key: key,
      label: label,
      value: value ?? this.value,
      state: state ?? this.state,
      ocrValue: ocrValue,
      aiValue: aiValue,
      evidenceId: evidenceId,
      evidenceImagePath: evidenceImagePath,
      humanConfirmed: humanConfirmed ?? this.humanConfirmed,
      errorCode: errorCode ?? this.errorCode,
    );
  }
}

@immutable
class RegistrationReviewSession {
  const RegistrationReviewSession({
    required this.id,
    required this.documentType,
    required this.imagePaths,
    required this.evidence,
    required this.fields,
    this.needsRescan = false,
    this.aiUnavailable = false,
  });

  final String id;
  final RegistrationDocumentType documentType;
  final List<String> imagePaths;
  final List<OcrEvidence> evidence;
  final List<RegistrationFieldReview> fields;
  final bool needsRescan;
  final bool aiUnavailable;

  bool get canCreateQuickOrder =>
      !fields.any((field) => field.blocksQuickOrder);

  String? value(String key) {
    for (final field in fields) {
      if (field.key == key) return field.value;
    }
    return null;
  }

  Vehicle toVehicle() {
    return Vehicle(
      plate: value('plate') ?? '',
      vin: value('vin') ?? '',
      engineNumber: value('engine_number') ?? '',
      brand: value('brand') ?? '',
      model: value('commercial_name') ?? value('model') ?? '',
      year: int.tryParse(value('model_year') ?? '') ?? 0,
      fuelType: value('fuel_type') ?? '',
      vehicleType: value('vehicle_type') ?? '',
      type: value('type') ?? '',
      commercialName: value('commercial_name') ?? '',
      variant: value('variant') ?? '',
      version: value('version') ?? '',
      color: value('color') ?? '',
      firstRegistrationDate: value('first_registration_date') ?? '',
      registrationDate: value('registration_date') ?? '',
      transmission: '',
      kilometers: 0,
      sellerType: '',
      arrivalNote: '',
    );
  }
}

@immutable
class QuickRegistrationWorkOrderInput {
  const QuickRegistrationWorkOrderInput({
    required this.registrationScanId,
    required this.idempotencyKey,
    required this.vehicle,
    required this.packageType,
    required this.notes,
  });

  final String registrationScanId;
  final String idempotencyKey;
  final Vehicle vehicle;
  final PackageType packageType;
  final String notes;
}
