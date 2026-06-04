# OTOTR Usta Mobil Uygulama — Ekran Şartnamesi

Bu dosya Codex için ekran ekran uygulanacak nihai şartnamedir. Görseller varsa `docs/design/screens` altında referans olarak kullanılabilir. İş mantığı ve metin hiyerarşisi bu dosyaya göre uygulanmalıdır.

## Genel Akış

```txt
Splash
→ Giriş
→ Şube Seçimi
→ Ana Sayfa
→ İşlerim
→ İş Emri Detay
→ İşe Başlama Kanıtı
→ Görev Modülleri
→ Modül Sahiplenme / Kilit
→ Modül Kontrolü
→ Madde Detayı
→ Durum Seçimi
→ Fotoğraf / Kanıt
→ Eksik & Uyarı
→ Final Kontrol
→ Teknik Onaya Gönderildi
→ Onaydan Döndü ise Düzeltme
→ İş Emri Tamamlandı
```

## 1. Splash

Alanlar:
- OTOTR logo
- Tarafsız Araç Ekspertizi
- Premium araç görseli
- Kırmızı enerji/dalga efekti
- Güvenli bağlantı kuruluyor...
- Progress bar
- Versiyon: v2.4.1

## 2. Giriş

Alanlar:
- Telefon / E-posta
- Şifre
- Beni Hatırla
- Şifremi Unuttum
- Giriş Yap
- Teknik Destek
- Kullanıcı bilgileriniz bayi portalı üzerinden tanımlanır açıklaması

Kurallar:
- Google / Apple giriş yok.
- Kayıt ol yok.
- Usta tipi seçimi yok.
- Personel tipi kullanıcı profilinden gelir.

## 3. Şube Seçimi

Alanlar:
- Bursa Küçük Sanayi
- Bursa Nilüfer
- İstanbul Avrupa
- İzmir
- Varsayılan şube seç
- Şube değiştir
- Devam Et

Kurallar:
- Seçili şube kırmızı border/radio ile belirtilir.
- Varsayılan şube toggle/badge kırmızı olur.

## 4. Şifre Sıfırlama

Akış:
- Telefon/e-posta girişi
- Doğrulama kodu
- Yeni şifre
- Başarılı ekran
- Yardım / Teknik Destek alanı

## 5. Ana Sayfa / Dashboard

Alanlar:
- Merhaba, Ahmet Usta
- Ekspertiz Teknisyeni
- Tarih
- Şube
- Bildirim ikonu
- Günlük özet kartları
- Öne çıkan iş emri
- Bugünkü plan
- Hızlı işlemler
- Alt navigasyon

Özet kartları:
- Aktif İş Emri
- Bugün Tamamlanan
- Eksik / Uyarı
- Teknik Onayda

## 6. İşlerim / İş Emri Listesi

Alanlar:
- Arama
- Filtre
- Tümü / Devam Eden / Bekleyen / Tamamlanan / Eksik sekmeleri
- Stat kartları
- Sıralama: Son Güncellenen
- Liste/grid toggle
- İş emri kartları

Kart alanları:
- Araç görseli
- Plaka
- İş emri no
- Marka/model
- Araç detayları
- Son güncelleme
- Progress ring
- İnce progress bar
- Durum etiketi
- Eksik sayısı
- Kanıt sayısı

## 7. İş Emri Detay

Alanlar:
- Araç özet kartı
- İlerleme özeti
- Müşteri/randevu
- Paket bilgisi
- Görev modülleri
- Devam Et
- Eksikleri Gör
- Not Ekle
- Rapor Önizle

## 8. İşe Başlama Kanıtı

İş Emri Detay ile Görev Modülleri arasına konumlanır.

Alanlar:
- İş emri no
- Araç/plaka
- Şube
- Fotoğraf kanıtı
- Fotoğrafı yenile
- Konum/şube doğrulama
- Tarih/saat
- Teknik Girişi Başlat

Kurallar:
- Bu işlem yapıldığında iş emri teknik olarak başlamış sayılır.
- Kayıt zaman damgası ve usta bilgisiyle saklanır.

## 9. Görev Modülleri

Modüller:
- Kaporta
- Motor
- Mekanik
- Elektrik / OBD
- Airbag
- İç Mekan
- Test Sürüşü
- Final Kontrol

## 10. Modül Sahiplenme / Kilitli Modül

Alanlar:
- Modül sahiplenilmiş uyarısı
- Sahiplenen usta
- Saat/tarih
- Modül durumu
- Sadece görüntüle
- Görevi devret
- Müdür devralma talebi
- Sahiplen ve düzenlemeye başla

Kurallar:
- Aynı modülü iki usta aynı anda düzenleyemez.
- Başka usta sadece görüntüler.
- Müdür devralabilir.
- Usta görevi devredebilir.

## 11. Görevi Devret

Alanlar:
- İş emri
- Modül
- Devretme nedeni
- Açıklama
- Kanıt opsiyonel
- Görevi Devret

Nedenler:
- Vardiya bitti
- Yetkim yok
- Ekipman arızası
- Müdür talebi
- Diğer

## 12. Yetki Yok

