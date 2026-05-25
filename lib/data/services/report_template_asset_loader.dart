import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/report_template_model.dart';

class ReportTemplateAssetLoader {
  const ReportTemplateAssetLoader({
    this.assetPath = 'data/inspection_schema_normalized.json',
  });

  final String assetPath;

  Future<ReportTemplate> load() async {
    final raw = await rootBundle.loadString(assetPath);
    final json = jsonDecode(raw) as Map<String, Object?>;
    return parse(json);
  }

  ReportTemplate parse(Map<String, Object?> json) {
    final metadata = _map(json['metadata']);
    final groupsRaw = _list(json['inspectionGroups']);
    final itemsRaw = _list(json['inspectionItems']);
    final optionsRaw = _list(json['inspectionOptions']);
    final inputsRaw = _list(json['inspectionInputFields']);
    final mediaRaw = _list(json['inspectionMediaRequirements']);

    final optionsByItem = <String, List<ReportTemplateOption>>{};
    for (final row in optionsRaw) {
      final option = _option(row);
      optionsByItem.putIfAbsent(option.itemId, () => []).add(option);
    }

    final inputsByItem = <String, List<ReportTemplateInputField>>{};
    for (final row in inputsRaw) {
      final input = _input(row);
      inputsByItem.putIfAbsent(input.itemId, () => []).add(input);
    }

    final mediaMaxByItem = <String, int>{};
    for (final row in mediaRaw) {
      final itemId = row['itemId']?.toString() ?? '';
      if (itemId.isEmpty) {
        continue;
      }
      mediaMaxByItem[itemId] = _int(row['maxImages'], fallback: 0);
    }

    final itemsByGroup = <String, List<ReportTemplateItem>>{};
    for (final row in itemsRaw) {
      final item = _item(
        row,
        optionsByItem[row['id']?.toString() ?? ''] ?? const [],
        inputsByItem[row['id']?.toString() ?? ''] ?? const [],
        mediaMaxByItem[row['id']?.toString() ?? ''] ?? 0,
      );
      itemsByGroup.putIfAbsent(item.groupId, () => []).add(item);
    }

    final groups = [
      for (final row in groupsRaw)
        _group(row, itemsByGroup[row['id']?.toString() ?? ''] ?? const []),
    ]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    return ReportTemplate(
      id: 'otorapor-${metadata['raporID'] ?? '2614045'}',
      name: 'OTOTR Ekspertiz Rapor Şablonu',
      version: metadata['generatedAt']?.toString() ?? 'v1',
      sourceReportId: metadata['raporID']?.toString() ?? '2614045',
      isActive: true,
      groups: groups,
    );
  }

  ReportTemplateGroup _group(
    Map<String, Object?> row,
    List<ReportTemplateItem> items,
  ) {
    final sortedItems = [...items]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final code = row['code']?.toString() ?? '';
    return ReportTemplateGroup(
      id: row['id']?.toString() ?? '',
      title: row['displayName']?.toString().trim().isNotEmpty == true
          ? row['displayName'].toString()
          : row['name']?.toString() ?? '',
      code: code,
      sortOrder: _int(row['sortOrder']),
      pointInfo: row['description']?.toString() ?? '',
      assignedRole: _assignedRoleForGroup(code),
      items: sortedItems,
    );
  }

  ReportTemplateItem _item(
    Map<String, Object?> row,
    List<ReportTemplateOption> options,
    List<ReportTemplateInputField> inputs,
    int maxImages,
  ) {
    final sortedOptions = [...options]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final sortedInputs = [...inputs]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final requiresMedia = row['requiresMedia'] == true || maxImages > 0;
    return ReportTemplateItem(
      id: row['id']?.toString() ?? '',
      groupId: row['groupId']?.toString() ?? '',
      noktaId: _int(row['legacyNoktaId']),
      title: row['name']?.toString() ?? '',
      modalTitle: row['name']?.toString() ?? '',
      sortOrder: _int(row['sortOrder']),
      formUrl: row['legacyFormUrl']?.toString() ?? '',
      itemType: row['inputType']?.toString() ?? 'note',
      hasOptions: sortedOptions.isNotEmpty,
      hasInputs: sortedInputs.isNotEmpty,
      hasDescription: true,
      hasImages: requiresMedia,
      maxImages:
          maxImages == 0 ? _int(row['maxImages'], fallback: 0) : maxImages,
      options: sortedOptions,
      inputFields: sortedInputs,
    );
  }

