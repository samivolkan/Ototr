import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/report_template_model.dart';

class SupabaseReportTemplateDataSource {
  const SupabaseReportTemplateDataSource(this._client);

  final SupabaseClient _client;

  Future<ReportTemplate> fetchActiveTemplate() async {
    final templateRow = _asRow(
      await _client
          .from('report_templates')
          .select()
          .eq('is_active', true)
          .order('created_at', ascending: false)
          .limit(1)
          .single(),
    );
    final templateId = templateRow['id'].toString();

    final results = await Future.wait<Object?>([
      _client
          .from('report_template_groups')
          .select()
          .eq('template_id', templateId)
          .order('sort_order', ascending: true),
      _client
          .from('report_template_items')
          .select()
          .eq('template_id', templateId)
          .order('sort_order', ascending: true),
      _client
          .from('report_template_item_options')
          .select()
          .eq('template_id', templateId)
          .order('sort_order', ascending: true),
      _client
          .from('report_template_item_inputs')
          .select()
          .eq('template_id', templateId)
          .order('sort_order', ascending: true),
    ]);

    final groups = _asRowList(results[0]);
    final items = _asRowList(results[1]);
    final options = _asRowList(results[2]);
    final inputs = _asRowList(results[3]);

    final optionsByItem = <String, List<ReportTemplateOption>>{};
    for (final row in options) {
      final option = _option(row);
      optionsByItem.putIfAbsent(option.itemId, () => []).add(option);
    }

    final inputsByItem = <String, List<ReportTemplateInputField>>{};
    for (final row in inputs) {
      final input = _input(row);
      inputsByItem.putIfAbsent(input.itemId, () => []).add(input);
    }

    final itemsByGroup = <String, List<ReportTemplateItem>>{};
    for (final row in items) {
      final itemId = row['id'].toString();
      final item = _item(
        row,
        optionsByItem[itemId] ?? const [],
        inputsByItem[itemId] ?? const [],
      );
      itemsByGroup.putIfAbsent(item.groupId, () => []).add(item);
    }

    return ReportTemplate(
      id: templateId,
      name: templateRow['name']?.toString() ?? '',
      version: templateRow['version']?.toString() ?? '',
      sourceReportId: templateRow['source_report_id']?.toString() ?? '',
      isActive: templateRow['is_active'] == true,
      groups: [
        for (final row in groups)
          ReportTemplateGroup(
            id: row['id'].toString(),
            title: row['title']?.toString() ?? '',
            code: row['code']?.toString() ?? '',
            sortOrder: _int(row['sort_order']),
            pointInfo: row['point_info']?.toString() ?? '',
            assignedRole: row['assigned_role']?.toString() ?? '',
            items: itemsByGroup[row['id'].toString()] ?? const [],
          ),
      ],
    );
  }

  ReportTemplateItem _item(
    Map<String, Object?> row,
    List<ReportTemplateOption> options,
    List<ReportTemplateInputField> inputs,
  ) {
    return ReportTemplateItem(
      id: row['id'].toString(),
      groupId: row['group_id'].toString(),
      noktaId: _int(row['nokta_id']),
      title: row['title']?.toString() ?? '',
      modalTitle: row['modal_title']?.toString() ?? '',
      sortOrder: _int(row['sort_order']),
      formUrl: row['form_url']?.toString() ?? '',
      itemType: row['item_type']?.toString() ?? '',
      hasOptions: row['has_options'] == true,
      hasInputs: row['has_inputs'] == true,
      hasDescription: row['has_description'] == true,
      hasImages: row['has_images'] == true,
      maxImages: _int(row['max_images']),
      options: options,
      inputFields: inputs,
    );
  }

  ReportTemplateOption _option(Map<String, Object?> row) {
    final color = _colorType(row['color_type']?.toString() ?? '');
    return ReportTemplateOption(
      id: row['id'].toString(),
      itemId: row['item_id'].toString(),
      secenekId: _nullableInt(row['secenek_id']),
      label: row['label']?.toString() ?? '',
      sortOrder: _int(row['sort_order']),
      inputName: row['input_name']?.toString() ?? '',
      className: row['class_name']?.toString() ?? '',
      colorType: color,
      scoreType: _scoreType(row['score_type']?.toString() ?? '', color),
      isDefault: row['is_default'] == true,
      disabled: row['disabled'] == true,
    );
  }

  ReportTemplateInputField _input(Map<String, Object?> row) {
    return ReportTemplateInputField(
      id: row['id'].toString(),
      itemId: row['item_id'].toString(),
      type: row['type']?.toString() ?? 'text',
      name: row['name']?.toString() ?? '',
      label: row['label']?.toString() ?? '',
      placeholder: row['placeholder']?.toString() ?? '',
      value: row['value']?.toString() ?? '',
      sortOrder: _int(row['sort_order']),
      required: row['is_required'] == true,
    );
  }

  ReportOptionColorType _colorType(String value) {
    switch (value.toLowerCase()) {
      case 'green':
        return ReportOptionColorType.green;
      case 'red':
        return ReportOptionColorType.red;
      case 'orange':
        return ReportOptionColorType.orange;
      case 'blue':
        return ReportOptionColorType.blue;
      case 'gray':
        return ReportOptionColorType.gray;
      default:
        return ReportOptionColorType.neutral;
    }
  }

  ReportOptionScoreType _scoreType(
    String value,
    ReportOptionColorType color,
  ) {
    switch (value.toLowerCase()) {
      case 'positive':
        return ReportOptionScoreType.positive;
      case 'negative':
        return ReportOptionScoreType.negative;
      case 'warning':
        return ReportOptionScoreType.warning;
      case 'neutral':
        return ReportOptionScoreType.neutral;
      default:
        switch (color) {
          case ReportOptionColorType.green:
            return ReportOptionScoreType.positive;
          case ReportOptionColorType.red:
            return ReportOptionScoreType.negative;
          case ReportOptionColorType.orange:
          case ReportOptionColorType.blue:
            return ReportOptionScoreType.warning;
          case ReportOptionColorType.gray:
          case ReportOptionColorType.neutral:
            return ReportOptionScoreType.neutral;
        }
    }
  }

  Map<String, Object?> _asRow(Object? value) {
    if (value is Map) {
      return value.cast<String, Object?>();
    }
    throw StateError('Supabase row map bekleniyordu.');
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

  int _int(Object? value) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  int? _nullableInt(Object? value) {
    if (value == null) {
      return null;
    }
    if (value is int) {
      return value;
    }
    return int.tryParse(value.toString());
  }
}
