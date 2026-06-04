# OTOTR Usta Mobil Uygulama — Codex Desktop Ana Prompt

Bu dosya, Codex Desktop içinde yeni bir sohbet/task açıldığında doğrudan kullanılacak ana talimattır.

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

- Mevcut repo yapısını bozma.
- Önce proje stack'ini tespit et.
- Eğer mevcut proje tek HTML prototip ise, yeni mobil uygulama dosyalarını ayrı ve temiz klasörde oluştur.
- Ana hedef klasör adı: `ototr-mobile-app` veya repo standardına en uygun ayrı mobil klasör.
- Uygulama temiz mobil arayüz olacak.
- Mümkünse Android debug APK üret.
- APK üretilemiyorsa nedeni ve kurulması gereken araçları net raporla.

## Uygulanacak ana ekranlar

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

## Tasarım özeti

- Koyu tema yok.
- Ana tema: beyaz + kırık beyaz + grafit + OTOTR kırmızısı.
- Üst alan beyaz başlayacak, aşağı indikçe pastel kırmızı yoğunluğu artacak.
- Zeminde çok hafif dalga/tarama/dot pattern olacak.
- Kartlar beyaz ama çiğ görünmeyecek; çok hafif gri dokulu olacak.
- Alt navigasyon: Ana Sayfa, İşlerim, Tara, Bildirimler, Profil.
- Ortadaki Tara butonu kırmızı, yuvarlak ve yükseltilmiş FAB olacak.

## Kesin yasaklar

- Google / Apple login ekleme.
- Kayıt ol ekranı ekleme.
- Usta tipi seçim alanı ekleme.
- Koyu tema üretme.
- Teknisyene rapor onaylatma.
- Mevcut ERP/CRM prototipini bozma.
- Gereksiz dependency ekleme.

## İş mantığı

- Kullanıcılar bayi portalından açılır.
- Teknisyen giriş yapar, şube seçer, iş emirlerini görür.
- İş emri teknik olarak `İşe Başlama Kanıtı` ile başlar.
- Bir modülü aynı anda iki usta düzenleyemez.
- Modül sahiplenme/kilit mantığı uygulanır.
- Usta görevi devredebilir.
- Müdür/teknik onay rolü modül devralabilir ve rapor onaylayabilir.
- Teknisyen raporu sadece teknik onaya gönderir.
- Rapor engelleyici eksikler çözülmeden teknik onaya gönderilemez.
- Fotoğraf, not ve ölçüm offline kuyruğa alınabilir.

## Teknoloji kararı

Repo yapısını incele ve karar ver:

- Mevcut mobil/Capacitor altyapısı varsa onu kullan.
- Yoksa hafif, temiz ve APK üretilebilir bir yapı kur.
- Öncelikli öneri: HTML/CSS/JS veya mevcut web stack + Capacitor Android.
- Android paket adı: `com.ototr.terminal` veya mevcut proje standardı.
- Uygulama adı: `OTOTR Usta` veya `OTOTR Terminal`.

## APK üretim beklentisi

Proje uygun ise:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

veya Flutter ise:

```bash
flutter pub get
flutter analyze
flutter build apk --debug
```

veya Native Android ise:

```bash
./gradlew assembleDebug
```

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
- Çalıştırılan komutlar
- Başarılı kontroller
- Başarısız kontroller
- APK üretildiyse yolu
- APK üretilemediyse nedeni
- Kalan riskler
- Sonraki önerilen adım

## Çalışma yöntemi

Önce kısa plan yaz. Sonra onay beklemeden uygula. Küçük adımlarla ilerle, her faz sonunda test/build çalıştır. Gereksiz dosya silme veya ana prototipi bozma.
