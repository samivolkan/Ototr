# OTOTR Android Mobil Uygulama Yol Planı

## Çalışma Prensipleri

- Gerçek müşteri verisi kullanılmayacak; sadece test ve demo veriyle ilerlenir.
- Firebase, push, deploy ve GitHub gönderimi kullanıcı açıkça onaylamadan yapılmaz.
- UI, veri modelleri, dummy data, servisler ve navigation ayrı tutulur.
- Öncelik şube operasyon hızıdır: araç kabul, müşteri kabul, paket, ekspertiz, kanıt, rapor, teslim.

## Aşama 1 - Yerel Flutter MVP

- Flutter proje iskeleti ve `lib/` feature yapısı.
- OTOTR premium enterprise tema sistemi.
- Login, şube dashboard, iş emirleri, araç/müşteri kabul, paket seçimi.
- Ekspertiz modülleri, checklist detayları, fotoğraf kanıtı, rapor önizleme.
- Dummy data ve Firebase placeholder servisleri.

## Aşama 2 - Android Çalıştırma ve QA

- Flutter SDK kurulumu veya PATH doğrulaması.
- `flutter pub get`, `flutter analyze`, `flutter run` kontrolleri.
- Android emulator üzerinde uçtan uca test:
  - Demo giriş
  - Yeni iş emri
  - Araç ve müşteri kabul
  - Paket seçimi
  - Modül checklist
  - Fotoğraf kanıtı
  - Rapor önizleme

## Aşama 3 - Veri ve Yetki Hazırlığı

- Rol bazlı ekran erişimi:
  - Karşılama Personeli
  - Ekspertiz Teknisyeni
  - Şube Müdürü
  - Genel Merkez Denetçisi
- Offline taslak kayıt modeli.
- Senkronizasyon kuyruğu.
- Fotoğraf yükleme kuyruğu.

## Aşama 4 - Firebase Entegrasyonuna Hazırlık

- Firebase Auth.
- Firestore branch/work-order/report koleksiyonları.
- Firebase Storage fotoğraf yükleme.
- Cloud Functions PDF rapor üretimi.
- Audit log ve QR doğrulama.

## Aşama 5 - Canlıya Yaklaşım

- KVKK ve yetkilendirme kontrolü.
- Gerçek bayi pilotu için test verilerinin temizlenmesi.
- Android release build.
- Kapalı test dağıtımı.
- Kullanıcı geri bildirimiyle operasyon iyileştirmeleri.
