import 'package:flutter/services.dart';

import '../models/registration_scan_model.dart';

class RegistrationScannerService {
  const RegistrationScannerService({
    MethodChannel? channel,
  }) : _channel =
            channel ?? const MethodChannel('com.ototr/registration_scanner');

  final MethodChannel _channel;

  Future<RegistrationScanResult> scanRegistration() async {
    try {
      final raw = await _channel.invokeMapMethod<String, Object?>(
        'scanRegistration',
      );
      if (raw == null || raw['cancelled'] == true) {
        return const RegistrationScanResult(
          imagePaths: [],
          evidence: [],
          cancelled: true,
        );
      }
      final evidence = [
        for (final item in (raw['evidence'] as List<Object?>? ?? const []))
          if (item is Map) OcrEvidence.fromJson(item.cast<String, Object?>()),
      ];
      return RegistrationScanResult(
        imagePaths: [
          for (final path in (raw['imagePaths'] as List<Object?>? ?? const []))
            path.toString(),
        ],
        evidence: evidence,
      );
    } on PlatformException catch (error) {
      if (error.code == 'CANCELLED') {
        return const RegistrationScanResult(
          imagePaths: [],
          evidence: [],
          cancelled: true,
        );
      }
      return RegistrationScanResult(
        imagePaths: const [],
        evidence: const [],
        errorMessage: error.message ?? 'Ruhsat tarama başlatılamadı.',
      );
    }
  }
}
