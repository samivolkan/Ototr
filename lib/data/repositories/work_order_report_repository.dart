import '../models/report_template_model.dart';

abstract class WorkOrderReportRepository {
  Future<List<WorkOrderReportAnswer>> getAnswers(String workOrderId);
  Future<WorkOrderReportAnswer?> getItemAnswer(
    String workOrderId,
    String itemId,
  );
  Future<WorkOrderReportAnswer> saveAnswer(WorkOrderReportAnswer answer);
  Future<void> lockItem(String workOrderId, String itemId, String userId);
  Future<void> unlockItem(String workOrderId, String itemId, String userId);
}

class LocalWorkOrderReportRepository implements WorkOrderReportRepository {
  LocalWorkOrderReportRepository._();

  static final LocalWorkOrderReportRepository instance =
      LocalWorkOrderReportRepository._();

  final Map<String, Map<String, WorkOrderReportAnswer>> _answers = {};
  final Map<String, Map<String, String>> _locks = {};

  @override
  Future<List<WorkOrderReportAnswer>> getAnswers(String workOrderId) async {
    return _answers[workOrderId]?.values.toList(growable: false) ?? const [];
  }

  @override
  Future<WorkOrderReportAnswer?> getItemAnswer(
    String workOrderId,
    String itemId,
  ) async {
    return _answers[workOrderId]?[itemId];
  }

  @override
  Future<WorkOrderReportAnswer> saveAnswer(
    WorkOrderReportAnswer answer,
  ) async {
    final owner = _locks[answer.workOrderId]?[answer.itemId];
    if (owner != null && owner != answer.answeredByUserId) {
      throw StateError('Bu madde başka bir usta tarafından düzenleniyor.');
    }
    _answers.putIfAbsent(answer.workOrderId, () => {})[answer.itemId] = answer;
    return answer;
  }

  @override
  Future<void> lockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    final locks = _locks.putIfAbsent(workOrderId, () => {});
    final owner = locks[itemId];
    if (owner != null && owner != userId) {
      throw StateError('Bu madde başka bir usta tarafından düzenleniyor.');
    }
    locks[itemId] = userId;
  }

  @override
  Future<void> unlockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    final locks = _locks[workOrderId];
    if (locks == null) {
      return;
    }
    if (locks[itemId] == userId) {
      locks.remove(itemId);
    }
  }

  void reset() {
    _answers.clear();
    _locks.clear();
  }
}

class FallbackWorkOrderReportRepository implements WorkOrderReportRepository {
  const FallbackWorkOrderReportRepository({
    required this.primary,
    required this.fallback,
  });

  final WorkOrderReportRepository primary;
  final WorkOrderReportRepository fallback;

  @override
  Future<List<WorkOrderReportAnswer>> getAnswers(String workOrderId) async {
    try {
      return await primary.getAnswers(workOrderId);
    } catch (_) {
      return fallback.getAnswers(workOrderId);
    }
  }

  @override
  Future<WorkOrderReportAnswer?> getItemAnswer(
    String workOrderId,
    String itemId,
  ) async {
    try {
      return await primary.getItemAnswer(workOrderId, itemId);
    } catch (_) {
      return fallback.getItemAnswer(workOrderId, itemId);
    }
  }

  @override
  Future<WorkOrderReportAnswer> saveAnswer(
    WorkOrderReportAnswer answer,
  ) async {
    try {
      return await primary.saveAnswer(answer);
    } catch (_) {
      return fallback.saveAnswer(answer);
    }
  }

  @override
  Future<void> lockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    try {
      await primary.lockItem(workOrderId, itemId, userId);
    } catch (_) {
      await fallback.lockItem(workOrderId, itemId, userId);
    }
  }

  @override
  Future<void> unlockItem(
    String workOrderId,
    String itemId,
    String userId,
  ) async {
    try {
      await primary.unlockItem(workOrderId, itemId, userId);
    } catch (_) {
      await fallback.unlockItem(workOrderId, itemId, userId);
    }
  }
}
