import '../dummy/dummy_data.dart';
import '../models/branch_model.dart';

class BranchService {
  Future<Branch> getCurrentBranch() async {
    // TODO: Firestore branch document okuma.
    return DummyData.branch;
  }
}
