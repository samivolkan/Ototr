import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/core/navigation/app_routes.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/features/technician/start_evidence_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_jobs_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_report_gate_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_sync_screen.dart';
import 'package:ototr_branch_app/features/technician/technician_task_form_screen.dart';

void main() {
  setUp(() {
    DummyWorkOrderRepository.instance.reset();
  });

  testWidgets('Usta İşleri ekranı sadece atanmış işi gösterir', (tester) async {
    await tester.pumpWidget(_app(const TechnicianJobsScreen()));

    expect(find.text('Usta İşleri'), findsOneWidget);
    expect(find.text('16 ABC 123'), findsOneWidget);
    expect(find.textContaining('Ödeme'), findsNothing);
    expect(find.textContaining('indirim'), findsNothing);
    expect(find.textContaining('tahsilat'), findsNothing);
  });

  testWidgets('İşe Başlama Kanıtı ekranı eksik alanları gösterir',
      (tester) async {
    await tester.pumpWidget(
        _app(const StartEvidenceScreen(workOrderId: 'wo-2026-0001')));

    await tester.scrollUntilVisible(
      find.text('Eksik Kanıtlar'),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('Eksik Kanıtlar'), findsOneWidget);
    expect(find.textContaining('Şasi etiketi fotoğrafı eksik'), findsOneWidget);
    expect(find.textContaining('Kilometre değeri girilmedi'), findsOneWidget);
  });

  testWidgets('Kontrol Formu riskli bulguda fotoğraf uyarısı verir',
      (tester) async {
    await tester.pumpWidget(
      _app(
        const TechnicianTaskFormScreen(
          workOrderId: 'wo-2026-0001',
          taskId: 'body-paint',
        ),
      ),
    );

    await tester.tap(find.text('Riskli').first);
    await tester.pump();

    expect(find.text('Gönderim Engelleri'), findsOneWidget);
    expect(find.textContaining('fotoğraf'), findsWidgets);
  });

  testWidgets('Rapor Kapısı blockingReasons listesini gösterir',
      (tester) async {
    await tester.pumpWidget(
      _app(const TechnicianReportGateScreen(workOrderId: 'wo-2026-0001')),
    );

    expect(find.text('Blokaj Nedenleri'), findsOneWidget);
    expect(
        find.textContaining('Başlangıç kanıtı tamamlanmadı'), findsOneWidget);
  });

  testWidgets('Offline bar senkron bekleyen kayıt sayısını gösterir',
      (tester) async {
    final repository = DummyWorkOrderRepository.instance;
    repository.queueDemoOperation();

    await tester.pumpWidget(_app(const TechnicianSyncScreen()));

    expect(find.textContaining('1 kayıt senkron bekliyor'), findsOneWidget);
  });
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
      return MaterialPageRoute<void>(
          builder: (_) => const TechnicianJobsScreen());
    },
  );
}
