import '../models/technician_operation_model.dart';

class ReportConsistencyValidator {
  const ReportConsistencyValidator();

  List<ReportGateIssue> validate({
    required TechnicianWorkOrder workOrder,
    required List<OfflineSyncQueue> syncQueue,
  }) {
    return [
      ..._validateStartEvidence(workOrder),
      ..._validateTasks(workOrder.tasks),
      ..._validateFinalMedia(workOrder),
      ..._validateExternalQueries(workOrder),
      ..._validateGateFlags(workOrder),
    ];
  }

  List<ReportGateIssue> _validateStartEvidence(TechnicianWorkOrder workOrder) {
    if (workOrder.isStartEvidenceComplete) {
      return const [];
    }

    return [
      const ReportGateIssue(
        code: ReportGateIssueCode.startEvidenceMissing,
        message: 'Araç başlama iş emri tamamlanmadı.',
        evidenceRelated: true,
        fieldKey: 'start_evidence',
      ),
      for (final reason in workOrder.startEvidence?.missingReasons() ??
          const [
            'Şasi/VIN ve plaka fotoğrafı eksik.',
          ])
        ReportGateIssue(
          code: ReportGateIssueCode.startEvidenceMissing,
          message: reason,
          evidenceRelated: true,
          fieldKey: 'start_evidence',
        ),
    ];
  }

  List<ReportGateIssue> _validateFinalMedia(TechnicianWorkOrder workOrder) {
    if (workOrder.finalMediaAssets.isEmpty) {
      return const [
        ReportGateIssue(
          code: ReportGateIssueCode.taskMissingEvidence,
          message: 'Araç çevre fotoğraf ve video alanları hazırlanmadı.',
          fieldKey: 'final_media',
          evidenceRelated: true,
        ),
      ];
    }

    return [
      for (final asset in workOrder.finalMediaAssets)
        if (asset.isRequired && !asset.isAvailable)
          ReportGateIssue(
            code: ReportGateIssueCode.taskMissingEvidence,
            message: '${asset.title} rapor medyası eksik.',
            fieldKey: asset.reportFieldKey,
            evidenceRelated: true,
          ),
    ];
  }

  List<ReportGateIssue> _validateTasks(List<TechnicianTask> tasks) {
    final issues = <ReportGateIssue>[];

    for (final task in tasks) {
      final totalRows = task.checklistItems.length;
      final rowsComplete = totalRows > 0 && task.completedCount >= totalRows;
      final isCompleted = task.status == TaskStatus.completed || rowsComplete;
      if (!isCompleted) {
        issues.add(
          ReportGateIssue(
            code: ReportGateIssueCode.taskIncomplete,
            message: '${task.title} başlığı tamamlanmadı.',
            taskId: task.taskId,
            fieldKey: task.reportFieldKey,
          ),
        );
      }

      if (task.status == TaskStatus.managerReturned) {
        issues.add(
          ReportGateIssue(
            code: ReportGateIssueCode.taskReturnedByManager,
            message: '${task.title} müdür tarafından iade edildi.',
            taskId: task.taskId,
            fieldKey: task.reportFieldKey,
          ),
        );
      }

      if (task.status == TaskStatus.completed &&
          task.requiredFields.contains('customerFriendlyNote') &&
          task.customerFriendlyNote.trim().isEmpty) {
        issues.add(
          ReportGateIssue(
            code: ReportGateIssueCode.customerFriendlyNoteMissing,
            message: '${task.title} için müşteri dili özeti oluşturulmalı.',
            taskId: task.taskId,
            fieldKey: task.reportFieldKey,
          ),
        );
      }

      final hasRiskyFinding = task.checklistItems.any(
        (item) => item.result == TechnicianFindingResult.risky,
      );
      final saysProblemFree = _containsProblemFreeClaim(
        task.customerFriendlyNote,
      );
      if (hasRiskyFinding && saysProblemFree) {
        issues.add(
          ReportGateIssue(
            code: ReportGateIssueCode.finalSummaryConflict,
            message: '${task.title} müşteri özeti riskli bulguyla çelişiyor.',
            taskId: task.taskId,
            fieldKey: task.reportFieldKey,
          ),
        );
      }

      for (final item in task.checklistItems) {
        issues.addAll(_validateChecklistItem(task, item));
      }

      // Legacy task-level evidence is no longer a report gate blocker.
      // Vehicle-wide report media is validated in _validateFinalMedia, while
      // risky item-specific evidence is still checked per checklist item above.
    }

    return issues;
  }

