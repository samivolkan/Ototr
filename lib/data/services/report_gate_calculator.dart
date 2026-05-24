import '../models/technician_operation_model.dart';

class ReportGateCalculator {
  const ReportGateCalculator();

  ReportGateResult calculate({
    required TechnicianWorkOrder workOrder,
    required List<OfflineSyncQueue> syncQueue,
  }) {
    final blockingReasons = <String>[];
    final missingEvidence = <String>[];
    final missingExternalQueries = <String>[];

    if (!workOrder.isStartEvidenceComplete) {
      blockingReasons.add('Başlangıç kanıtı tamamlanmadı.');
      missingEvidence.addAll(
        workOrder.startEvidence?.missingReasons() ??
            [
              'Şasi/VIN, plaka fotoğrafı, KM değeri ve KM ekran fotoğrafı eksik.',
            ],
      );
    }

    for (final task in workOrder.tasks) {
      if (task.status != TaskStatus.completed) {
        blockingReasons.add('${task.title} başlığı tamamlanmadı.');
      }
      final taskMissing = task.missingReasons();
      if (taskMissing.isNotEmpty) {
        missingEvidence.addAll(taskMissing);
      }
      if (task.status == TaskStatus.managerReturned) {
        blockingReasons.add('${task.title} müdür tarafından iade edildi.');
      }
    }

    for (final query in workOrder.externalQueries) {
      if (query.isBlocking) {
        final reason = query.blockingReason.isNotEmpty
            ? query.blockingReason
            : '${query.type} dış sorgusu bekliyor.';
        missingExternalQueries.add(reason);
        blockingReasons.add(reason);
      }
    }

    if (workOrder.externalQueries.isEmpty) {
      const reason = 'Dış sorgu bekliyor: Tramer/SBM ve KM verisi yok.';
      missingExternalQueries.add(reason);
      blockingReasons.add(reason);
    }

    if (!workOrder.secretaryGateReady) {
      blockingReasons.add('Sekreterya araç/müşteri girişleri tamamlanmadı.');
    }
    if (!workOrder.kvkkGateReady) {
      blockingReasons.add('KVKK ve hizmet onayı blokajı var.');
    }
    if (!workOrder.paymentGateReady) {
      blockingReasons.add('Ödeme/tahsilat blokajı var. Usta düzenleyemez.');
    }
    if (!workOrder.managerApproved) {
      blockingReasons.add('Müdür kalite onayı bekleniyor.');
    }

    final pendingSyncItems = syncQueue
        .where((item) => item.status != SyncQueueStatus.synced)
        .toList();
    if (pendingSyncItems.isNotEmpty) {
      blockingReasons.add(
        '${pendingSyncItems.length} kritik kayıt senkron bekliyor.',
      );
    }

    final status = _statusFor(
      blockingReasons: blockingReasons,
      missingExternalQueries: missingExternalQueries,
      pendingSyncItems: pendingSyncItems,
      managerApproved: workOrder.managerApproved,
    );

    return ReportGateResult(
      isReady: blockingReasons.isEmpty,
      status: status,
      blockingReasons: blockingReasons,
      missingEvidence: missingEvidence,
      missingExternalQueries: missingExternalQueries,
      managerApprovalRequired: !workOrder.managerApproved,
      pendingSyncItems: pendingSyncItems,
      lastCalculatedAt: DateTime.now(),
    );
  }

  ReportGateStatus _statusFor({
    required List<String> blockingReasons,
    required List<String> missingExternalQueries,
    required List<OfflineSyncQueue> pendingSyncItems,
    required bool managerApproved,
  }) {
    if (blockingReasons.isEmpty) {
      return ReportGateStatus.ready;
    }
    if (pendingSyncItems.isNotEmpty) {
      return ReportGateStatus.syncPending;
    }
    if (missingExternalQueries.isNotEmpty) {
      return ReportGateStatus.externalQueryPending;
    }
    if (!managerApproved) {
      return ReportGateStatus.managerApprovalRequired;
    }
    return ReportGateStatus.blocked;
  }
}
