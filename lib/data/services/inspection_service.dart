import '../dummy/dummy_data.dart';
import '../models/inspection_module_model.dart';

class InspectionService {
  Future<List<InspectionModule>> getModules() async {
    // TODO: Firestore checklist ve modül sonuçları ile değiştirilecek.
    return DummyData.modules;
  }
}
