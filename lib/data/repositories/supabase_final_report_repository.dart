import '../models/report_template_model.dart';
import '../remote/supabase_final_report_data_source.dart';
import 'final_report_repository.dart';

class SupabaseFinalReportRepository implements FinalReportRepository {
  const SupabaseFinalReportRepository(this._dataSource);

  final SupabaseFinalReportDataSource _dataSource;

  @override
  Future<FinalReportRecord?> getLatest(String workOrderId) {
    return _dataSource.fetchLatest(workOrderId);
  }

  @override
  Future<FinalReportRecord> saveDraft(FinalReportDraft draft) {
    return _dataSource.saveDraft(draft);
  }

  @override
  Future<FinalReportRecord> lockFinalReport(FinalReportDraft draft) {
    return _dataSource.lockFinalReport(draft);
  }
}
