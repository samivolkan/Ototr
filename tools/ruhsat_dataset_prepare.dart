import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';

const allowedExtensions = {'.jpg', '.jpeg', '.png', '.webp'};
const splits = ['TRAIN', 'VALIDATION', 'GOLDEN_TEST'];

void main(List<String> args) {
  if (args.length < 2) {
    stderr.writeln(
      'Usage: dart tools/ruhsat_dataset_prepare.dart <image_dir> <out_dir>',
    );
    exit(64);
  }
  final imageDir = Directory(args[0]);
  final outDir = Directory(args[1])..createSync(recursive: true);
  if (!imageDir.existsSync()) {
    stderr.writeln('Image directory not found: ${imageDir.path}');
    exit(66);
  }

  final files = imageDir
      .listSync(recursive: true)
      .whereType<File>()
      .where((file) => allowedExtensions.contains(_extension(file.path)))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));

  final rows = <Map<String, Object?>>[];
  for (final file in files) {
    final bytes = file.readAsBytesSync();
    final sha = sha256.convert(bytes).toString();
    final group = _documentGroup(file);
    rows.add({
      'id': sha.substring(0, 16),
      'document_group': group,
      'split': _splitForGroup(group),
      'sha256': sha,
      'local_path': file.absolute.path,
      'label_status': 'NEEDS_LABEL',
      'fields': {
        'plate': null,
        'vin': null,
        'engine_number': null,
        'brand': null,
        'commercial_name': null,
        'model_year': null,
        'type': null,
        'vehicle_type': null,
        'fuel_type': null,
        'color': null,
        'first_registration_date': null,
        'registration_date': null,
        'document_serial_no': null,
      },
    });
  }

  final manifest =
      File('${outDir.path}${Platform.pathSeparator}manifest.jsonl');
  manifest.writeAsStringSync(
    rows.map(jsonEncode).join('\n') + (rows.isEmpty ? '' : '\n'),
  );

  final template = File('${outDir.path}${Platform.pathSeparator}labels.csv');
  template.writeAsStringSync([
    'id,document_group,split,plate,vin,engine_number,brand,commercial_name,model_year,type,vehicle_type,fuel_type,color,first_registration_date,registration_date,document_serial_no',
    for (final row in rows)
      [
        row['id'],
        row['document_group'],
        row['split'],
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].map(_csv).join(','),
  ].join('\n'));

  stdout.writeln(
    'Prepared ${rows.length} ruhsat samples without copying raw images. Output: ${outDir.path}',
  );
}

String _extension(String path) {
  final dot = path.lastIndexOf('.');
  return dot == -1 ? '' : path.substring(dot).toLowerCase();
}

String _documentGroup(File file) {
  final name = file.uri.pathSegments.last.toLowerCase();
  final normalized = name
      .replaceAll(
          RegExp(r'(_|-)?(crop|blur|glare|rotate|rotated|page[0-9]+)'), '')
      .replaceAll(RegExp(r'\.[a-z0-9]+$'), '');
  return normalized.isEmpty ? file.parent.uri.pathSegments.last : normalized;
}

String _splitForGroup(String group) {
  final hash = group.codeUnits.fold<int>(0, (value, code) => value + code);
  final bucket = Random(hash).nextInt(100);
  if (bucket < 70) return splits[0];
  if (bucket < 90) return splits[1];
  return splits[2];
}

String _csv(Object? value) {
  final text = value?.toString() ?? '';
  return '"${text.replaceAll('"', '""')}"';
}
