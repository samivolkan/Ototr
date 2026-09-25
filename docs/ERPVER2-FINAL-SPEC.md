# ERPVER2 Final Kapsam ve Yazilimci Handoff

Hazirlayan: Codex
Tarih: 24.09.2026
Hedef: otoTR icin cok subeli, raporlanabilir, guvenli ve genisletilebilir ERP yonetim sistemi.

## 1. Kaynak Durumu ve Kritik Not

`https://oto-tr.com/Home/Dashboard` adresi in-app tarayicida `otoTR EKSPERTIZ | Giris` ekranina yonlendi. Chrome profilinde ayni adres `Error - ototTrApp.MVC` hatasi verdi. Bu nedenle mevcut dashboard ekrani birebir gorulup kopyalanamadi.

Erisilebilen marka kaniti:

- Giris ekraninda Segoe UI font ailesi kullaniliyor.
- Ana aksan rengi `#e30613`.
- Sade beyaz yuzey, koyu metin, yuvarlatilmis input/button, operasyonel portal tonu var.

Bu teslimdeki prototip, mevcut dashboard'un birebir kopyasi olarak degil, otoTR marka ipuclari ve cok subeli otomotiv/ekspertiz ERP ihtiyaclari uzerinden hazirlanmis calisir ERPVER2 hedef arayuzu olarak degerlendirilmelidir.

## 2. Urun Vizyonu

ERPVER2, sube, ekspertiz, finans, IK, Academy, arsiv, satis pazarlama, kalite, hukuk, IT ve raporlama sureclerini tek karar merkezine baglar. Her modul icin:

- Yetkili rol bazli menu ve alt baslik
- Sube/tarih filtreleri
- KPI kartlari
- Is akisi adimlari
- Rapor indirme
- Kayit listesi
- Audit log ve arsiv baglantisi
- Gecikme/SLA otomasyonu

olmalidir.

## 3. Calisir Prototipteki Ana Ekranlar

Prototip yolu: `outputs/erpver2`
Calistirma: `npm run dev -- --host 127.0.0.1 --port 4173`

Calisan ana kontroller:

- Sol modul menusu ve tum alt baslik secimleri
- Ust arama, sube secimi, tarih secimi, canli mod
- KPI, rapor, is akisi ve kayit listesi ekranlari
- Yeni islem drawer'i
- Rapor al, filtrele, is akisi islemleri ve kayit satiri toast geri bildirimi
- Desktop ve 390x844 mobil responsive gorunum

## 4. Bilgi Mimarisi

| Modul | Alt Basliklar |
| --- | --- |
| Grup Dashboard | Yonetici Kokpiti, Sube Karsilastirma, Gunluk Nabiz, Risk Is Haritasi, Aksiyon Takip, Haftalik Ozet |
| Sube Yonetimi | Sube Kartlari, Hedef ve Primler, Vardiya Planlama, Kasa ve Mutabakat, Yerel Yetkiler, Acilis Kapanis Kontrolu |
| Ekspertiz Operasyon | Randevu Panosu, Arac Kabul, Paket ve Kontrol Listeleri, Istasyon Akisi, Teknisyen Atama, Rapor Onay, Garanti ve Itiraz |
| Arac Filo Stok | Arac Havuzu, Ekipman Envanteri, Sarf Stok, Transfer Talepleri, Demirbas Zimmet, Bakim Takvimi |
| Musteri CRM | Musteri 360, Lead Havuzu, Teklifler, Sadakat Programi, Sikayet ve Talep, NPS ve Geri Bildirim |
| Satis Pazarlama | Kampanya Takvimi, Lead Performansi, Bayi Anlasmalari, Kurumsal Teklifler, Satis Hedefleri, Pazarlama ROI, Rakip Izleme |
| Cagri ve Randevu | Cagri Kuyrugu, Randevu Optimizasyonu, WhatsApp Gelen Kutusu, Geri Donus Listesi, SLA Takibi, Hazir Cevaplar |
| Finans Muhasebe | Gelir Tablosu, Fatura ve E-Arsiv, Tahsilat Takibi, Gider Merkezi, Banka Mutabakati, Prim ve Komisyon, Butce Senaryo |
| IK ve Performans | Personel Kartlari, Izin ve Mesai, Performans Skorlari, Ise Alim Havuzu, Bordro Hazirlik, Yetkinlik Matrisi |
| Academy | Egitim Katalogu, Zorunlu Sertifikalar, Sinav ve Quiz, Usta Cirak Takibi, Video Kutuphane, Gelisim Yol Haritasi |
| Arsiv DMS | Rapor Arsivi, Sozlesmeler, Fotograf Kasasi, Versiyon Gecmisi, Imha Takvimi, Yetkili Paylasim |
| Satin Alma | Tedarikci Kartlari, Talep Onaylari, Teklif Karsilastirma, Siparis Takibi, Teslim Alma, Tedarikci Skoru |
| Raporlama BI | Canli KPI, Sube Karnesi, Karlilik Analizi, Operasyon Raporlari, Denetim Raporlari, Ozel Rapor Tasarimi, Power BI Aktarim |
| Kalite Denetim | SOP Kutuphanesi, Denetim Planlari, Uygunsuzluklar, Duzeltici Faaliyet, Gizli Musteri, Kalite Skoru |
| Hukuk Uyum | KVKK Envanteri, Dava ve Ihtarlar, Sozlesme Onay, Yetki Denetimi, Uyum Takvimi, Olay Bildirimi |
| IT Guvenlik | Kullanici Rolleri, Cihaz Envanteri, Oturum Loglari, Yedekleme Durumu, Guvenlik Alarmi, API Anahtarlari |
| Entegrasyonlar | E-Fatura, SMS ve WhatsApp, Banka POS, Muhasebe Aktarim, Harita ve Lokasyon, Webhook Merkezi |
| Sistem Ayarlari | Sirket Ayarlari, Paket Tanimlari, Bildirim Kurallari, Onay Akislari, Tema ve Marka, Veri Sozlugu |

