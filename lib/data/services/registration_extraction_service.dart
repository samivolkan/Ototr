import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/registration_scan_model.dart';
import 'registration_ocr_parser.dart';

class RegistrationExtractionService {
  const RegistrationExtractionService({
    this.parser = const RegistrationOcrParser(),
    SupabaseClient? client,
  }) : _client = client;

  final RegistrationOcrParser parser;
  final SupabaseClient? _client;

  Future<RegistrationReviewSession> createReviewSession(
    RegistrationScanResult scan,
  ) async {
    final sessionId = 'local-${DateTime.now().microsecondsSinceEpoch}';
    final documentType = parser.classify(scan.evidence);
    Map<String, Object?> vision = const {};
    var aiUnavailable = false;

    final client = _client ?? _safeSupabaseClient();
    if (client != null && scan.imagePaths.isNotEmpty) {
      try {
        final response = await client.functions.invoke(
          'ruhsat-extract',
          body: {
            'image_paths': scan.imagePaths,
            'ocr_evidence': [for (final item in scan.evidence) item.toJson()],
            'document_type_hint': documentType.code,
          },
        );
        if (response.data is Map) {
          vision = (response.data as Map).cast<String, Object?>();
        }
      } catch (_) {
        aiUnavailable = true;
      }
    } else {
      aiUnavailable = true;
    }

    return RegistrationReviewSession(
      id: vision['scan_session_id']?.toString() ?? sessionId,
      documentType: documentType,
      imagePaths: scan.imagePaths,
      evidence: scan.evidence,
      fields: parser.buildReviewFields(
        evidence: scan.evidence,
        vision: (vision['fields'] is Map)
            ? (vision['fields'] as Map).cast<String, Object?>()
            : const {},
      ),
      needsRescan: scan.evidence.length < 3,
      aiUnavailable: aiUnavailable,
    );
  }

  SupabaseClient? _safeSupabaseClient() {
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }
}
