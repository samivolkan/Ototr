# OTOTR Usta Mobil Uygulama — Ekran Şartnamesi

Bu dosya Codex için ekran ekran uygulanacak nihai şartnamedir. Görseller daha sonra eklenirse `docs/design/screens` altında referans olarak kullanılabilir. İş mantığı ve metin hiyerarşisi bu dosyaya göre uygulanmalıdır.

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

---

# 1. Splash

İçerik:
- OTOTR logo
- Tarafsız Araç Ekspertizi
- Premium araç görseli veya sade araç silueti
- Kırmızı enerji/dalga efekti
- `Güvenli bağlantı kuruluyor...`
- Progress bar
- Versiyon: `v2.4.1`

Kabul:
- Ferah açık zemin.
- Üst beyaz, alt pastel kırmızı geçiş.
- Koyu tema yok.

---

# 2. Giriş

Alanlar:
- OTOTR logo
- Hesabınıza Giriş Yapın
- Bayi portalı üzerinden tanımlanan kullanıcı bilgilerinizle giriş yapın.
- Telefon / E-posta
- Şifre
- Beni Hatırla
- Şifremi Unuttum
- Giriş Yap
- Teknik Destek
- Kullanıcı bilgileriniz bayi portalı üzerinden tanımlanır.

Kurallar:
- Google / Apple giriş yok.
- Kayıt ol yok.
- Usta tipi seçimi yok.
- Personel tipi kullanıcı profilinden gelir.

---

# 3. Şube Seçimi

Alanlar:
- Çalışacağınız Şubeyi Seçin
- Bursa Küçük Sanayi
- Bursa Nilüfer
- İstanbul Avrupa
- İzmir
- Varsayılan şube seç
- Şube değiştir
- Devam Et

Kabul:
- Seçili şube kırmızı border ve radio ile belli olur.
- Varsayılan şube toggle kırmızı kullanır.
- Şube kapasite veya durum bilgisi küçük metinle gösterilebilir.

---

# 4. Şifre Sıfırlama

Akış:
1. Telefon/e-posta girişi
2. Doğrulama kodu gönderme
3. 6 haneli kod doğrulama
4. Yeni şifre oluşturma
5. Başarılı ekranı

Kurallar:
- Primary aksiyon OTOTR kırmızısıdır.
- Başarı için yeşil kullanılabilir.
- Mavi ana tema yapılmaz.

---

# 5. Ana Sayfa / Dashboard

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

Günlük özet kartları:
- Aktif İş Emri
- Bugün Tamamlanan
- Eksik / Uyarı
- Teknik Onayda

Öne çıkan iş emri:
- Plaka
- Araç marka/model
- Durum etiketi
- İlerleme yüzdesi
- Devam Et

---

# 6. İşlerim / İş Emri Listesi

Alanlar:
- İşlerim başlığı
- Tüm iş emri ve durum bilgisi
- Arama: Plaka, Şasi No, Müşteri veya İş Emri No
- Filtrele
- Tümü / Devam Eden / Bekleyen / Tamamlanan / Eksik
- Stat kartları
- Sıralama: Son Güncellenen
- Liste/grid toggle
- İş emri kartları

Kart alanları:
- Araç görseli
- Plaka
- İş emri no
- Marka/model
- Yıl / motor / kilometre
- Son güncelleme
- Progress ring
- İnce progress bar
- Durum etiketi
- Eksik sayısı
- Kanıt sayısı

Kabul:
- Liste alanı verimli kullanılmalı.
- Araç görseli çok büyük olmamalı.
- Progress bar ince olmalı.

---

# 7. İş Emri Detay

Alanlar:
- Geri butonu
- İş Emri Detayı
- Bildirim ikonu
- Araç özet kartı
- Plaka
- İş emri no
- Araç marka/model
- Yıl / yakıt / vites / renk / kilometre / paket
- İlerleme özeti
- Müşteri / randevu bilgisi
- Paket kapsamı
- Görev modülleri
- Devam Et
- Eksikleri Gör
- Not Ekle
- Rapor Önizle

Kabul:
- Birincil CTA: `Devam Et`.
- Teknisyen için rapor onaylama yok.

---

# 8. İşe Başlama Kanıtı

İş Emri Detay ile Görev Modülleri arasına konumlanır.

