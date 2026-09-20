import 'dart:convert';
import 'dart:io';

const criticalFields = {'vin', 'engine_number', 'plate', 'model_year'};

void main(List<String> args) {
  if (args.length < 2) {
    stderr.writeln(
        'Usage: dart tools/ruhsat_eval.dart expected.jsonl predicted.jsonl');
    exit(64);
  }
  final expected = _readJsonl(args[0]);
  final predicted = _readJsonl(args[1]);
  final leaks = _findSplitLeaks(expected);
  if (leaks.isNotEmpty) {
    stderr.writeln(
        'Data leakage: same document_group in multiple splits: ${leaks.join(', ')}');
    exit(2);
  }
  final byId = {for (final row in predicted) row['id']: row};
  final metrics = <String, Map<String, num>>{};
  var criticalPerfect = 0;
  var criticalFalseAccept = 0;
  var autoAccept = 0;
  var manualReview = 0;
  var rescan = 0;

  for (final gold in expected) {
    final pred = byId[gold['id']] ?? const {};
    var criticalOk = true;
    for (final key in (gold['fields'] as Map).keys.cast<String>()) {
      final g = _norm(gold['fields'][key]);
      final p = _norm((pred['fields'] as Map?)?[key]);
      final state = ((pred['confidence'] as Map?)?[key] as Map?)?['state'];
      final bucket = metrics.putIfAbsent(
          key,
          () => {
                'exact': 0,
                'normalized_exact': 0,
                'missing': 0,
                'total': 0,
              });
      bucket['total'] = bucket['total']! + 1;
      if (g == p && g.isNotEmpty) bucket['exact'] = bucket['exact']! + 1;
      if (g.toUpperCase() == p.toUpperCase() && g.isNotEmpty) {
        bucket['normalized_exact'] = bucket['normalized_exact']! + 1;
      }
      if (p.isEmpty) bucket['missing'] = bucket['missing']! + 1;
      if (criticalFields.contains(key) && g != p) criticalOk = false;
      if (criticalFields.contains(key) &&
          state == 'AUTO_ACCEPT_CANDIDATE' &&
          g != p) {
        criticalFalseAccept++;
      }
      if (state == 'AUTO_ACCEPT_CANDIDATE') autoAccept++;
      if (state == 'REVIEW_REQUIRED') manualReview++;
      if (state == 'NOT_READ') rescan++;
    }
    if (criticalOk) criticalPerfect++;
  }

  stdout.writeln(jsonEncode({
    'primary_metric': 'Critical False Accept Rate',
    'critical_false_accept': criticalFalseAccept,
    'critical_field_perfect_rate': criticalPerfect / expected.length,
    'auto_accept_count': autoAccept,
    'manual_review_count': manualReview,
    'rescan_signal_count': rescan,
    'fields': metrics,
  }));
}

List<Map<String, dynamic>> _readJsonl(String path) {
  return File(path)
      .readAsLinesSync()
      .where((line) => line.trim().isNotEmpty)
      .map((line) => jsonDecode(line) as Map<String, dynamic>)
      .toList();
}

Set<String> _findSplitLeaks(List<Map<String, dynamic>> rows) {
  final splitByGroup = <String, Set<String>>{};
  for (final row in rows) {
    final group = row['document_group']?.toString();
    final split = row['split']?.toString();
    if (group == null || split == null) continue;
    splitByGroup.putIfAbsent(group, () => <String>{}).add(split);
  }
  return {
    for (final entry in splitByGroup.entries)
      if (entry.value.length > 1) entry.key,
  };
}

String _norm(Object? value) => value?.toString().trim() ?? '';