Alanlar:
- Bu işlem için yetkiniz yok
- Mevcut yetkiniz
- Sadece görüntüle
- Yetki talebi oluştur
- Müdüre mesaj gönder
- Geri dön

## 13. Modül Kontrolü

Alanlar:
- Modül başlığı
- İş emri özeti
- Modül progress
- Sekmeler
- Arama
- Filtre
- Kategori chipleri
- Madde listesi
- Alt özet
- Sonraki modül

## 14. Madde Detayı

Alanlar:
- Madde adı
- Kontrol listesi
- Kanıt fotoğrafları
- Not
- Eksik / Uyarı ekle
- Sonraki madde

## 15. Durum Seçimi Modalı

Seçenekler:
- Orijinal
- Lokal Boyalı
- Boyalı
- Değişen
- Sök-Tak
- Hasarlı
- Kontrol Edilemedi

Kurallar:
- Modal/bottom sheet olarak açılır.
- Seçili durum kırmızı border/radio ile gösterilir.
- Seçimi Uygula primary kırmızı olur.

## 16. Fotoğraf & Kanıt Merkezi

Alanlar:
- Araç özeti
- Kanıt istatistikleri
- Kategori filtreleri
- Galeri grid
- Yeni fotoğraf/belge ekle

## 17. Fotoğraf Çekimi

Alanlar:
- Kamera preview
- Rehber overlay
- Zorunlu kanıt
- İlgili madde
- Fotoğraf sayacı
- Flaş / Kılavuz / Tekrar
- Galeri / Çevir
- İptal / Fotoğrafı Kullan

## 18. Fotoğraf Onay

Alanlar:
- Fotoğraf kalite özeti
- Gruplar
- Eksik çekim kutuları
- İyileştirme önerileri
- Fotoğrafları onayla

## 19. Fotoğraf Yükleme Hatası

Alanlar:
- Fotoğraf yüklenemedi
- Dosya boyutu çok büyük
- İnternet bağlantısı zayıf
- Desteklenmeyen dosya formatı
- Tekrar dene
- Sıkıştır ve yükle
- Offline kuyruğa al
- İptal

## 20. Eksik & Uyarı Merkezi

Alanlar:
- Araç özeti
- Eksik/Uyarı/Çözülen
- Liste
- Fotoğraf ekle
- İlgili ekrana git

## 21. Rapor Engelleyici Eksik

Alanlar:
- Raporu Engelleyen Eksikler
- Engelleyici / Uyarılar / Bilgilendirme
- Eksik listesi
- Düzenle butonları
- Eksikleri gider ve devam et

Kurallar:
- Engelleyici eksikler çözülmeden rapor teknik onaya gönderilemez.

## 22. Müşteri Özeti

Alanlar:
- Genel durum
- Önemli bulgular
- Uyarılar
- Müşteriye gösterilecek notlar
- Teknik notlar sadece iç kullanım
- Özeti rapora dahil et

## 23. Final Kontrol & Rapor

Kurallar:
- Teknisyen için ana buton: Raporu Teknik Onaya Gönder.
- Yönetici için ana buton: Raporu Onayla & Kapat.

## 24. Teknik Onaya Gönderildi / Bekliyor

Alanlar:
- Teknik Onaya Gönderildi
- Teknik Onay Bekleniyor
- İş emri bilgileri
- Özet metrikler
- Timeline
- Rapor Önizle
- İşlerime Dön

## 25. İş Emri Tamamlandı

Alanlar:
- İş emri tamamlandı
- Rapor görüntüle
- Paylaş
- Araç özeti
- İş akışı
- Ana sayfaya dön

## 26. Onaydan Döndü

Alanlar:
- Düzeltme uyarısı
- Düzeltilecek maddeler
- Onay veren notu
- Ne yapmalısınız?
- Düzeltmeleri tamamla

## 27. Bildirimler

Alanlar:
- Okunmamış
- Okundu
- Önemli
- Toplam
- Kategori filtreleri
- Bildirim listesi

## 28. Profil & Ayarlar

Alanlar:
- Profil kartı
- Performans
- Hesap ayarları
- Uygulama ayarları
- Destek
- Çıkış yap

## 29. Yetkilerim & Rol Bilgileri

Alanlar:
- Yetki alanları
- Aktif / kısıtlı / pasif
- Yetki oranı
- Talep oluştur

## 30. Offline & Senkronizasyon

Alanlar:
- Bağlantı durumu
- Senkronizasyon özeti
- Offline kayıtlar
- Verileriniz güvende

## 31. Senkronizasyon Hatası

Alanlar:
- Senkronizasyon hatası
- Yüklenemeyen kayıtlar
- Şimdi senkronize et
- Sadece Wi-Fi ile yükle

## 32. Boş Durum

Alanlar:
- Uygun iş emri bulunamadı
- Filtreleri temizle
- Tüm iş emirlerini gör
- Öneriler

## 33. Teknik Destek / Yardım Merkezi

Alanlar:
- Yardım merkezi
- SSS
- Makale detayı
- Canlı destek
- Destek talebi
- Bize ulaşın
- Destek taleplerim

## 34. Raporlar & Geçmiş

Alanlar:
- Arama
- Filtre
- Rapor listesi
- Görüntüle
- İndir
- Paylaş
