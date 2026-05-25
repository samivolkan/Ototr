import '../models/report_template_model.dart';

abstract class FinalReportRepository {
  Future<FinalReportRecord?> getLatest(String workOrderId);
  Future<FinalReportRecord> saveDraft(FinalReportDraft draft);
  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft);
}

class LocalFinalReportRepository implements FinalReportRepository {
  LocalFinalReportRepository._();

  static final LocalFinalReportRepository instance =
      LocalFinalReportRepository._();

  final Map<String, FinalReportRecord> _records = {};

  @override
  Future<FinalReportRecord?> getLatest(String workOrderId) async {
    return _records[workOrderId];
  }

  @override
  Future<FinalReportRecord> saveDraft(FinalReportDraft draft) async {
    final existing = _records[draft.workOrderId];
    if (existing?.isLocked == true) {
      return existing!;
    }
    final record = FinalReportRecord(
      id: existing?.id ?? 'local-final-${draft.workOrderId}',
      workOrderId: draft.workOrderId,
      templateId: draft.templateId,
      revisionNo: existing?.revisionNo ?? 1,
      status: FinalReportStatus.draft,
      payload: draft.toPayload(),
      createdAt: existing?.createdAt ?? DateTime.now(),
      lockedAt: null,
    );
    _records[draft.workOrderId] = record;
    return record;
  }

  @override
  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft) async {
    if (!draft.canLock) {
      throw StateError(
          'Eksik maddeler tamamlanmadan final rapor kilitlenemez.');
    }
    final existing = _records[draft.workOrderId];
    final record = FinalReportRecord(
      id: existing?.id ?? 'local-final-${draft.workOrderId}',
      workOrderId: draft.workOrderId,
      templateId: draft.templateId,
      revisionNo: existing?.revisionNo ?? 1,
      status: FinalReportStatus.locked,
      payload: draft.toPayload(),
      createdAt: existing?.createdAt ?? DateTime.now(),
      lockedAt: DateTime.now(),
    );
    _records[draft.workOrderId] = record;
    return record;
  }

  void reset() {
    _records.clear();
  }
}

class FallbackFinalReportRepository implements FinalReportRepository {
  const FallbackFinalReportRepository({
    required this.primary,
    required this.fallback,
  });

  final FinalReportRepository primary;
  final FinalReportRepository fallback;

  @override
  Future<FinalReportRecord?> getLatest(String workOrderId) async {
    try {
      return await primary.getLatest(workOrderId);
    } catch (_) {
      return fallback.getLatest(workOrderId);
    }
  }

  @override
  Future<FinalReportRecord> saveDraft(FinalReportDraft draft) async {
    try {
      return await primary.saveDraft(draft);
    } catch (_) {
      return fallback.saveDraft(draft);
    }
  }

  @override
  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft) async {
    try {
      return await primary.lockFinalReport(draft);
    } catch (_) {
      return fallback.lockFinalReport(draft);
    }
  }
}
