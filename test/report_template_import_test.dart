import 'package:flutter_test/flutter_test.dart';
import 'package:ototr_branch_app/data/models/report_template_model.dart';
import 'package:ototr_branch_app/data/services/report_template_asset_loader.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('JSON rapor şablonu asset üzerinden dinamik yüklenir', () async {
    const loader = ReportTemplateAssetLoader();

    final template = await loader.load();

    expect(template.sourceReportId, '2614045');
    expect(template.groups.length, 12);
    expect(template.totalItems, 265);
    expect(
        template.groups.any((group) => group.code == 'MOTOR_CHECKUP'), isTrue);
  });

  test('Rapor maddeleri seçenek ve input alanlarını taşır', () async {
    final template = await const ReportTemplateAssetLoader().load();
    final optionItem = template.allItems.firstWhere(
      (item) => item.options.isNotEmpty,
    );
    final inputItem = template.allItems.firstWhere(
      (item) => item.inputFields.isNotEmpty,
    );

    expect(optionItem.hasOptions, isTrue);
    expect(optionItem.options.first.scoreType, isA<ReportOptionScoreType>());
    expect(inputItem.hasInputs, isTrue);
    expect(inputItem.inputFields.first.id, isNotEmpty);
  });
}
