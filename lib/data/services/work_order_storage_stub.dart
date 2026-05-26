import 'work_order_storage.dart';

final Map<String, String> _memoryStorage = {};

WorkOrderStorageBackend createWorkOrderStorageBackend() =>
    _MemoryWorkOrderStorage();

class _MemoryWorkOrderStorage implements WorkOrderStorageBackend {
  @override
  String? read(String key) => _memoryStorage[key];

  @override
  void write(String key, String value) {
    _memoryStorage[key] = value;
  }
}