## 5. Temel Veri Modeli

Minimum tablolar:

- `tenants`: Sirket/marka ayarlari
- `branches`: Sube, lokasyon, hedef, kasa, saat, yetkili mudur
- `users`: Kullanici, sube, rol, durum, MFA
- `roles`, `permissions`: Modul/aksiyon bazli yetki
- `customers`: Bireysel, bayi, filo ve kurumsal musteri
- `vehicles`: Plaka, VIN, marka, model, yil, km, sahiplik gecmisi
- `appointments`: Randevu, kanal, sube, paket, durum
- `inspection_jobs`: Arac kabulden rapor teslimine operasyon kaydi
- `inspection_reports`: Kontrol listesi, fotograf, not, onay, versiyon
- `invoices`, `payments`, `expenses`, `cash_reconciliations`
- `leads`, `campaigns`, `offers`, `contracts`
- `employees`, `shifts`, `leaves`, `performance_scores`
- `academy_courses`, `certificates`, `exam_results`
- `documents`, `document_versions`, `retention_policies`
- `purchase_requests`, `suppliers`, `orders`, `stock_movements`
- `audit_logs`, `notifications`, `integrations`, `webhooks`

Her kayitta `tenant_id`, `branch_id`, `created_by`, `updated_by`, `status`, `audit_trace_id` bulunmalidir.

## 6. Raporlama Paketi

Yonetim:

- Grup KPI kokpiti
- Sube karnesi
- Gunluk/haftalik operasyon ozeti
- Risk ve aksiyon takip raporu

Operasyon:

- Randevu doluluk ve iptal raporu
- Istasyon bekleme suresi
- Teknisyen verimlilik raporu
- Rapor onay SLA raporu
- Itiraz/garanti kok neden analizi

Finans:

- Sube karlilik raporu
- Gelir/gider merkezi
- Kasa ve banka mutabakati
- Tahsilat yaslandirma
- Prim ve komisyon raporu

Satis/Pazarlama:

- Lead kaynak performansi
- Kampanya ROI
- Bayi anlasma performansi
- Kurumsal teklif kazanma/kaybetme analizi

IK/Academy:

- Personel performans skoru
- Vardiya ve mesai raporu
- Zorunlu sertifika tamamlanma
- Egitim basari ve gelisim raporu

Kalite/Uyum:

- Denetim bulgu raporu
- SOP uyum skoru
- KVKK ve yetki denetimi
- Dokuman imha/yasal saklama raporu

## 7. Roller ve Yetki Mantigi

Roller:

- Super Admin
- Genel Mudur
- Bolge Muduru
- Sube Muduru
- Operasyon Lideri
- Teknisyen
- Satis/CRM Temsilcisi
- Finans Uzmani
- IK Uzmani
- Academy Yoneticisi
- Kalite Denetcisi
- Hukuk/Uyum
- IT Admin
- Dis Denetci / Salt Okunur

Yetki kuralı:

