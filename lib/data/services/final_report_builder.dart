import '../models/report_template_model.dart';
import '../repositories/report_template_repository.dart';
import '../repositories/work_order_report_repository.dart';

class FinalReportBuilder {
  const FinalReportBuilder({
    required this.templateRepository,
    required this.reportRepository,
  });

  final ReportTemplateRepository templateRepository;
  final WorkOrderReportRepository reportRepository;

  Future<FinalReportDraft> build(String workOrderId) async {
    final template = await templateRepository.getActiveTemplate();
    final answers = await reportRepository.getAnswers(workOrderId);
    final answersByItem = {
      for (final answer in answers) answer.itemId: answer,
    };

    final sections = [
      for (final group in template.groups)
        FinalReportSection(
          group: group,
          rows: [
            for (final item in group.items)
              if (answersByItem[item.id]?.isCompleted == true)
                FinalReportRow(item: item, answer: answersByItem[item.id]!),
          ],
          missingItems: [
            for (final item in group.items)
              if (answersByItem[item.id]?.isCompleted != true) item,
          ],
        ),
    ];
    final totalCount = sections.fold<int>(
      0,
      (sum, section) => sum + section.rows.length + section.missingItems.length,
    );
    final completedCount = sections.fold<int>(
      0,
      (sum, section) => sum + section.rows.length,
    );

    return FinalReportDraft(
      workOrderId: workOrderId,
      templateId: template.id,
      sections: sections,
      createdAt: DateTime.now(),
      isComplete: sections.every((section) => section.missingItems.isEmpty),
      completedCount: completedCount,
      totalCount: totalCount,
    );
  }
}
