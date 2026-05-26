// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

import 'work_order_storage.dart';

WorkOrderStorageBackend createWorkOrderStorageBackend() =>
    _WebWorkOrderStorage();

class _WebWorkOrderStorage implements WorkOrderStorageBackend {
  @override
  String? read(String key) => html.window.localStorage[key];

  @override
  void write(String key, String value) {
    html.window.localStorage[key] = value;
  }
}