Alanlar:
- İş emri no
- Araç/plaka
- Şube
- Fotoğraf kanıtı
- Fotoğrafı yenile
- Konum/şube doğrulama
- Tarih/saat
- Usta bilgisi
- Teknik Girişi Başlat

Kurallar:
- Bu işlem yapıldığında iş emri teknik olarak başlamış sayılır.
- Kayıt zaman damgası ve usta bilgisiyle saklanır.
- Offline durumda başlatma yapılamaz veya açık uyarı gösterilir.

---

# 9. Görev Modülleri

Modüller:
- Kaporta
- Motor
- Mekanik
- Elektrik / OBD
- Airbag
- İç Mekan
- Test Sürüşü
- Final Kontrol

Her kart:
- İkon
- Modül adı
- Tamamlanan / toplam madde
- Progress
- Durum etiketi
- Sahiplenen usta bilgisi
- Devam Et

---

# 10. Modül Sahiplenme / Kilitli Modül

Alanlar:
- Modül sahiplenilmiş uyarısı
- Sahiplenen usta
- Saat/tarih
- Modül durumu
- Sahiplen ve düzenlemeye başla
- Sadece görüntüle
- Görevi devret
- Müdür devralma talebi

Kurallar:
- Aynı modülü iki usta aynı anda düzenleyemez.
- Başka usta sadece görüntüler.
- Müdür devralabilir.
- Usta görevi devredebilir.

---

# 11. Görevi Devret

Alanlar:
- İş emri
- Modül
- Devretme nedeni
- Açıklama
- Kanıt opsiyonel
- Görevi Devret
- Müdüre bildir

Nedenler:
- Vardiya bitti
- Yetkim yok
- Ekipman arızası
- Müdür talebi
- Diğer

---

# 12. Yetki Yok

Alanlar:
- Bu işlem için yetkiniz yok
- Mevcut yetkiniz
- Sadece görüntüle
- Yetki talebi oluştur
- Müdüre mesaj gönder
- Geri dön

---

# 13. Modül Kontrolü

Alanlar:
- Modül başlığı
- İş emri özeti
- Modül progress
- Tümü / Tamamlanan / Eksik / Uyarı sekmeleri
- Arama
- Filtre
- Kategori chipleri
- Madde listesi
- Alt sabit özet
- Sonraki modül

---

# 14. Madde Detayı

Alanlar:
- Madde adı
- Modül
- Öncelik
- Tahmini süre
- Kontrol listesi
- Kanıt fotoğrafları
- Not
- Eksik / Uyarı ekle
- Not ekle
- Kaydet
- Sonraki madde

---

# 15. Durum Seçimi Modalı

Seçenekler:
- Orijinal
- Lokal Boyalı
- Boyalı
- Değişen
- Sök-Tak
- Hasarlı
- Kontrol Edilemedi

Kabul:
- Bottom sheet/modal olarak açılır.
- Arka plan dim/blur.
- Seçili durum kırmızı border/radio.
- Seçimi Uygula primary kırmızı.

---

# 16. Fotoğraf & Kanıt Merkezi

Alanlar:
- Araç özeti
- Toplam kanıt
- Onaylanan
- Eksik / Uyarı
- Bekleyen
- Kategori filtreleri
- Galeri grid
- Yeni fotoğraf / belge ekle

---

# 17. Fotoğraf Çekimi

Alanlar:
- Kamera preview
- Çekim rehberi overlay
- Zorunlu kanıt etiketi
- İlgili madde
- Fotoğraf sayacı
- Flaş
- Kılavuz
- Tekrar
- Galeri
- Çevir
- İptal
- Fotoğrafı Kullan

Kurallar:
- Gerçek kamera entegrasyonu MVP dışı ise mock preview kullanılabilir.
- UI gerçek kamera akışına hazır olmalı.

---

# 18. Fotoğraf Onay

Alanlar:
- Araç özeti
- Fotoğraf kalite uyarısı
- Onaylanmaya hazır
- İyileştirme gerekli
- Reddedilecek
- Çekilmedi
- Fotoğraf grupları
- Eksik çekim kutuları
- İyileştirme önerileri
- Fotoğrafları Onayla

---

# 19. Fotoğraf Yükleme Hatası

Alanlar:
- Fotoğraf yüklenemedi
- Dosya boyutu çok büyük
- İnternet bağlantısı zayıf
- Desteklenmeyen dosya formatı
- Tekrar dene
- Sıkıştır ve yükle
- Offline kuyruğa al
- İptal

