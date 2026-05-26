import 'package:flutter/material.dart';

import '../../core/constants/app_sizes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/ototr_app_bar.dart';
import '../../core/widgets/ototr_card.dart';
import '../../data/models/report_template_model.dart';
import '../../data/repositories/app_repositories.dart';
import '../../data/repositories/final_report_repository.dart';
import '../../data/services/final_report_builder.dart';

class FinalReportPreviewScreen extends StatefulWidget {
  const FinalReportPreviewScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<FinalReportPreviewScreen> createState() =>
      _FinalReportPreviewScreenState();
}

class _FinalReportPreviewScreenState extends State<FinalReportPreviewScreen> {
  late Future<_FinalReportPreviewData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_FinalReportPreviewData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: const OtotrAppBar(title: 'Final Rapor'),
            backgroundColor: AppColors.grayBg,
            body: Padding(
              padding: const EdgeInsets.all(AppSizes.lg),
              child: OtotrCard(
                child: Text(
                  'Final rapor oluşturulamadı: ${snapshot.error}',
                  style: const TextStyle(color: AppColors.red),
                ),
              ),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Scaffold(
            appBar: OtotrAppBar(title: 'Final Rapor'),
            backgroundColor: AppColors.grayBg,
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final data = snapshot.data!;
        final draft = data.draft;
        final record = data.record;

        return Scaffold(
          appBar: const OtotrAppBar(title: 'Final Rapor'),
          backgroundColor: AppColors.grayBg,
          body: ListView(
            padding: const EdgeInsets.all(AppSizes.lg),
            children: [
              OtotrCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Rapor Önizleme',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      draft.isComplete
                          ? 'Tüm maddeler tamamlandı. Final kilitlemeye hazır.'
                          : '${draft.completedCount}/${draft.totalCount} madde tamamlandı, ${draft.missingCount} madde eksik.',
                      style: TextStyle(
                        color: draft.isComplete
                            ? AppColors.success
                            : AppColors.warning,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (record?.isLocked == true) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Final rapor kilitli. Normal usta düzenleyemez.',
                        style: TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: AppSizes.buttonHeight,
                      child: FilledButton.icon(
                        onPressed: draft.canLock && record?.isLocked != true
                            ? () => _lockFinalReport(draft)
                            : null,
                        icon: const Icon(Icons.lock),
                        label: const Text('Final Raporu Kilitle'),
                      ),
                    ),
                  ],
                ),
              ),
              for (final section in draft.sections)
                if (section.rows.isNotEmpty || section.missingItems.isNotEmpty)
                  _FinalReportSectionCard(section: section),
            ],
          ),
        );
      },
    );
  }

  Future<_FinalReportPreviewData> _load() async {
    if (AppRepositories.instance.remoteWorkOrders == null &&
        !AppRepositories.instance.hasLocalTestWorkOrders) {
      throw StateError(
        AppRepositories.instance.liveConnectionError ??
            'Canli veri baglantisi yok. Mock/local veri gosterilmiyor.',
      );
    }
    final builder = FinalReportBuilder(
      templateRepository: AppRepositories.instance.reportTemplates,
      reportRepository: AppRepositories.instance.workOrderReports,
    );
    final draft = await builder.build(widget.workOrderId);
    final repository = _repository;
    await repository.saveDraft(draft);
    final record = await repository.getLatest(widget.workOrderId);
    return _FinalReportPreviewData(draft: draft, record: record);
  }

  FinalReportRepository get _repository =>
      AppRepositories.instance.finalReports;

  Future<void> _lockFinalReport(FinalReportDraft draft) async {
    try {
      await _repository.lockFinalReport(draft);
      if (!mounted) {
        return;
      }
      setState(() {
        _future = _load();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Bad state: ', '')),
        ),
      );
    }
  }
}

class _FinalReportPreviewData {
  const _FinalReportPreviewData({
    required this.draft,
    required this.record,
  });

  final FinalReportDraft draft;
  final FinalReportRecord? record;
}

class _FinalReportSectionCard extends StatelessWidget {
  const _FinalReportSectionCard({required this.section});

  final FinalReportSection section;

  @override
  Widget build(BuildContext context) {
    return OtotrCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            section.group.title,
            style: const TextStyle(
              color: AppColors.darkText,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 12),
          for (final row in section.rows) _AnswerRow(row: row),
          if (section.missingItems.isNotEmpty) ...[
            const Divider(height: 24),
            const Text(
              'Eksik Maddeler',
              style: TextStyle(
                color: AppColors.warning,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            for (final item in section.missingItems.take(8))
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '- ${item.title}',
                  style: const TextStyle(color: AppColors.grayText),
                ),
              ),
            if (section.missingItems.length > 8)
              Text(
                '+${section.missingItems.length - 8} madde',
                style: const TextStyle(color: AppColors.grayText),
              ),
          ],
        ],
      ),
    );
  }
}

class _AnswerRow extends StatelessWidget {
  const _AnswerRow({required this.row});

  final FinalReportRow row;

  @override
  Widget build(BuildContext context) {
    final answer = row.answer;
    final value = [
      if (answer.selectedOptionLabels.isNotEmpty)
        answer.selectedOptionLabels.join(', '),
      if (answer.inputValues.values.any((item) => item.trim().isNotEmpty))
        answer.inputValues.values
            .where((item) => item.trim().isNotEmpty)
            .join(', '),
      if (answer.description.trim().isNotEmpty) answer.description.trim(),
      if (answer.imageUrls.isNotEmpty) '${answer.imageUrls.length} fotoğraf',
    ].join(' · ');

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            row.item.title,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 3),
          Text(
            value.isEmpty ? 'Kaydedildi' : value,
            style: const TextStyle(color: AppColors.grayText),
          ),
        ],
      ),
    );
  }
}
