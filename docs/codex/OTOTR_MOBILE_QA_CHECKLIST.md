# OTOTR Usta Mobil Uygulama — QA ve Kabul Checklist

Bu dosya Codex’in işi bitirdikten sonra kontrol edeceği kalite listesidir.

## 1. Genel UI Kontrolü

- [ ] Uygulama koyu tema değil.
- [ ] Ana zemin üstte beyaz başlıyor, aşağı indikçe pastel kırmızı yoğunlaşıyor.
- [ ] Zemin dalga/tarama/dot pattern çok hafif ve kurumsal.
- [ ] Kartlar beyaz ama çiğ/düz görünmüyor; hafif gri dokulu.
- [ ] Ana CTA’lar OTOTR kırmızısı.
- [ ] Mavi renk ana tema olarak kullanılmıyor.
- [ ] Türkçe karakterler doğru.
- [ ] 360–430 px mobil genişliklerde taşma yok.
- [ ] Safe area dikkate alındı.
- [ ] Alt navigasyon tüm ana ekranlarda tutarlı.
- [ ] Ortadaki Tara FAB kırmızı, yuvarlak ve yükseltilmiş.

## 2. Giriş ve Oturum

- [ ] Splash ekranı var.
- [ ] Giriş ekranı var.
- [ ] Google / Apple giriş yok.
- [ ] Kayıt ol ekranı yok.
- [ ] Usta tipi seçim alanı yok.
- [ ] Telefon / e-posta ve şifre alanları var.
- [ ] Beni Hatırla var.
- [ ] Şifremi Unuttum var.
- [ ] Teknik Destek var.
- [ ] Şube Seçimi var.
- [ ] Şifre Sıfırlama akışı var.

## 3. Ana Akış

- [ ] Dashboard var.
- [ ] İşlerim / İş Emri Listesi var.
- [ ] İş Emri Detay var.
- [ ] İşe Başlama Kanıtı var.
- [ ] Görev Modülleri var.
- [ ] Modül Kontrolü var.
- [ ] Madde Detayı var.
- [ ] Durum Seçimi Modalı var.

## 4. Operasyon Güvenliği

- [ ] İşe başlama kanıtı olmadan teknik giriş başlamıyor veya kullanıcı uyarılıyor.
- [ ] Modül sahiplenme/kilit mantığı var.
- [ ] Aynı modülü iki usta düzenleyemiyor.
- [ ] Başka usta sahiplenmiş modül sadece görüntülenebiliyor.
- [ ] Görevi Devret ekranı var.
- [ ] Yetki Yok ekranı var.
- [ ] Müdür devralma talebi veya devralma bilgisi var.

## 5. Fotoğraf ve Kanıt

- [ ] Fotoğraf & Kanıt Merkezi var.
- [ ] Fotoğraf Çekimi ekranı var.
- [ ] Fotoğraf Onay ekranı var.
- [ ] Fotoğraf Yükleme Hatası ekranı var.
- [ ] Zorunlu kanıtlar takip ediliyor.
- [ ] Eksik/bozuk/bulanık fotoğraf durumları gösteriliyor.
- [ ] Offline kuyruğa al aksiyonu var.

## 6. Eksik, Uyarı ve Rapor

- [ ] Eksik & Uyarı Merkezi var.
- [ ] Rapor Engelleyici Eksik ekranı var.
- [ ] Engelleyici eksikler çözülmeden rapor teknik onaya gönderilemiyor.
- [ ] Müşteri Özeti ekranı var.
- [ ] İç teknik not / müşteriye gösterilecek not ayrımı var.
- [ ] Final Kontrol & Rapor ekranı var.
- [ ] Teknisyen için ana CTA “Raporu Teknik Onaya Gönder”.
- [ ] Teknisyen raporu onaylamıyor.
- [ ] Yönetici / teknik onay rolü raporu onaylayabiliyor.
- [ ] Teknik Onaya Gönderildi / Bekliyor ekranı var.
- [ ] İş Emri Tamamlandı ekranı var.
- [ ] Onaydan Döndü / Düzeltme İstendi ekranı var.

## 7. Sistem Ekranları

- [ ] Bildirimler ekranı var.
- [ ] Profil & Ayarlar ekranı var.
- [ ] Yetkilerim & Rol Bilgileri ekranı var.
- [ ] Offline & Senkronizasyon ekranı var.
- [ ] Senkronizasyon Hatası ekranı var.
- [ ] Boş Durum ekranları var.
- [ ] Teknik Destek / Yardım Merkezi var.
- [ ] Raporlar & Geçmiş ekranı var.

## 8. Build / APK

- [ ] Proje tipi tespit edildi.
- [ ] Lint/typecheck/analyze çalıştırıldı veya neden çalışmadığı raporlandı.
- [ ] Test/build çalıştırıldı veya neden çalışmadığı raporlandı.
- [ ] Debug APK üretildi veya eksik Android ortamı raporlandı.
- [ ] APK çıktı yolu rapora yazıldı.
- [ ] Final rapor oluşturuldu: `docs/codex/OTOTR_MOBILE_IMPLEMENTATION_REPORT.md`
