import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/user_profile_model.dart';
import 'package:ototr_branch_app/data/repositories/report_template_repository.dart';
import 'package:ototr_branch_app/data/repositories/work_order_report_repository.dart';
import 'package:ototr_branch_app/data/services/work_order_report_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    LocalWorkOrderReportRepository.instance.reset();
  });

  test('Grup tamamlanma yüzdesi cevaplardan hesaplanır', () async {
    final templateRepository = AssetReportTemplateRepository();
    final reportRepository = LocalWorkOrderReportRepository.instance;
    final service = WorkOrderReportService(
      templateRepository: templateRepository,
      reportRepository: reportRepository,
    );
    final template = await templateRepository.getActiveTemplate();
    final group = template.groups.firstWhere(
      (item) => item.items.length == 1,
    );

    await service.markGroupAllGood(
      workOrderId: 'wo-2026-0001',
      template: template,
      group: group,
      user: _user,
    );

    final progress = await service.getGroupProgress('wo-2026-0001', group);
    expect(progress.completedItems, 1);
    expect(progress.progressPercent, 100);
  });

  test('Tüm noktalar iyi input alanlarını otomatik Uygun doldurmaz', () async {
    final templateRepository = AssetReportTemplateRepository();
    final service = WorkOrderReportService(
      templateRepository: templateRepository,
      reportRepository: LocalWorkOrderReportRepository.instance,
    );
    final template = await templateRepository.getActiveTemplate();
    final group = template.groups.firstWhere(
      (item) =>
          item.assignedRole != 'Sekreterya' &&
          item.items.any((reportItem) => reportItem.inputFields.isNotEmpty),
    );

    final requiredInputs = await service.getRequiredInputsForGroupAllGood(
      workOrderId: 'wo-2026-0001',
      group: group,
    );

    expect(requiredInputs, isNotEmpty);
    await expectLater(
      service.markGroupAllGood(
        workOrderId: 'wo-2026-0001',
        template: template,
        group: group,
        user: _user,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('Tüm noktalar iyi girilen ölçümlerle grubu tamamlar', () async {
    final templateRepository = AssetReportTemplateRepository();
    final reportRepository = LocalWorkOrderReportRepository.instance;
    final service = WorkOrderReportService(
      templateRepository: templateRepository,
      reportRepository: reportRepository,
    );
    final template = await templateRepository.getActiveTemplate();
    final group = template.groups.firstWhere(
      (item) =>
          item.assignedRole != 'Sekreterya' &&
          item.items.any((reportItem) => reportItem.inputFields.isNotEmpty),
    );

    await service.markGroupAllGood(
      workOrderId: 'wo-2026-0001',
      template: template,
      group: group,
      user: _user,
      inputValuesByItem: {
        for (final item in group.items)
          if (item.inputFields.isNotEmpty)
            item.id: {
              for (final input in item.inputFields)
                input.id: _sampleInputValue(input.type),
            },
      },
    );

    final progress = await service.getGroupProgress('wo-2026-0001', group);
    expect(progress.completedItems, group.items.length);
    expect(progress.progressPercent, 100);

    final answers = await reportRepository.getAnswers('wo-2026-0001');
    for (final item
        in group.items.where((item) => item.inputFields.isNotEmpty)) {
      final answer = answers.firstWhere((answer) => answer.itemId == item.id);
      for (final input in item.inputFields) {
        expect(answer.inputValues[input.id], _sampleInputValue(input.type));
      }
    }
  });

  test('Seçenekli madde seçim olmadan tamamlanamaz', () async {
    final templateRepository = AssetReportTemplateRepository();
    final service = WorkOrderReportService(
      templateRepository: templateRepository,
      reportRepository: LocalWorkOrderReportRepository.instance,
    );
    final template = await templateRepository.getActiveTemplate();
    final group = template.groups.firstWhere(
      (item) => item.items.any((reportItem) => reportItem.options.isNotEmpty),
    );
    final item =
        group.items.firstWhere((reportItem) => reportItem.options.isNotEmpty);

    await expectLater(
      service.saveItemAnswer(
        workOrderId: 'wo-2026-0001',
        template: template,
        group: group,
        item: item,
        user: _user,
        selectedOptionIds: const [],
        inputValues: const {},
        description: '',
        imageUrls: const [],
        complete: true,
      ),
      throwsA(isA<StateError>()),
    );
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
