# OTOTR Usta Mobil Uygulama — Codex Desktop Ana Prompt

Bu dosya, Codex Desktop içinde **samivolkan/Ototr** reposunda yeni task/sohbet açıldığında doğrudan kullanılacak ana talimattır.

## Görev

Bu repoda OTOTR Usta Mobil Uygulamasını eksiksiz, temiz, profesyonel ve APK üretilebilir hale getir.

Önce aşağıdaki dosyaları oku ve ana kaynak kabul et:

```txt
docs/design/ototr-mobile-design-system.md
docs/design/ototr-mobile-screen-spec.md
docs/design/ototr-mobile-business-rules.md
docs/codex/OTOTR_MOBILE_PHASES.md
docs/codex/OTOTR_MOBILE_QA_CHECKLIST.md
```

## Mutlak hedef

- Mevcut ERP/CRM prototipini bozma.
- Önce repo yapısını ve mevcut dosyaları incele.
- Eğer mevcut proje tek HTML prototip ise, mobil uygulamayı ayrı ve temiz klasörde oluştur.
- Ana hedef klasör adı: `ototr-mobile-app`.
- Hedef: temiz mobil UI + APK üretimine hazır Android yapı.
- Mümkünse debug APK üret.
- APK üretilemezse nedeni ve gereken kurulumları raporla.

## Tasarım standardı

- Koyu tema yok.
- Ana tema: beyaz + kırık beyaz + grafit + OTOTR kırmızısı.
- Üst alan beyaz başlar, aşağı indikçe pastel kırmızı yoğunluğu artar.
- Zeminde çok hafif dalga/tarama/dot pattern olur.
- Kartlar beyaz kalır ama düz/çiğ görünmez; çok hafif gri dokulu olur.
- Alt navigasyon: Ana Sayfa, İşlerim, Tara, Bildirimler, Profil.
- Ortadaki Tara butonu kırmızı, yuvarlak, yükseltilmiş FAB olur.

## Uygulanacak ekranlar

1. Splash
2. Giriş
3. Şube Seçimi
4. Şifre Sıfırlama
5. Ana Sayfa / Dashboard
6. İşlerim / İş Emri Listesi
7. İş Emri Detay
8. İşe Başlama Kanıtı
9. Görev Modülleri
10. Modül Sahiplenme / Kilitli Modül
11. Görevi Devret
12. Yetki Yok
13. Modül Kontrolü
14. Madde Detayı
15. Durum Seçimi Modalı
16. Fotoğraf & Kanıt Merkezi
17. Fotoğraf Çekimi
18. Fotoğraf Onay
19. Fotoğraf Yükleme Hatası
20. Eksik & Uyarı Merkezi
21. Rapor Engelleyici Eksik
22. Müşteri Özeti
23. Final Kontrol & Rapor
24. Teknik Onaya Gönderildi / Bekliyor
25. İş Emri Tamamlandı
26. Onaydan Döndü / Düzeltme İstendi
27. Bildirimler
28. Profil & Ayarlar
29. Yetkilerim & Rol Bilgileri
30. Offline & Senkronizasyon
31. Senkronizasyon Hatası
32. Boş Durumlar
33. Teknik Destek / Yardım Merkezi
34. Raporlar & Geçmiş

## İş mantığı

- Kullanıcılar bayi portalından açılır; mobilde kayıt ol yoktur.
- Google / Apple login yoktur.
- Usta tipi giriş ekranında seçilmez; kullanıcı profilinden gelir.
- İş emri teknik olarak `İşe Başlama Kanıtı` ile başlar.
- Aynı modülü iki usta aynı anda düzenleyemez.
- Modül sahiplenme/kilit mantığı uygulanır.
- Usta görevi devredebilir.
- Müdür/teknik onay rolü modül devralabilir.
- Teknisyen raporu onaylamaz; sadece teknik onaya gönderir.
- Rapor engelleyici eksikler çözülmeden teknik onaya gönderilemez.
- Fotoğraf, not ve ölçüm offline kuyruğa alınabilir.

## Teknik yaklaşım

Repo yapısını incele ve en temiz yolu seç:

- Mevcut mobil/Capacitor altyapısı varsa onu kullan.
- Yoksa `ototr-mobile-app` klasöründe yeni, bağımsız, temiz bir mobil PWA/Capacitor projesi kur.
- Uygulama adı: `OTOTR Usta` veya repo standardına göre `OTOTR Terminal`.
- Android paket adı: `com.ototr.terminal`.
- Mock data kullan.
- Backend/API entegrasyonu yapma; ileride bağlanacak şekilde temiz state/mock servis katmanı bırak.

## APK üretim beklentisi

Capacitor ise:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Flutter ise:

```bash
flutter pub get
flutter analyze
flutter build apk --debug
```

Native Android ise:

```bash
./gradlew assembleDebug
```

Android SDK/Gradle yoksa kodu tamamla, APK üretilemedi nedenini ve kurulması gerekenleri raporla.

## Kesin yasaklar

- Koyu tema üretme.
- Google/Apple giriş ekleme.
- Kayıt ol ekranı ekleme.
- Usta tipi seçim alanı ekleme.
- Teknisyene rapor onaylatma.
- Mevcut ERP/CRM prototipini bozma.
- Gereksiz dependency ekleme.

## Rapor

İş bitince şu dosyayı oluştur:

```txt
docs/codex/OTOTR_MOBILE_IMPLEMENTATION_REPORT.md
```

Raporda şunlar olmalı:

- Proje tipi
- Oluşturulan klasörler
- Değiştirilen dosyalar
- Oluşturulan ekranlar
- Oluşturulan componentler
- Mock data yapısı
- Routing değişiklikleri
- Çalıştırılan komutlar
- Başarılı kontroller
- Başarısız kontroller
- APK üretildiyse yolu
- APK üretilemediyse nedeni
- Kalan riskler
- Sonraki önerilen adım

## Başlama talimatı

Önce kısa plan yaz. Sonra onay beklemeden uygula. Küçük adımlarla ilerle. Her faz sonunda test/build çalıştır. Gereksiz dosya silme veya ana prototipi bozma.