  List<ReportGateIssue> _validateChecklistItem(
    TechnicianTask task,
    TechnicianChecklistItem item,
  ) {
    final issues = <ReportGateIssue>[];

    if (item.result == TechnicianFindingResult.risky &&
        item.note.trim().isEmpty) {
      issues.add(
        ReportGateIssue(
          code: ReportGateIssueCode.riskyFindingNeedsNote,
          message: '${item.title} için risk açıklaması girilmeli.',
          taskId: task.taskId,
          fieldKey: item.reportFieldKey,
        ),
      );
    }

    if (item.result == TechnicianFindingResult.risky &&
        item.requiresEvidenceOnRisk &&
        !item.hasEvidence) {
      issues.add(
        ReportGateIssue(
          code: ReportGateIssueCode.riskyFindingNeedsEvidence,
          message: '${item.title} için fotoğraf veya cihaz çıktısı eklenmeli.',
          taskId: task.taskId,
          fieldKey: item.reportFieldKey,
          evidenceRelated: true,
        ),
      );
    }

    if (item.result == TechnicianFindingResult.notDone &&
        item.notDoneReason.trim().isEmpty) {
      issues.add(
        ReportGateIssue(
          code: ReportGateIssueCode.notDoneNeedsReason,
          message: '${item.title} yapılamadıysa nedeni yazılmalı.',
          taskId: task.taskId,
          fieldKey: item.reportFieldKey,
        ),
      );
    }

    return issues;
  }

  List<ReportGateIssue> _validateExternalQueries(
    TechnicianWorkOrder workOrder,
  ) {
    if (workOrder.externalQueries.isEmpty) {
      return const [
        ReportGateIssue(
          code: ReportGateIssueCode.externalQueryPending,
          message: 'Dış sorgu bekliyor: Tramer/SBM ve KM verisi yok.',
          externalQueryRelated: true,
          fieldKey: 'external_queries',
        ),
      ];
    }

    return [
      for (final query in workOrder.externalQueries)
        if (query.isBlocking)
          ReportGateIssue(
            code: ReportGateIssueCode.externalQueryPending,
            message: query.blockingReason.isNotEmpty
                ? query.blockingReason
                : '${query.type} dış sorgusu bekliyor.',
            externalQueryRelated: true,
            fieldKey: 'external_queries.${query.type}',
          ),
    ];
  }

  List<ReportGateIssue> _validateGateFlags(TechnicianWorkOrder workOrder) {
    return [
      if (!workOrder.secretaryGateReady)
        const ReportGateIssue(
          code: ReportGateIssueCode.secretaryGateMissing,
          message: 'Sekreterya araç/müşteri girişleri tamamlanmadı.',
          fieldKey: 'secretary_gate',
        ),
      if (!workOrder.kvkkGateReady)
        const ReportGateIssue(
          code: ReportGateIssueCode.kvkkGateMissing,
          message: 'KVKK ve hizmet onayı blokajı var.',
          fieldKey: 'kvkk_gate',
        ),
      if (!workOrder.paymentGateReady)
        const ReportGateIssue(
          code: ReportGateIssueCode.paymentGateMissing,
          message: 'Ödeme/tahsilat blokajı var. Usta düzenleyemez.',
          fieldKey: 'payment_gate',
        ),
    ];
  }

  bool _containsProblemFreeClaim(String value) {
    final normalized = value.toLowerCase();
    return normalized.contains('sorunsuz') ||
        normalized.contains('risk yok') ||
        normalized.contains('problem yok');
  }
}
