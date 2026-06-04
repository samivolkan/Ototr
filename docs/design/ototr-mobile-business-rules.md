# OTOTR Usta Mobil Uygulama — İş Mantığı

Bu dosya Codex için mobil uygulamadaki rol, yetki, iş emri, modül, rapor, fotoğraf ve offline iş kurallarını tanımlar.

## 1. Kullanıcı ve Giriş

- Kullanıcılar mobil uygulamadan kayıt olmaz.
- Kullanıcı hesapları bayi portalı veya yönetici paneli üzerinden açılır.
- Google / Apple login yoktur.
- Usta tipi giriş ekranında seçilmez; kullanıcı profilinden gelir.
- Giriş: telefon/e-posta + şifre.

## 2. Roller

### Teknisyen / Usta

- İş emirlerini görür.
- İşe başlama kanıtı verir.
- Yetkili olduğu modülleri sahiplenir.
- Modül ve madde verilerini doldurur.
- Fotoğraf/kanıt ekler.
- Eksikleri giderir.
- Raporu teknik onaya gönderir.
- Nihai rapor onayı vermez.

### Müdür / Teknik Onay

- Raporları inceler.
- Raporu onaylar veya düzeltme ister.
- Gerekirse modül sahipliğini devralır.
- Usta görev devretme taleplerini görebilir.

### Bayi Portalı / Yönetici

- Kullanıcı hesabı açar.
- Personel tipi belirler.
- Yetkileri tanımlar.
- Şube erişimini tanımlar.

## 3. İşe Başlama Kanıtı

İş emri teknik olarak `İşe Başlama Kanıtı` ile başlar.

Kaydedilecek veriler:

- İş emri no
- Plaka / araç
- Usta bilgisi
- Şube / konum
- Tarih/saat
- Fotoğraf kanıtı
- Cihaz bilgisi opsiyonel

Bu işlem yapılmadan görev modülleri düzenlemeye açılmamalı veya kullanıcı net şekilde uyarılmalıdır.

## 4. Modül Sahiplenme / Kilit

- Sahiplenilmemiş modül düzenlenebilir.
- Modül bir usta tarafından sahiplenildiğinde kilitlenir.
- Başka usta aynı modülü düzenleyemez.
- Başka usta sadece görüntüleyebilir.
- Müdür devralabilir.
- Usta görevi devredebilir.

## 5. Görevi Devretme

Usta modülü devretmek istediğinde neden belirtir:

- Vardiya bitti
- Yetkim yok
- Ekipman arızası
- Müdür talebi
- Diğer

Devretme işlemi kayıt altına alınır.

## 6. Yetki Yok Durumu

Ustanın yetkili olmadığı modüllerde:

- Düzenleme kapalı olur.
- Sadece görüntüle seçeneği olabilir.
- Yetki talebi oluşturulabilir.
- Yetki onayı bayi portalı/yönetici tarafındadır.

## 7. Rapor Engelleyici Eksikler

Aşağıdaki eksikler çözülmeden rapor teknik onaya gönderilemez:

- Zorunlu fotoğraf eksik
- Zorunlu ölçüm değeri boş
- Zorunlu durum seçimi yapılmamış
- Test sürüşü tamamlanmamış
- OBD sonucu girilmemiş
- Teknik not zorunlu ise girilmemiş

Eksik türleri:

- Raporu engeller
- Uyarı olarak geçer
- Müdür onayıyla geçilebilir
- Opsiyonel

## 8. Fotoğraf ve Kanıt

Fotoğraf kalite durumları:

- Onaylandı
- İyileştirme gerekli
- Reddedilecek
- Çekilmedi
- Bulanık
- Yanlış kategori
- Eksik açı

Zorunlu kanıtlar:

- Araç ön görünüm
- Araç arka görünüm
- Sağ yan
- Sol yan
- Şasi etiketi
- Kilometre göstergesi
- Motor bölümü
- Boya ölçüm ekranı
- Hasarlı bölge
- Ruhsat / belge

## 9. Final ve Teknik Onay

- Teknisyen raporu teknik onaya gönderir.
- Teknisyen raporu onaylamaz.
- Müdür / teknik onay rolü raporu onaylar veya düzeltme ister.
- Onaydan dönen raporda onay veren notu ve düzeltilecek maddeler görünür.
- Düzeltmeler tamamlanınca tekrar teknik onaya gönderilir.

## 10. Müşteri Özeti

Müşteri özetinde şu ayrım olmalı:

- Müşteriye gösterilecek notlar
- Sadece iç kullanım teknik notları
- Müdüre özel notlar
- Rapor özetine dahil edilecek alanlar

## 11. Offline ve Senkronizasyon

- Fotoğraf, not, ölçüm ve madde durumları offline kuyruğa alınabilir.
- Bağlantı gelince senkronize edilir.
- Hata varsa kullanıcıya açık listelenir.
- Veriler cihazda güvende mesajı gösterilir.
- Fotoğraf yüklenemediğinde tekrar dene, sıkıştır ve yükle, offline kuyruğa al aksiyonları sunulur.

## 12. APK Hedefi

Codex proje stack'ini tespit edip debug APK üretmeye çalışmalıdır:

- Capacitor: npm install, build, npx cap sync android, Gradle debug APK.
- Flutter: flutter pub get, flutter analyze, flutter build apk --debug.
- Native Android: ./gradlew assembleDebug.
- React Native / Expo: mevcut Android build altyapısına göre debug APK.

Android SDK/Gradle yoksa eksik ortamı raporlar; kodu yine tamamlar.