- Kullanici sadece yetkili oldugu sube ve modulu gorur.
- Kritik finans, hukuk, KVKK, API anahtari ve rol degisikligi iki asamali onay ister.
- Tum kayit degisimleri audit log'a yazilir.
- Arsiv dokumanlari indirme, paylasma ve imha islemleri ayrica loglanir.

## 8. Entegrasyonlar

Oncelik sirasi:

1. E-fatura / e-arsiv
2. SMS ve WhatsApp bildirimleri
3. Banka POS ve sanal POS tahsilat
4. Muhasebe aktarimi
5. Harita/lokasyon ve sube rota
6. Power BI veya veri ambarina aktarim
7. Webhook/API merkezi
8. Yedekleme ve arsiv depolama

## 9. Uygulama Asamalari

### Asama 1 - Kesif ve veri sozlugu

- Mevcut otoTR akislarini ve ekranlarini cikarin.
- Dashboard erisimi duzeltilip ekran goruntuleri alin.
- Sube bazli farklari ve rol matrisini netlestirin.
- Veri migrasyon kaynaklarini belirleyin.

### Asama 2 - Cekirdek platform

- Tenant, sube, kullanici, rol ve audit altyapisi.
- Ortak tablo standardi, bildirim merkezi ve dosya arsivi.
- Tema/marka ayarlari ve responsive shell.

### Asama 3 - Operasyon MVP

- Randevu, arac kabul, ekspertiz akisi, rapor onay, tahsilat.
- Yonetici dashboard ve sube karnesi.
- Temel raporlar ve PDF/Excel ciktilari.

### Asama 4 - Kurumsal moduller

- Finans, IK, Academy, arsiv, satis pazarlama, satin alma, kalite ve hukuk.
- Detayli onay akisleri ve otomasyonlar.
- Diger sistemlerle entegrasyon.

### Asama 5 - Pilot, egitim ve yayginlasma

- 2 pilot sube ile saha testi.
- Academy icerikleri ve rol bazli egitim.
- Veri migrasyonu, performans testi, yetki testi.
- Tum subelere kademeli gecis.

## 10. Kabul Kriterleri

- Tum ana menuler ve alt basliklar tiklanabilir olmalidir.
- Her alt baslikta KPI, kayit listesi, rapor ve aksiyon alani bulunmalidir.
- Desktop, tablet ve mobilde yatay tasma olmamalidir.
- Yetkisiz kullanici finans, hukuk, API ve KVKK ekranlarina ulasamamalidir.
- Kritik islemlerde audit log kaydi zorunludur.
- Raporlar sube, tarih, rol ve durum filtreleriyle calismalidir.
- Sube performansi grup seviyesinde konsolide gosterilmelidir.
- Arsivde versiyon, saklama suresi, paylasim ve imha izleri tutulmalidir.
- En az bir staging ortaminda performans ve guvenlik testi tamamlanmalidir.

## 11. Yazilimciya Net Talimat

Bu prototipi tasarim ve kapsam referansi olarak kullanin. Mevcut dashboard'a erisim saglandiginda once canli ekranlarin tam capture'i alinmali, sonra ERPVER2 shell'i ile karsilastirilip gerekli gorsel uyarlamalar yapilmalidir.

Backend icin moduler monolit veya servislesmeye hazir katmanli mimari onerilir:

- API: .NET, Node/NestJS veya Laravel olabilir; mevcut MVC altyapisina gore karar verin.
- DB: PostgreSQL veya SQL Server.
- Frontend: React/Vite veya mevcut MVC Razor + component tabanli yaklasim.
- Auth: MFA destekli role-based access control.
- Log: merkezi audit log ve uygulama loglari.
- Dosya: guvenli object storage + imza/versiyon metadatasi.
- Rapor: server-side export + BI veri modeli.

## 12. Arastirma Dayanaklari

- Auto dealership KPI ve servis dashboard yaklasimi: https://www.buildrhub.io/en/blog/auto-dealership-service-department-dashboard/
- Cok subeli dealership/DMS modulleri: https://www.vehicron.com/
- Sube, stok, servis, finans ve dashboard kurgusu: https://rayterton.com/industries/automotive/dealer-management-system-dms-standard-features-v1.php
- Enterprise dealership modulleri ve operasyon omurgasi: https://www.dmspilot.com/who-we-serve/dealerships
- Multi-branch kullanilmis arac/dealership yonetimi: https://vehicleerp.com/features/branch-management
- Otomotiv grup satis, servis, stok, finans, IK mantigi: https://autoxpert360.com/
