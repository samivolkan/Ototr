import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/user_profile_model.dart';
import 'package:ototr_branch_app/data/repositories/final_report_repository.dart';
import 'package:ototr_branch_app/data/repositories/report_template_repository.dart';
import 'package:ototr_branch_app/data/repositories/work_order_report_repository.dart';
import 'package:ototr_branch_app/data/services/final_report_builder.dart';
import 'package:ototr_branch_app/data/services/work_order_report_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    LocalWorkOrderReportRepository.instance.reset();
    LocalFinalReportRepository.instance.reset();
  });

  test('Final rapor eksikler bitmeden kilitlenemez', () async {
    final templateRepository = AssetReportTemplateRepository();
    final builder = FinalReportBuilder(
      templateRepository: templateRepository,
      reportRepository: LocalWorkOrderReportRepository.instance,
    );
    final draft = await builder.build('wo-2026-0001');

    expect(draft.isComplete, isFalse);
    expect(draft.missingCount, greaterThan(0));
    await expectLater(
      LocalFinalReportRepository.instance.lockFinalReport(draft),
      throwsA(isA<StateError>()),
    );
  });

  test('Tamamlanmış rapor lokal final kayda kilitlenir', () async {
    final templateRepository = AssetReportTemplateRepository();
    final reportRepository = LocalWorkOrderReportRepository.instance;
    final service = WorkOrderReportService(
      templateRepository: templateRepository,
      reportRepository: reportRepository,
    );
    final template = await templateRepository.getActiveTemplate();

    for (final group in template.groups) {
      final inputValuesByItem = {
        for (final item in group.items)
          if (item.inputFields.isNotEmpty)
            item.id: {
              for (final input in item.inputFields)
                input.id: _sampleInputValue(input.type),
            },
      };
      await service.markGroupAllGood(
        workOrderId: 'wo-2026-0001',
        template: template,
        group: group,
        user: _user,
        inputValuesByItem: inputValuesByItem,
      );
    }

    final builder = FinalReportBuilder(
      templateRepository: templateRepository,
      reportRepository: reportRepository,
    );
    final draft = await builder.build('wo-2026-0001');
    final record = await LocalFinalReportRepository.instance.lockFinalReport(
      draft,
    );

    expect(draft.completedCount, template.totalItems);
    expect(record.isLocked, isTrue);
    expect(record.payload['missingCount'], 0);
  });
}

const _user = UserProfile(
  id: 'tech-ahmet',
  fullName: 'Ahmet Usta',
  email: 'ahmet.usta@ototr.test',
  phone: '0555 000 16 16',
  role: UserRole.inspectionTechnician,
  branchId: 'bursa-nilufer',
  isActive: true,
);

String _sampleInputValue(String type) {
  switch (type.toLowerCase()) {
    case 'number':
      return '12.6';
    case 'year':
      return '2023';
    case 'date':
      return '25.05.2026';
    default:
      return 'Normal';
  }
}
