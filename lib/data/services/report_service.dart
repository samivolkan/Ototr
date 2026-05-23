import '../dummy/dummy_data.dart';
import '../models/report_model.dart';

class ReportService {
  Future<Report> getPreviewReport() async {
    // TODO: Cloud Functions PDF üretimi ve rapor revizyonları eklenecek.
    return DummyData.report;
  }
}
