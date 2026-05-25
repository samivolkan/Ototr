import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/core/navigation/app_routes.dart';
import 'package:ototr_branch_app/data/models/technician_operation_model.dart';
import 'package:ototr_branch_app/data/models/user_profile_model.dart';
import 'package:ototr_branch_app/data/repositories/dummy_work_order_repository.dart';
import 'package:ototr_branch_app/features/manager/manager_task_ownership_screen.dart';
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
    _completeStartEvidenceAndClaimBodyPaint();

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
  testWidgets('Mudur baslik atamasinda aktif usta secilir', (tester) async {
    DummyWorkOrderRepository.instance.switchCurrentUserForTest(_managerUser);

    await tester.pumpWidget(_app(const ManagerTaskOwnershipScreen()));

    await tester.tap(find.text('Baska Ustaya Ata').first);
    await tester.pumpAndSettle();

    expect(find.text('Aktif usta'), findsOneWidget);
    expect(find.textContaining('Ahmet Usta'), findsWidgets);
    expect(find.text('Yeni ownerUserId'), findsNothing);
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

const _managerUser = UserProfile(
  id: 'manager-ayse',
  fullName: 'Ayse Mudur',
  email: 'ayse.mudur@ototr.test',
  phone: '0555 000 16 18',
  role: UserRole.branchManager,
  branchId: 'bursa-nilufer',
  isActive: true,
);

void _completeStartEvidenceAndClaimBodyPaint() {
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
  repository.claimTask('wo-2026-0001', 'body-paint');
}