---

# 20. Eksik & Uyarı Merkezi

Alanlar:
- Araç özeti
- Eksik / Uyarı / Çözülen filtreleri
- Kritik etiketleri
- Eksik fotoğraf ekle
- İlgili ekrana git
- İşleme devam et

Sıralama:
1. Raporu engelleyen eksik
2. Eksik fotoğraf
3. Eksik ölçüm
4. Eksik not
5. Uyarı

---

# 21. Rapor Engelleyici Eksik

Alanlar:
- Raporu Engelleyen Eksikler
- Engelleyici / Uyarılar / Bilgilendirme sekmeleri
- Eksik listesi
- Düzenle butonları
- Eksikleri gider ve devam et

Kural:
- Engelleyici eksikler çözülmeden rapor teknik onaya gönderilemez.

---

# 22. Müşteri Özeti

Alanlar:
- Genel durum
- Önemli bulgular
- Uyarılar
- Müşteriye gösterilecek notlar
- Teknik notlar sadece iç kullanım
- Özeti rapora dahil et

---

# 23. Final Kontrol & Rapor

Alanlar:
- Araç özeti
- Kontrol özeti
- Son durum
- Rapor önizleme
- Rapor içeriği
- Teknik not
- Ana aksiyonlar

Rol kuralı:
- Teknisyen: Raporu Teknik Onaya Gönder
- Yönetici: Raporu Onayla & Kapat

---

# 24. Teknik Onaya Gönderildi / Bekliyor

Alanlar:
- Teknik Onaya Gönderildi
- Teknik Onay Bekleniyor
- İş emri bilgileri
- Özet metrikler
- Timeline
- Bilgi kartı
- Rapor Önizle
- İşlerime Dön

---

# 25. İş Emri Tamamlandı

Alanlar:
- İş emri tamamlandı
- Rapor görüntüle
- Paylaş
- Araç özeti
- Özet metrikler
- İş akışı
- Ana sayfaya dön
- Yeni iş emri
- Rapor geçmişi

---

# 26. Onaydan Döndü / Düzeltme İstendi

Alanlar:
- Araç özeti
- Düzeltme uyarısı
- Düzeltilecek maddeler
- Teknik onay notu
- Ne yapmalısınız rehberi
- Rapor önizle
- Taslak kaydet
- Düzeltmeleri tamamla

---

# 27. Bildirimler

Alanlar:
- Okunmamış
- Okundu
- Önemli
- Toplam
- Kategori filtreleri
- Bildirim listesi
- Bildirim tercihleri
- Tümünü okundu işaretle

---

# 28. Profil & Ayarlar

Alanlar:
- Profil kartı
- Rol
- Teknisyen ID
- İletişim
- Performans
- Hesap ayarları
- Uygulama ayarları
- Destek
- Çıkış yap

---

# 29. Yetkilerim & Rol Bilgileri

Alanlar:
- Yetki alanları
- Aktif / kısıtlı / pasif
- Yetki oranı
- Yetki geçmişi
- Yetki talep geçmişi

Kural:
- Usta yetki değiştiremez; sadece talep oluşturabilir.

---

# 30. Offline & Senkronizasyon

Alanlar:
- Bağlantı durumu
- Son senkronizasyon
- Senkronizasyon özeti
- Offline kayıtlar
- Verileriniz güvende

---

# 31. Senkronizasyon Hatası

Alanlar:
- Senkronizasyon hatası
- Yüklenemeyen kayıtlar
- Tekrar dene
- Şimdi senkronize et
- Hataları gör
- Sadece Wi-Fi ile yükle

---

# 32. Boş Durum / Arama Sonucu Yok

Alanlar:
- Uygun iş emri bulunamadı
- Filtreleri temizle
- Tüm iş emirlerini gör
- Öneriler

Boş durum tipleri:
- İş emri yok
- Bildirim yok
- Kanıt fotoğrafı yok
- Arama sonucu yok
- Offline kayıt yok

---

# 33. Teknik Destek / Yardım Merkezi

Alanlar:
- Yardım merkezi
- SSS
- Makale detayı
- Canlı destek
- Destek talebi
- Bize ulaşın
- Destek taleplerim

---

# 34. Raporlar & Geçmiş

Alanlar:
- Arama
- Filtre
- Rapor listesi
- Görüntüle
- İndir
- Paylaş
