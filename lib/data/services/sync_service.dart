import '../models/technician_operation_model.dart';

class SyncService {
  final List<OfflineSyncQueue> _queue = [];
  final Set<String> _syncedIdempotencyKeys = {};

  List<OfflineSyncQueue> get pendingQueue => List.unmodifiable(_queue);

  Future<String> syncLater() async {
    // TODO: Sonradan Firebase sync, bağlantı durumuna göre tetiklenecek.
    return 'Senkronizasyon bekliyor';
  }

  OfflineSyncQueue queueOperation({
    required String operationType,
    required String workOrderId,
    required String taskId,
    required Map<String, Object?> payload,
    required String idempotencyKey,
  }) {
    final existing = _queue.where(
      (item) => item.idempotencyKey == idempotencyKey,
    );
    if (existing.isNotEmpty || _syncedIdempotencyKeys.contains(idempotencyKey)) {
      return existing.isNotEmpty
          ? existing.first
          : OfflineSyncQueue(
              queueId: 'already-synced-$idempotencyKey',
              operationType: operationType,
              workOrderId: workOrderId,
              taskId: taskId,
              payload: payload,
              idempotencyKey: idempotencyKey,
              retryCount: 0,
              lastError: '',
              createdAt: DateTime.now(),
              syncedAt: DateTime.now(),
              status: SyncQueueStatus.synced,
            );
    }

    final queued = OfflineSyncQueue(
      queueId: 'queue-${_queue.length + 1}',
      operationType: operationType,
      workOrderId: workOrderId,
      taskId: taskId,
      payload: payload,
      idempotencyKey: idempotencyKey,
      retryCount: 0,
      lastError: '',
      createdAt: DateTime.now(),
      syncedAt: null,
      status: SyncQueueStatus.pending,
    );
    _queue.add(queued);
    return queued;
  }

  Future<List<OfflineSyncQueue>> flushQueue() async {
    final syncedItems = <OfflineSyncQueue>[];
    for (var index = 0; index < _queue.length; index++) {
      final item = _queue[index];
      if (_syncedIdempotencyKeys.contains(item.idempotencyKey)) {
        _queue[index] = item.copyWith(
          syncedAt: DateTime.now(),
          status: SyncQueueStatus.synced,
        );
        continue;
      }

      // Sıra: teknik form payload -> fotoğraf metadata -> dosya upload -> rapor kapısı.
      _syncedIdempotencyKeys.add(item.idempotencyKey);
      _queue[index] = item.copyWith(
        syncedAt: DateTime.now(),
        status: SyncQueueStatus.synced,
      );
      syncedItems.add(_queue[index]);
    }
    return syncedItems;
  }

  bool wasSubmitted(String idempotencyKey) {
    return _syncedIdempotencyKeys.contains(idempotencyKey) ||
        _queue.any((item) => item.idempotencyKey == idempotencyKey);
  }

  void reset() {
    _queue.clear();
    _syncedIdempotencyKeys.clear();
  }
}
