# OTOTR ERP/CRM Yol Haritasi

Bu yol haritasi, mevcut OTOTR prototipi ve Master Book kapsamindan toparlandi.

## Faz 0 - Kurtarma ve Prototip

Amac: Kaybolan onceki calismayi calisir hale getirmek.

- [x] Eski HTML prototipi projeye alindi.
- [x] Master Book icinden ERP/CRM kapsam basliklari cikarildi.
- [x] Calisir demo korundu.
- [ ] Demo icindeki veri alanlari normalize edilecek.
- [ ] UI metinleri ve Turkce karakterler tarayicida kontrol edilecek.

## Faz 1 - Gercek MVP

Amac: Genel merkez tarafinda kullanilabilecek ilk pratik sistem.

### 1. CEO Kokpiti

- Ag cirosu
- Aktif/sube kurulum durumu
- Kritik alarmlar
- Franchise pipeline
- Randevu hacmi
- Kalite/NPS/Google skorlari
- Haftalik karar listesi

### 2. CRM ve Randevu

- Musteri kaydi
- Telefon/plaka/isim ile arama
- Randevu olusturma
- Randevu durumu: bekliyor, geldi, devam ediyor, tamamlandi, no-show
- Rapor gecmisi
- WhatsApp/SMS izin kaydi

### 3. Franchise Satis

- Lead kaydi
- Aday skoru
- Asamalar: yeni lead, on gorusme, yatirimci sunumu, lokasyon, teklif, sozlesme, kurulum
- Aday dosyasi
- Notlar ve takip tarihleri

### 4. Bayi/Sube Yonetimi

- Sube karti
- Yonetici, sehir, bolge, durum
- Ciro, royalty, rapor adedi
- Kalite, NPS, Google puani
- Risk seviyesi
- 30 gun duzeltme plani

### 5. Finans ve Royalty

- Sube cirosu
- Royalty tahakkuku
- Reklam katkisi
- Tahsilat durumu
- Gecikme alarmi
- Merkez EBITDA ozeti

### 6. Kalite ve Kriz

- Rapor kalite puani
- Gizli musteri bulgusu
- Kamera denetimi
- Sikayet kaydi
- Kritik ticket
- Kok neden ve aksiyon kapanisi

## Faz 2 - Sistemlestirme

Amac: Prototipten gercek yazilim mimarisine gecmek.

- Frontend modullere ayrilacak.
- Backend REST/JSON API kurulacak.
- Veritabani semasi uygulanacak.
- Kimlik dogrulama ve rol bazli yetki eklenecek.
- Audit log ve kayit gecmisi eklenecek.
- CSV/Excel import-export eklenecek.

Onerilen teknik yigin:

- Frontend: React veya Next.js
- Backend: Node.js/NestJS ya da Laravel
- Veritabani: PostgreSQL
- Dosya/rapor depolama: S3 uyumlu obje depolama
- BI: PostgreSQL view + dashboard katmani

## Faz 3 - Entegrasyonlar

- WhatsApp Business
- SMS
- Odeme altyapisi
- E-fatura/e-arsiv
- Google yorum ve Maps performansi
- Dijital rapor linki
- QR ile rapor dogrulama
- Mobil uygulama API'si

## Faz 4 - OTOTR Platform

- Musteri mobil uygulamasi
- Bayi paneli
- Merkez karar paneli
- Rapor otomasyonu
- Data warehouse
- Fiyat optimizasyonu
- Erken uyari motoru
- Sadakat sistemi

## Urun prensibi

OTOTR icin yazilim sadece kayit tutan bir panel degil; franchise kalitesini koruyan, merkezi denetimi guclendiren ve musteri guvenini olculebilir hale getiren isletim sistemi olmalidir.
