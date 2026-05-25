import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/core/navigation/app_routes.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/data/repositories/work_order_report_repository.dart';
import 'package:ototr_branch_app/features/reports/final_report_preview_screen.dart';
import 'package:ototr_branch_app/features/technician/report_entry/report_entry_screen.dart';

void main() {
  setUp(() {
    DummyWorkOrderRepository.instance.reset();
    LocalWorkOrderReportRepository.instance.reset();
  });

  testWidgets('Rapor Girişi grupları ve toplam yüzdeyi gösterir',
      (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_app());
    await _waitForAsyncWork(tester);
    await _pumpUntil(tester, find.textContaining('Toplam'));

    expect(find.text('Rapor Girişi'), findsOneWidget);
    expect(find.textContaining('Toplam'), findsWidgets);
    expect(find.textContaining('Sekreterya'), findsNothing);
    expect(find.textContaining('İş Emri / Araç Kabul'), findsNothing);
    expect(find.textContaining('Araç Dosya Ekspertizi'), findsNothing);
    expect(find.textContaining('Motor Ekspertiz'), findsOneWidget);
    expect(find.textContaining('0/37 tamamlandı'), findsOneWidget);

    await tester.tap(find.textContaining('Motor Ekspertiz').first);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Tüm Noktalar İyi Durumda'),
      600,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Tüm Noktalar İyi Durumda'));
    await tester.pumpAndSettle();

    expect(find.text('Ölçüm Değerleri Gerekli'), findsOneWidget);
    expect(find.textContaining('Antifriz'), findsWidgets);

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), '-30');
    await tester.enterText(fields.at(1), '12.6');
    await tester.tap(find.text('Değerlerle İyiye Çek'));
    await tester.pumpAndSettle();

    final answers = await LocalWorkOrderReportRepository.instance.getAnswers(
      'wo-2026-0001',
    );
    expect(answers.where((answer) => answer.isCompleted), hasLength(37));

    await tester.scrollUntilVisible(
      find.text('Başlığı Gönder'),
      600,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Bu başlık tamamlandı'), findsOneWidget);
    await tester.tap(find.text('Başlığı Gönder'));
    await tester.pumpAndSettle();

    expect(find.text('Görevlerim'), findsOneWidget);
  });
}

Future<void> _pumpUntil(
  WidgetTester tester,
  Finder finder, {
  int maxPumps = 60,
}) async {
  for (var index = 0; index < maxPumps; index += 1) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isNotEmpty) {
      return;
    }
  }
  final visibleTexts = tester
      .widgetList<Text>(find.byType(Text))
      .map((widget) => widget.data ?? widget.textSpan?.toPlainText() ?? '')
      .where((text) => text.isNotEmpty)
      .join(' | ');
  fail('Beklenen widget bulunamadı: $finder. Görünen metinler: $visibleTexts');
}

Future<void> _waitForAsyncWork(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 500)),
  );
  await tester.pump();
}

Widget _app() {
  return MaterialApp(
    home: ReportEntryScreen(
      key: UniqueKey(),
      workOrderId: 'wo-2026-0001',
    ),
    onGenerateRoute: (settings) {
      if (settings.name == AppRoutes.finalReportPreview) {
        return MaterialPageRoute<void>(
          builder: (_) => FinalReportPreviewScreen(
            workOrderId: settings.arguments as String,
          ),
        );
      }
      if (settings.name == AppRoutes.technicianTasks) {
        return MaterialPageRoute<void>(
          builder: (_) => const Scaffold(body: Text('Görevlerim')),
        );
      }
      return null;
    },
  );
}
