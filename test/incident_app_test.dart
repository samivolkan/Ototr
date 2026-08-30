import 'package:flutter_test/flutter_test.dart';

import '../lib/incident_app_main.dart';

void main() {
  testWidgets('incident center opens in demo mode and shows core controls', (tester) async {
    await tester.pumpWidget(const IncidentCenterApp());
    await tester.pumpAndSettle();

    expect(find.text('OtoTR'), findsOneWidget);
    expect(find.text('Açık Kaynak Araç Olay Merkezi'), findsOneWidget);
    expect(find.text('DEMO'), findsOneWidget);
    expect(find.text('Sunucu bağlantısı'), findsOneWidget);
    expect(find.text('Ekspertize giren aracı sorgula'), findsOneWidget);
    expect(find.text('TRT Haber — Türkiye'), findsOneWidget);
    expect(find.text('TRT Haber’i şimdi tara'), findsOneWidget);
  });

  testWidgets('demo plate lookup returns one verified match', (tester) async {
    await tester.pumpWidget(const IncidentCenterApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Doğrulanmış kaydı ara'));
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Demo: 1 doğrulanmış eşleşme bulundu'), findsOneWidget);
    expect(find.text('06 KAZ 26'), findsWidgets);
    expect(find.textContaining('OCR %91'), findsOneWidget);
  });
}
