import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/core/navigation/app_routes.dart';
import 'package:ototr_branch_app/data/models/technician_operation_model.dart';
import 'package:ototr_branch_app/data/repositories/app_repositories.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/data/repositories/final_report_repository.dart';
import 'package:ototr_branch_app/data/repositories/report_template_repository.dart';
import 'package:ototr_branch_app/data/repositories/work_order_report_repository.dart';
import 'package:ototr_branch_app/features/technician/technician_jobs_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_task_form_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_tasks_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    AppRepositories.instance.remoteWorkOrders = null;
    AppRepositories.instance.localWorkOrders =
        DummyWorkOrderRepository.instance;
    AppRepositories.instance.reportTemplates = AssetReportTemplateRepository();
    AppRepositories.instance.workOrderReports =
        LocalWorkOrderReportRepository.instance;
    AppRepositories.instance.finalReports = LocalFinalReportRepository.instance;
    DummyWorkOrderRepository.instance.reset();
  });

  testWidgets('OBD satirlari tamamlaninca baslik gonderimi listeye doner',
      (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    _completeStartEvidence();
    final repository = DummyWorkOrderRepository.instance;
    repository.claimTask('wo-2026-0001', 'obd');

    await tester.pumpWidget(
      _app(
        const TechnicianTaskFormScreen(
          workOrderId: 'wo-2026-0001',
          taskId: 'obd',
        ),
      ),
    );
    await _waitForText(tester, 'Kontrol');
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(seconds: 2)),
    );
    await tester.pump();
    await _waitForText(tester, 'Noktalar');

    await tester.scrollUntilVisible(
      find.textContaining('Tüm Noktalar'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.textContaining('Tüm Noktalar'));
    await _waitForAsyncWork(tester);

    await tester.scrollUntilVisible(
      find.text('Başlığı Gönder'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Başlığı Gönder'));
    await _waitForText(tester, 'Görev');

    final submittedTask = repository
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((task) => task.taskId == 'obd');
    expect(submittedTask.status, TaskStatus.completed);
    expect(find.text('Bekleyen Görevler'), findsWidgets);
    expect(find.text('Tamamlanan Görevler'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.textContaining('10/10'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('10/10'), findsWidgets);
  });
}

Widget _app(Widget home) {
  return MaterialApp(
    home: home,
    onGenerateRoute: (settings) {
      if (settings.name == AppRoutes.technicianTasks) {
        return MaterialPageRoute<void>(
          builder: (_) => TechnicianTasksScreen(
            workOrderId: settings.arguments as String,
          ),
        );
      }
      return MaterialPageRoute<void>(
        builder: (_) => const TechnicianJobsScreen(),
      );
    },
  );
}

Future<void> _waitForText(
  WidgetTester tester,
  String text, {
  int maxPumps = 100,
}) async {
  for (var index = 0; index < maxPumps; index += 1) {
    await tester.pump(const Duration(milliseconds: 100));
    if (find.textContaining(text).evaluate().isNotEmpty) {
      return;
    }
  }
  final visibleTexts = tester
      .widgetList<Text>(find.byType(Text))
      .map((widget) => widget.data ?? widget.textSpan?.toPlainText() ?? '')
      .where((value) => value.isNotEmpty)
      .join(' | ');
  fail('Beklenen metin bulunamadi: $text. Gorunenler: $visibleTexts');
}

Future<void> _waitForAsyncWork(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 500)),
  );
  await tester.pump();
}

void _completeStartEvidence() {
  final repository = DummyWorkOrderRepository.instance;
  repository.saveStartEvidence(
    'wo-2026-0001',
    StartEvidence(
      workOrderId: 'wo-2026-0001',
      vin: 'WVWZZZ3CZEP005235',
      vinPhoto: 'local/vin.jpg',
      platePhoto: 'local/plate.jpg',
      odometerKm: 122450,
      odometerPhoto: 'local/km.jpg',
      capturedAt: DateTime(2026, 5, 24),
      capturedBy: repository.currentUser.id,
      deviceId: 'demo-device',
      gpsApprox: 'Bursa Nilufer',
    ),
  );
}
