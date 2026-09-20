import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/registration_scan_model.dart';
import 'package:ototr_branch_app/data/services/registration_extraction_service.dart';
import 'package:ototr_branch_app/data/services/registration_ocr_parser.dart';
import 'package:ototr_branch_app/data/services/registration_scanner_service.dart';
import 'package:ototr_branch_app/data/services/registration_validators.dart';
import 'package:ototr_branch_app/features/registration_ai/registration_quick_work_order_screen.dart';

void main() {
  const validators = RegistrationValidators();

  test('VIN normalization I/O/Q invalid ve O/0 sessiz degisim yapmaz', () {
    expect(
        validators.normalizeVin(' wvw zzz1kz8m001179 '), 'WVWZZZ1KZ8M001179');
    expect(validators.isVinValid('WVWZZZ1KZ8M001179'), isTrue);
    expect(validators.isVinValid('WVWZZZ1KZ8MO01179'), isFalse);
    expect(validators.hasVinAmbiguity('WVWZZZ1KZ8MO01179'), isTrue);
  });

  test('motor B/8 belirsizligi otomatik kabul edilmez', () {
    expect(
      validators.validateEngineCandidate(
        ocrValue: 'BSE415775',
        visionValue: 'B5E415775',
      ),
      RegistrationFieldState.reviewRequired,
    );
  });

  test('plate parser istisnai formatlari hard reject etmez', () {
    expect(validators.validatePlateCandidate('34 ABC 123'),
        RegistrationFieldState.autoAcceptCandidate);
    expect(validators.validatePlateCandidate('TR 34 PROTOKOL'),
        RegistrationFieldState.reviewRequired);
  });

  test('modern D.4 ve eski MODELI model yilidir, tescil tarihinden tahmin yok',
      () {
    const parser = RegistrationOcrParser();
    final modern = [
      const OcrEvidence(
        id: 'page1-line1',
        text: 'D.4 2020',
        bbox: [0, 0, 1, 1],
        page: 1,
      ),
      const OcrEvidence(
        id: 'page1-line2',
        text: 'I 15.05.2022',
        bbox: [0, 0, 1, 1],
        page: 1,
      ),
    ];
    final fields = parser.buildReviewFields(evidence: modern);
    expect(
        fields.firstWhere((field) => field.key == 'model_year').value, '2020');
    expect(fields.firstWhere((field) => field.key == 'registration_date').value,
        '15.05.2022');
  });

  test('OCR vision merge farkli VIN icin review required uretir', () {
    final state = validators.validateVinCandidate(
      ocrValue: 'WVWZZZ1KZ8M001179',
      visionValue: 'WVWZZZ1KZ8M001170',
    );
    expect(state, RegistrationFieldState.reviewRequired);
  });

  test('migration idempotency ve fake customer yasaği metinsel korunur', () {
    final sql = _migrationSql();
    expect(sql, contains('idx_registration_scan_idempotency'));
    expect(sql, contains('customer_id,'));
    expect(sql, contains('null,'));
    expect(sql, isNot(contains('Ruhsat OCR Müşterisi')));
    expect(sql, contains('secretary_gate_ready'));
    expect(sql, contains('false'));
  });

  testWidgets('scanner cancel manuel akisa izin veren mesaj gosterir',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RegistrationQuickWorkOrderScreen(
          scanner: _FakeScanner(
            RegistrationScanResult(
              imagePaths: [],
              evidence: [],
              cancelled: true,
            ),
          ),
          extraction: RegistrationExtractionService(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.textContaining('Tarama iptal edildi'), findsOneWidget);
    expect(find.text('Manuel İş Emri'), findsOneWidget);
  });

  testWidgets('cloud unavailable local OCR ile review ekranini acar',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RegistrationQuickWorkOrderScreen(
          scanner: _FakeScanner(
            RegistrationScanResult(
              imagePaths: ['content://page1'],
              evidence: [
                OcrEvidence(
                  id: 'page1-line1',
                  text: 'A 34 ABC 123',
                  bbox: [0, 0, 1, 1],
                  page: 1,
                ),
                OcrEvidence(
                  id: 'page1-line2',
                  text: 'E WVWZZZ1KZ8M001179',
                  bbox: [0, 0, 1, 1],
                  page: 1,
                ),
                OcrEvidence(
                  id: 'page1-line3',
                  text: 'P.5 BSE415775',
                  bbox: [0, 0, 1, 1],
                  page: 1,
                ),
              ],
            ),
          ),
          extraction: RegistrationExtractionService(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Cloud AI kullanılamıyor'), findsOneWidget);
    expect(find.text('ŞASİ / VIN'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Motor No'), findsOneWidget);
  });
}

String _migrationSql() {
  return File(
    'supabase/migrations/20260920090000_ruhsat_ai_quick_work_order.sql',
  ).readAsStringSync();
}

class _FakeScanner extends RegistrationScannerService {
  const _FakeScanner(this.result);

  final RegistrationScanResult result;

  @override
  Future<RegistrationScanResult> scanRegistration() async => result;
}
