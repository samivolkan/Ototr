import 'dart:io';

import 'work_order_storage.dart';

WorkOrderStorageBackend createWorkOrderStorageBackend() =>
    _IoWorkOrderStorage();

class _IoWorkOrderStorage implements WorkOrderStorageBackend {
  File _file(String key) {
    final basePath = Platform.environment['APPDATA'] ??
        Platform.environment['LOCALAPPDATA'] ??
        Platform.environment['HOME'] ??
        Directory.systemTemp.path;
    final directory = Directory('$basePath${Platform.pathSeparator}OTOTR');
    if (!directory.existsSync()) {
      directory.createSync(recursive: true);
    }
    return File('${directory.path}${Platform.pathSeparator}$key.json');
  }

  @override
  String? read(String key) {
    final file = _file(key);
    if (!file.existsSync()) {
      return null;
    }
    return file.readAsStringSync();
  }

  @override
  void write(String key, String value) {
    final file = _file(key);
    file.writeAsStringSync(value, flush: true);
  }
}
