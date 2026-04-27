# Kurtarilan Kaynaklar

## 1.html

Kaynak: onceki OTOTR ERP/CRM HTML prototipi.

Projeye aktarilan dosya: `index.html`

Icerik ozeti:

- OTOTR Genel Merkez ERP + CRM demo arayuzu
- Sol menulu genel merkez paneli
- CEO kokpiti
- Is zekasi
- Bayiler ve subeler
- Operasyon
- Franchise satis
- CRM ve randevu
- Finans ve royalty
- Pazarlama
- Kalite denetim
- OTOTR Academy
- Hukuk ve risk
- Kriz merkezi
- Buyume haritasi
- Legacy Room
- Sistem mimarisi
- Ayarlar

Teknik durum:

- HTML/CSS/JS prototip
- Mock veri seti JavaScript icinde
- Kayitlar `localStorage` ile saklaniyor
- Yeni lead olusturma, lead asamasi ilerletme ve JSON disa aktarma akislari prototip seviyesinde calisiyor

## ALL.docx

Kaynak: OTOTR Master Book.

Icerik ozeti:

- OTOTR Master Book
- 26 ana bolum ve kurucu manifestosu
- Marka DNA
- Franchise modeli
- Operasyon sistemi
- Kalite ve denetim
- Insan kaynaklari ve Academy
- Pazarlama
- Kurumsal satis/B2B
- Finans
- Hukuk ve risk
- CRM/yazilim merkezi
- Veri merkezi/is zekasi
- Tedarik zinciri
- Kriz yonetimi
- Sube kurulum sistemi
- Buyume plani
- Uluslararasi acilim
- Holding ve merkez yonetim
- Yatirimci dosyasi
- Gelecek vizyonu

ERP/CRM icin en kritik Master Book bolumleri:

- Bolum 10: Operasyon Sistemi
- Bolum 11: Kalite Guvence ve Denetim
- Bolum 15: Finans Sistemi
- Bolum 16: Hukuk ve Risk Yonetimi
- Bolum 17: CRM / Yazilim Merkezi
- Bolum 18: Veri Merkezi / Is Zekasi
- Bolum 24: Holding ve Merkez Yonetim

## Sonraki teknik karar

Bu noktadan sonra iki yol var:

1. Prototipi bir sure daha tek HTML olarak gelistirmek.
2. Hemen gercek uygulama mimarisine gecmek.

Onerilen yol: once `index.html` icindeki ekran ve veri mantigini netlestirip sonra React/Next.js + backend + PostgreSQL mimarisine tasimak. Bu, hizli iterasyon ile dogru urun kapsamini kaybetmemeyi saglar.
