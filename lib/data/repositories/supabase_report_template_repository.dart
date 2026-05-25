import '../models/report_template_model.dart';
import '../remote/supabase_report_template_data_source.dart';
import 'report_template_repository.dart';

class SupabaseReportTemplateRepository implements ReportTemplateRepository {
  const SupabaseReportTemplateRepository(this._dataSource);

  final SupabaseReportTemplateDataSource _dataSource;

  @override
  Future<ReportTemplate> getActiveTemplate() {
    return _dataSource.fetchActiveTemplate();
  }

  @override
  Future<List<ReportTemplateGroup>> getTemplateGroups(String templateId) async {
    return (await getActiveTemplate()).groups;
  }

  @override
  Future<List<ReportTemplateItem>> getTemplateItems(String groupId) async {
    return (await getActiveTemplate()).groupById(groupId).items;
  }

  @override
  Future<ReportTemplateItem> getItemDetail(String itemId) async {
    return (await getActiveTemplate()).itemById(itemId);
  }
}
