import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/core/navigation/app_routes.dart';
import 'package:ototr_branch_app/data/models/technician_operation_model.dart';
import 'package:ototr_branch_app/data/repositories/app_repositories.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/data/repositories/final_report_repository.dart';
import 'package:ototr_branch_app/data/repositories/report_template_repository.dart';
import 'package:ototr_branch_app/data/repositories/work_order_report_repository.dart';
import 'package:ototr_branch_app/features/technician/start_evidence_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_evidence_screen.dart';
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

  testWidgets('Usta isleri ekraninda is emri ve ilerleme gorunur',
      (tester) async {
    await tester.pumpWidget(_app(const TechnicianJobsScreen()));
    await tester.pump();

    expect(find.textContaining('Usta'), findsWidgets);
    expect(find.text('16 ABC 123'), findsOneWidget);
    expect(find.textContaining('tamamlanma'), findsWidgets);
    expect(find.text('%0'), findsWidgets);
  });

  testWidgets('Arac baslama is emri eksikleri gosterir', (tester) async {
    await tester.pumpWidget(
      _app(const StartEvidenceScreen(workOrderId: 'wo-2026-0001')),
    );
    await _waitForText(tester, 'KM');

    expect(find.textContaining('KM'), findsWidgets);
    expect(find.textContaining('KM'), findsWidgets);
    expect(find.text('Opsiyonel'), findsNothing);
  });

  testWidgets('Kontrol formu maddeye tiklayinca JSON detayini acar',
      (tester) async {
    _completeStartEvidenceAndClaimBodyPaint();
    final firstItem = DummyWorkOrderRepository.instance
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((item) => item.taskId == 'body-paint')
        .checklistItems
        .first;

    await tester.pumpWidget(
      _app(
        const TechnicianTaskFormScreen(
          workOrderId: 'wo-2026-0001',
          taskId: 'body-paint',
        ),
      ),
    );
    await _waitForAsyncWork(tester);
    await _waitForText(tester, firstItem.title.split(' ').last);

    await tester.tap(find.text(firstItem.title).first);
    await tester.pump();
    await _waitForText(tester, 'Tamamland');

    expect(find.textContaining('Nokta'), findsWidgets);
    expect(find.textContaining('Foto'), findsWidgets);
  });

  testWidgets('Rapor medyalari cevre fotografi ve video ister', (tester) async {
    await tester.pumpWidget(
      _app(const TechnicianEvidenceScreen(workOrderId: 'wo-2026-0001')),
    );
    await tester.pump();

    expect(find.textContaining('Rapor'), findsWidgets);
    expect(find.textContaining('foto'), findsWidgets);
    expect(find.textContaining('video'), findsWidgets);

    expect(find.textContaining('Motor'), findsWidgets);
  });

  testWidgets('Usta gorev karti test yuzdesini gosterir', (tester) async {
    _completeStartEvidenceAndClaimBodyPaint();
    final taskTitle = DummyWorkOrderRepository.instance
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((item) => item.taskId == 'body-paint')
        .title
        .toUpperCase();

    await tester.pumpWidget(
      _app(const TechnicianTasksScreen(workOrderId: 'wo-2026-0001')),
    );

    await tester.scrollUntilVisible(
      find.text(taskTitle),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.textContaining('JSON'), findsNothing);
    expect(find.textContaining('%0 tamam'), findsWidgets);
    expect(find.textContaining('0/59'), findsWidgets);
    expect(find.textContaining('isaretlendi'), findsNothing);
    expect(find.textContaining('Havuz'), findsWidgets);
  });

  testWidgets('Usta basliga tiklayinca gorevi ustlenip forma girer',
      (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    _completeStartEvidence();
    final repository = DummyWorkOrderRepository.instance;
    final taskTitle = repository
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((item) => item.taskId == 'body-paint')
        .title
        .toUpperCase();

    await tester.pumpWidget(
      _app(const TechnicianTasksScreen(workOrderId: 'wo-2026-0001')),
    );

    await tester.scrollUntilVisible(
      find.text(taskTitle),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text(taskTitle));
    await _waitForText(tester, 'Kontrol');

    final task = repository
        .getById('wo-2026-0001')
        .tasks
        .firstWhere((item) => item.taskId == 'body-paint');

    expect(task.ownerUserId, repository.currentUser.id);
    expect(find.textContaining('Kontrol'), findsWidgets);
  });
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

Widget _app(Widget home) {
  return MaterialApp(
    home: home,
    onGenerateRoute: (settings) {
      if (settings.name == AppRoutes.technicianStartEvidence) {
        return MaterialPageRoute<void>(
          builder: (_) => StartEvidenceScreen(
            workOrderId: settings.arguments as String,
          ),
        );
      }
      if (settings.name == AppRoutes.technicianTaskForm) {
        final args = settings.arguments as Map<String, String>;
        return MaterialPageRoute<void>(
          builder: (_) => TechnicianTaskFormScreen(
            workOrderId: args['workOrderId']!,
            taskId: args['taskId']!,
          ),
        );
      }
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

void _completeStartEvidenceAndClaimBodyPaint() {
  _completeStartEvidence();
  DummyWorkOrderRepository.instance.claimTask('wo-2026-0001', 'body-paint');
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
