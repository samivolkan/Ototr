import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/report_template_model.dart';

class SupabaseWorkOrderReportDataSource {
  const SupabaseWorkOrderReportDataSource(this._client);

  final SupabaseClient _client;

  Future<List<WorkOrderReportAnswer>> fetchAnswers(String workOrderId) async {
    final rows = await _client
        .from('work_order_report_answers')
        .select()
        .eq('expertise_case_id', workOrderId)
        .order('updated_at');

    return [
      for (final row in _asRowList(rows)) _answer(row),
    ];
  }

  Future<WorkOrderReportAnswer?> fetchItemAnswer(
    String workOrderId,
    String itemId,
  ) async {
    final rows = await _client
        .from('work_order_report_answers')
        .select()
        .eq('expertise_case_id', workOrderId)
        .eq('item_id', itemId)
        .limit(1);
    final list = _asRowList(rows);
    return list.isEmpty ? null : _answer(list.first);
  }

  Future<WorkOrderReportAnswer> saveAnswer(
    WorkOrderReportAnswer answer,
  ) async {
    await _client.rpc('save_work_order_report_answer', params: {
      'target_case_id': answer.workOrderId,
      'target_template_id': answer.templateId,
      'target_group_id': answer.groupId,
      'target_item_id': answer.itemId,
      'target_nokta_id': answer.noktaId,
      'selected_option_ids': answer.selectedOptionIds,
      'selected_option_labels': answer.selectedOptionLabels,
      'input_values': answer.inputValues,
      'description_text': answer.description,
      'image_urls': answer.imageUrls,
      'answer_status': answer.status.name.toUpperCase(),
    });
    return fetchItemAnswer(answer.workOrderId, answer.itemId).then(
      (value) => value ?? answer,
    );
  }

  Future<void> lockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    await _client.rpc('lock_work_order_report_item', params: {
      'target_case_id': workOrderId,
      'target_item_id': itemId,
    });
  }

  Future<void> unlockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    await _client.rpc('unlock_work_order_report_item', params: {
      'target_case_id': workOrderId,
      'target_item_id': itemId,
    });
  }

  WorkOrderReportAnswer _answer(Map<String, Object?> row) {
    return WorkOrderReportAnswer(
      id: row['id']?.toString() ?? '',
      workOrderId: row['expertise_case_id']?.toString() ?? '',
      templateId: row['template_id']?.toString() ?? '',
      groupId: row['group_id']?.toString() ?? '',
      itemId: row['item_id']?.toString() ?? '',
      noktaId: _int(row['nokta_id']),
      selectedOptionIds: _stringList(row['selected_option_ids']),
      selectedOptionLabels: _stringList(row['selected_option_labels']),
      inputValues: _stringMap(row['input_values']),
      description: row['description']?.toString() ?? '',
      imageUrls: _stringList(row['image_urls']),
      status: row['status']?.toString() == 'COMPLETED'
          ? ReportAnswerStatus.completed
          : ReportAnswerStatus.draft,
      answeredByUserId: row['answered_by_user_id']?.toString() ?? '',
      answeredByRole: row['answered_by_role']?.toString() ?? '',
      startedAt: _date(row['started_at']) ?? DateTime.now(),
      completedAt: _date(row['completed_at']),
      updatedAt: _date(row['updated_at']) ?? DateTime.now(),
      lockedByUserId: row['locked_by_user_id']?.toString(),
      lockedAt: _date(row['locked_at']),
    );
  }

  List<Map<String, Object?>> _asRowList(Object? value) {
    if (value is List) {
      return [
        for (final item in value)
          if (item is Map) item.cast<String, Object?>(),
      ];
    }
    return const [];
  }

  List<String> _stringList(Object? value) {
    if (value is List) {
      return [for (final item in value) item.toString()];
    }
    return const [];
  }

  Map<String, String> _stringMap(Object? value) {
    if (value is Map) {
      return {
        for (final entry in value.entries)
          entry.key.toString(): entry.value?.toString() ?? '',
      };
    }
    return const {};
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
