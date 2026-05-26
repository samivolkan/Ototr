import 'work_order_storage_stub.dart'
    if (dart.library.html) 'work_order_storage_web.dart'
    if (dart.library.io) 'work_order_storage_io.dart';

abstract class WorkOrderStorageBackend {
  String? read(String key);

  void write(String key, String value);
}

WorkOrderStorageBackend createWorkOrderStorage() =>
    createWorkOrderStorageBackend();
