import '../models/report_template_model.dart';
import '../remote/supabase_work_order_report_data_source.dart';
import 'work_order_report_repository.dart';

class SupabaseWorkOrderReportRepository implements WorkOrderReportRepository {
  const SupabaseWorkOrderReportRepository(this._dataSource);

  final SupabaseWorkOrderReportDataSource _dataSource;

  @override
  Future<List<WorkOrderReportAnswer>> getAnswers(String workOrderId) {
    return _dataSource.fetchAnswers(workOrderId);
  }

  @override
  Future<WorkOrderReportAnswer?> getItemAnswer(
    String workOrderId,
    String itemId,
  ) {
    return _dataSource.fetchItemAnswer(workOrderId, itemId);
  }

  @override
  Future<WorkOrderReportAnswer> saveAnswer(WorkOrderReportAnswer answer) {
    return _dataSource.saveAnswer(answer);
  }

  @override
  Future<void> lockItem(String workOrderId, String itemId, String userId) {
    return _dataSource.lockItem(workOrderId, itemId, userId);
  }

  @override
  Future<void> unlockItem(String workOrderId, String itemId, String userId) {
    return _dataSource.unlockItem(workOrderId, itemId, userId);
  }
}
