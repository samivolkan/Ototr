import '../models/report_template_model.dart';
import '../services/report_template_asset_loader.dart';

abstract class ReportTemplateRepository {
  Future<ReportTemplate> getActiveTemplate();
  Future<List<ReportTemplateGroup>> getTemplateGroups(String templateId);
  Future<List<ReportTemplateItem>> getTemplateItems(String groupId);
  Future<ReportTemplateItem> getItemDetail(String itemId);
}

class AssetReportTemplateRepository implements ReportTemplateRepository {
  AssetReportTemplateRepository({
    this.loader = const ReportTemplateAssetLoader(),
  });

  final ReportTemplateAssetLoader loader;
  ReportTemplate? _cache;

  @override
  Future<ReportTemplate> getActiveTemplate() async {
    return _cache ??= await loader.load();
  }

  @override
  Future<List<ReportTemplateGroup>> getTemplateGroups(String templateId) async {
    return (await getActiveTemplate()).groups;
  }

  @override
  Future<List<ReportTemplateItem>> getTemplateItems(String groupId) async {
    final template = await getActiveTemplate();
    return template.groupById(groupId).items;
  }

  @override
  Future<ReportTemplateItem> getItemDetail(String itemId) async {
    return (await getActiveTemplate()).itemById(itemId);
  }
}

class FallbackReportTemplateRepository implements ReportTemplateRepository {
  const FallbackReportTemplateRepository({
    required this.primary,
    required this.fallback,
  });

  final ReportTemplateRepository primary;
  final ReportTemplateRepository fallback;

  @override
  Future<ReportTemplate> getActiveTemplate() async {
    try {
      return await primary.getActiveTemplate();
    } catch (_) {
      return fallback.getActiveTemplate();
    }
  }

  @override
  Future<List<ReportTemplateGroup>> getTemplateGroups(String templateId) async {
    try {
      return await primary.getTemplateGroups(templateId);
    } catch (_) {
      return fallback.getTemplateGroups(templateId);
    }
  }

  @override
  Future<List<ReportTemplateItem>> getTemplateItems(String groupId) async {
    try {
      return await primary.getTemplateItems(groupId);
    } catch (_) {
      return fallback.getTemplateItems(groupId);
    }
  }

  @override
  Future<ReportTemplateItem> getItemDetail(String itemId) async {
    try {
      return await primary.getItemDetail(itemId);
    } catch (_) {
      return fallback.getItemDetail(itemId);
    }
  }
}
