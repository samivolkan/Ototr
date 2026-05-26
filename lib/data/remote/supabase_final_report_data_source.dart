import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/report_template_model.dart';

class SupabaseFinalReportDataSource {
  const SupabaseFinalReportDataSource(this._client);

  final SupabaseClient _client;

  Future<FinalReportRecord?> fetchLatest(String workOrderId) async {
    final row = await _client
        .from('final_reports')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('revision_no', ascending: false)
        .limit(1)
        .maybeSingle();
    return row == null ? null : _record(row);
  }

  Future<FinalReportRecord> saveDraft(FinalReportDraft draft) async {
    final row = await _client
        .from('final_reports')
        .upsert(
          {
            'expertise_case_id': draft.workOrderId,
            'template_id': draft.templateId,
            'revision_no': 1,
            'payload': draft.toPayload(),
            'status': 'DRAFT',
          },
          onConflict: 'expertise_case_id,revision_no',
        )
        .select()
        .single();
    return _record(row);
  }

  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft) async {
    if (!draft.canLock) {
      throw StateError(
          'Eksik maddeler tamamlanmadan final rapor kilitlenemez.');
    }
    final row = await _client
        .from('final_reports')
        .upsert(
          {
            'expertise_case_id': draft.workOrderId,
            'template_id': draft.templateId,
            'revision_no': 1,
            'payload': draft.toPayload(),
            'status': 'LOCKED',
            'locked_at': DateTime.now().toIso8601String(),
          },
          onConflict: 'expertise_case_id,revision_no',
        )
        .select()
        .single();
    return _record(row);
  }

  FinalReportRecord _record(Map<String, Object?> row) {
    final payload = row['payload'];
    return FinalReportRecord(
      id: row['id']?.toString() ?? '',
      workOrderId: row['expertise_case_id']?.toString() ?? '',
      templateId: row['template_id']?.toString() ?? '',
      revisionNo: _int(row['revision_no']),
      status: row['status']?.toString() == 'LOCKED'
          ? FinalReportStatus.locked
          : FinalReportStatus.draft,
      payload: payload is Map
          ? payload.cast<String, Object?>()
          : const <String, Object?>{},
      createdAt: _date(row['created_at']) ?? DateTime.now(),
      lockedAt: _date(row['locked_at']),
    );
  }

  DateTime? _date(Object? value) {
    if (value == null) {
      return null;
    }
    return DateTime.tryParse(value.toString());
  }

  int _int(Object? value) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