  ReportTemplateOption _option(Map<String, Object?> row) {
    final color = _colorType(row['color']?.toString() ?? '');
    return ReportTemplateOption(
      id: row['id']?.toString() ?? '',
      itemId: row['itemId']?.toString() ?? '',
      secenekId: _nullableInt(row['legacyOptionId']),
      label: row['label']?.toString() ?? '',
      sortOrder: _int(row['sortOrder']),
      inputName: row['inputName']?.toString() ?? 'Noktaradio',
      className: row['className']?.toString() ?? '',
      colorType: color,
      scoreType: _scoreType(color),
      isDefault: row['isDefault'] == true,
      disabled: row['disabled'] == true,
    );
  }

  ReportTemplateInputField _input(Map<String, Object?> row) {
    return ReportTemplateInputField(
      id: row['id']?.toString() ?? '',
      itemId: row['itemId']?.toString() ?? '',
      type: row['type']?.toString() ?? 'text',
      name: row['fieldName']?.toString() ?? row['name']?.toString() ?? '',
      label: row['label']?.toString() ?? '',
      placeholder: row['placeholder']?.toString() ?? '',
      value: row['value']?.toString() ?? '',
      sortOrder: _int(row['sortOrder']),
      required: row['required'] == true,
    );
  }

  String _assignedRoleForGroup(String code) {
    switch (code) {
      case 'BODY_PAINT_CHECKUP':
      case 'EXTERIOR_CONDITION':
      case 'INTERIOR_CHECKUP':
        return 'Kaporta Ustası';
      case 'MOTOR_CHECKUP':
      case 'MECHANICAL_CHECKUP':
      case 'HEAD_GASKET_LEAK_TEST':
        return 'Mekanik Usta';
      case 'OBD_ECU_TEST':
      case 'AIRBAG_CHECK':
        return 'OBD Ustası';
      case 'BRAKE_SUSPENSION_TEST':
      case 'DYNO_ROAD_TEST':
        return 'Test Operatörü';
      case 'WORK_ORDER_ACCEPTANCE':
      case 'VEHICLE_FILE_CHECK':
        return 'Sekreterya';
      default:
        return 'Usta Havuzu';
    }
  }

  ReportOptionColorType _colorType(String value) {
    switch (value.toLowerCase()) {
      case 'green':
      case 'renk-yesil':
        return ReportOptionColorType.green;
      case 'red':
      case 'renk-kirmizi':
        return ReportOptionColorType.red;
      case 'orange':
      case 'renk-turuncu':
        return ReportOptionColorType.orange;
      case 'gray':
      case 'renk-gri':
        return ReportOptionColorType.gray;
      default:
        return ReportOptionColorType.neutral;
    }
  }

  ReportOptionScoreType _scoreType(ReportOptionColorType color) {
    switch (color) {
      case ReportOptionColorType.green:
        return ReportOptionScoreType.positive;
      case ReportOptionColorType.red:
        return ReportOptionScoreType.negative;
      case ReportOptionColorType.orange:
        return ReportOptionScoreType.warning;
      case ReportOptionColorType.gray:
      case ReportOptionColorType.neutral:
        return ReportOptionScoreType.neutral;
    }
  }

  Map<String, Object?> _map(Object? value) {
    if (value is Map) {
      return value.cast<String, Object?>();
    }
    return const {};
  }

  List<Map<String, Object?>> _list(Object? value) {
    if (value is List) {
      return [
        for (final item in value)
          if (item is Map) item.cast<String, Object?>(),
      ];
    }
    return const [];
  }

  int _int(Object? value, {int fallback = 0}) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '') ?? fallback;
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
