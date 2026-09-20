import '../models/registration_scan_model.dart';
import 'registration_validators.dart';

class RegistrationOcrParser {
  const RegistrationOcrParser(
      {this.validators = const RegistrationValidators()});

  final RegistrationValidators validators;

  RegistrationDocumentType classify(List<OcrEvidence> evidence) {
    final text = evidence.map((item) => item.text.toUpperCase()).join(' ');
    if (text.contains('GEÇİCİ') || text.contains('GECICI')) {
      return RegistrationDocumentType.temporaryRegistration;
    }
    if (RegExp(r'\bD\.1\b|\bD\.2\b|\bD\.3\b|\bD\.4\b|\bP\.5\b')
        .hasMatch(text)) {
      return RegistrationDocumentType.modernRegistration;
    }
    if (text.contains('PLAKA NO') ||
        text.contains('MARKASI') ||
        text.contains('ŞASİ') ||
        text.contains('SASE')) {
      return RegistrationDocumentType.oldRegistration;
    }
    return RegistrationDocumentType.unknown;
  }

  List<RegistrationFieldReview> buildReviewFields({
    required List<OcrEvidence> evidence,
    Map<String, Object?> vision = const {},
  }) {
    final documentType = classify(evidence);
    final ocr = _extractFromEvidence(evidence, documentType);

    RegistrationFieldReview field(
      String key,
      String label, {
      required RegistrationFieldState Function(String?, String?) state,
      bool humanConfirmed = false,
    }) {
      final ocrValue = ocr[key]?.$1;
      final aiValue = vision[key]?.toString();
      final value = aiValue?.trim().isNotEmpty == true ? aiValue : ocrValue;
      return RegistrationFieldReview(
        key: key,
        label: label,
        value: value,
        ocrValue: ocrValue,
        aiValue: aiValue,
        state: state(ocrValue, aiValue),
        evidenceId: ocr[key]?.$2,
        humanConfirmed: humanConfirmed,
      );
    }

    RegistrationFieldState soft(String? ocrValue, String? aiValue) {
      final value = aiValue ?? ocrValue;
      if (value == null || value.trim().isEmpty) {
        return RegistrationFieldState.notRead;
      }
      if (ocrValue != null &&
          aiValue != null &&
          ocrValue.trim() != aiValue.trim()) {
        return RegistrationFieldState.reviewRequired;
      }
      return RegistrationFieldState.autoAcceptCandidate;
    }

    return [
      field(
        'plate',
        'Plaka',
        state: (ocrValue, aiValue) =>
            validators.validatePlateCandidate(aiValue ?? ocrValue),
      ),
      field(
        'vin',
        'ŞASİ / VIN',
        state: (ocrValue, aiValue) => validators.validateVinCandidate(
          ocrValue: ocrValue,
          visionValue: aiValue,
        ),
      ),
      field(
        'engine_number',
        'Motor No',
        state: (ocrValue, aiValue) => validators.validateEngineCandidate(
          ocrValue: ocrValue,
          visionValue: aiValue,
        ),
      ),
      field('brand', 'Marka', state: soft),
      field('commercial_name', 'Ticari Ad / Model', state: soft),
      field(
        'model_year',
        'Model Yılı',
        state: (ocrValue, aiValue) => validators.validateModelYearCandidate(
          aiValue ?? ocrValue,
          documentType: documentType,
        ),
      ),
      field('type', 'Tip', state: soft),
      field('vehicle_type', 'Araç Sınıfı / Cinsi', state: soft),
      field('fuel_type', 'Yakıt Cinsi', state: soft),
      field('color', 'Renk', state: soft),
      field('first_registration_date', 'İlk Tescil Tarihi', state: soft),
      field('registration_date', 'Tescil Tarihi', state: soft),
      field('document_serial_no', 'Belge Seri No', state: soft),
    ];
  }

