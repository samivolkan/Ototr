import '../dummy/dummy_data.dart';
import '../models/user_profile_model.dart';

class AuthService {
  Future<UserProfile> demoLogin() async {
    // TODO: Firebase Auth entegrasyonu geldiğinde gerçek oturum açma burada yapılacak.
    return DummyData.user;
  }

  Future<void> logout() async {
    // TODO: Firebase oturum kapatma ve token temizleme.
  }
}
