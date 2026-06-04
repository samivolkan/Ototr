# OTOTR Usta Mobil Uygulama — Codex Faz Planı

Bu dosya Codex Desktop içinde uygulamayı kontrollü şekilde üretmek için faz planıdır.

## Faz 1 — Repo Analizi ve Temel Altyapı

Amaç:
- Repo yapısını incele.
- Mevcut ERP/CRM prototipini bozmadan mobil uygulama için temiz klasör yapısını belirle.
- Teknoloji kararını ver.
- Design system ve reusable component altyapısını kur.

Yapılacaklar:

```txt
- Proje stack tespiti
- Mobil uygulama klasörü oluşturma: ototr-mobile-app
- Theme/token sistemi
- AppScreen
- AppHeader
- BottomNavigation
- FloatingScanButton
- PrimaryButton / SecondaryButton / OutlineButton
- Card componentleri
- StatusBadge
- ProgressRing / ProgressBar
- Mock data iskeleti
```

Kontrol:
- Mevcut ana prototip bozulmadı mı?
- Yeni mobil klasör temiz mi?
- Lint/typecheck mümkünse çalıştı mı?

---

## Faz 2 — Giriş, Şube ve Dashboard

Ekranlar:

```txt
- Splash
- Giriş
- Şube Seçimi
- Şifre Sıfırlama
- Ana Sayfa / Dashboard
```

Kurallar:

```txt
- Google/Apple giriş yok.
- Kayıt ol yok.
- Usta tipi seçimi yok.
- Kullanıcı bayi portalından tanımlı.
- Şube seçimi desteklenir.
- Dashboard günlük usta kokpiti gibi çalışır.
```

---

## Faz 3 — İş Emri Ana Akışı

Ekranlar:

```txt
- İşlerim / İş Emri Listesi
- İş Emri Detay
- İşe Başlama Kanıtı
- Görev Modülleri
- Modül Sahiplenme / Kilitli Modül
- Görevi Devret
- Yetki Yok
```

Kritik kurallar:

```txt
- İşe başlama kanıtı olmadan teknik giriş başlamış sayılmaz.
- Aynı modülü iki usta düzenleyemez.
- Başka usta sadece görüntüler.
- Usta görevi devredebilir.
- Müdür devralma talebi desteklenir.
```

---

## Faz 4 — Modül, Madde ve Durum Girişi

Ekranlar:

```txt
- Modül Kontrolü
- Madde Detayı
- Durum Seçimi Modalı
- Rapor Engelleyici Eksik
- Müşteri Özeti
```

Kritik kurallar:

```txt
- Kaporta durum seçenekleri standart olacak.
- Eksik türleri ayrılacak: raporu engeller, uyarı, müdür onayıyla geçilebilir, opsiyonel.
- Müşteriye gösterilecek notlar ve iç teknik notlar ayrılacak.
```

---

## Faz 5 — Fotoğraf, Kanıt, Final ve Teknik Onay

Ekranlar:

```txt
- Fotoğraf & Kanıt Merkezi
- Fotoğraf Çekimi
- Fotoğraf Onay
- Fotoğraf Yükleme Hatası
- Eksik & Uyarı Merkezi
- Final Kontrol & Rapor
- Teknik Onaya Gönderildi / Bekliyor
- İş Emri Tamamlandı
- Onaydan Döndü / Düzeltme İstendi
```

Kritik kurallar:

```txt
- Zorunlu fotoğraf eksikse rapor teknik onaya gönderilemez.
- Teknisyen raporu onaylamaz, teknik onaya gönderir.
- Müdür/teknik onay onaylar veya düzeltme ister.
- Onaydan dönen maddeler doğrudan ilgili madde ekranına yönlenir.
```

---

## Faz 6 — Sistem Ekranları, QA ve APK

Ekranlar:

```txt
- Bildirimler
- Profil & Ayarlar
- Yetkilerim & Rol Bilgileri
- Offline & Senkronizasyon
- Senkronizasyon Hatası
- Boş Durumlar
- Teknik Destek / Yardım Merkezi
- Raporlar & Geçmiş
```

Son işlemler:

```txt
- QA checklist çalıştır.
- Lint/typecheck/test/build çalıştır.
- Debug APK üretmeye çalış.
- APK output yolunu raporla.
- APK üretilemezse eksik Android/Flutter/Node ortamını raporla.
```