  Map<String, (String, String)> _extractFromEvidence(
    List<OcrEvidence> evidence,
    RegistrationDocumentType documentType,
  ) {
    final result = <String, (String, String)>{};
    final lines = evidence.where((item) => item.id.contains('-line')).toList();
    for (var i = 0; i < lines.length; i++) {
      final current = lines[i].text.trim();
      final next = i + 1 < lines.length ? lines[i + 1].text.trim() : '';
      final joined = '$current $next';
      void setIfAbsent(String key, String? value, String evidenceId) {
        final cleaned = value?.trim();
        if (cleaned == null || cleaned.isEmpty || result.containsKey(key)) {
          return;
        }
        result[key] = (cleaned, evidenceId);
      }

      if (documentType == RegistrationDocumentType.modernRegistration) {
        setIfAbsent('plate', _afterModernLabel(joined, 'A'), lines[i].id);
        setIfAbsent('first_registration_date', _afterModernLabel(joined, 'B'),
            lines[i].id);
        setIfAbsent(
            'registration_date', _afterModernLabel(joined, 'I'), lines[i].id);
        setIfAbsent('brand', _afterModernLabel(joined, 'D.1'), lines[i].id);
        setIfAbsent('type', _afterModernLabel(joined, 'D.2'), lines[i].id);
        setIfAbsent(
            'commercial_name', _afterModernLabel(joined, 'D.3'), lines[i].id);
        setIfAbsent(
            'model_year', _afterModernLabel(joined, 'D.4'), lines[i].id);
        setIfAbsent(
            'engine_number', _afterModernLabel(joined, 'P.5'), lines[i].id);
        setIfAbsent('vin', _afterModernLabel(joined, 'E'), lines[i].id);
        setIfAbsent(
            'vehicle_type', _afterModernLabel(joined, 'J'), lines[i].id);
        setIfAbsent('color', _afterModernLabel(joined, 'R'), lines[i].id);
        setIfAbsent('fuel_type', _afterModernLabel(joined, 'P.3'), lines[i].id);
      } else {
        setIfAbsent('plate', _afterOldLabel(joined, 'PLAKA NO'), lines[i].id);
        setIfAbsent('brand', _afterOldLabel(joined, 'MARKASI'), lines[i].id);
        setIfAbsent(
            'model_year', _afterOldLabel(joined, 'MODELİ'), lines[i].id);
        setIfAbsent(
            'vehicle_type', _afterOldLabel(joined, 'CİNSİ'), lines[i].id);
        setIfAbsent('type', _afterOldLabel(joined, 'TİPİ'), lines[i].id);
        setIfAbsent('color', _afterOldLabel(joined, 'RENGİ'), lines[i].id);
        setIfAbsent(
            'engine_number', _afterOldLabel(joined, 'MOTOR NO'), lines[i].id);
        setIfAbsent(
            'vin',
            _afterOldLabel(joined, 'ŞASİ NO') ??
                _afterOldLabel(joined, 'ŞASE NO'),
            lines[i].id);
        setIfAbsent('registration_date',
            _afterOldLabel(joined, 'TESCİL TARİHİ'), lines[i].id);
      }
      setIfAbsent(
          'vin',
          RegExp(r'\b[A-HJ-NPR-Z0-9]{17}\b')
              .firstMatch(current.toUpperCase())
              ?.group(0),
          lines[i].id);
    }
    return result;
  }

  String? _afterModernLabel(String text, String label) {
    final escaped = RegExp.escape(label);
    return RegExp(
      r'(?:^|\s)' +
          escaped +
          r'\s*[:\-]?\s*(.*?)(?=\s(?:A|B|I|E|J|R|D\.1|D\.2|D\.3|D\.4|P\.3|P\.5)\s|$)',
      caseSensitive: false,
    ).firstMatch(text)?.group(1)?.trim();
  }

  String? _afterOldLabel(String text, String label) {
    return RegExp(
      RegExp.escape(label) +
          r'\s*[:\-]?\s*(.*?)(?=\s(?:PLAKA NO|MARKASI|MODELİ|CİNSİ|TİPİ|RENGİ|MOTOR NO|ŞASİ NO|ŞASE NO|TESCİL TARİHİ)\s|$)',
      caseSensitive: false,
    ).firstMatch(text)?.group(1)?.trim();
  }
}
