# OTOTR ERP + CRM Platform

Bu klasor, tek HTML prototipten sonra gelen API baglantili genel merkez urun iskeletidir.

## Kapsam

- CEO Dashboard
- Is Zekasi ve sube bazli performans derinligi
- Karar odalari
- Randevular
- CRM / Leads
- Musteriler ve Musteri 360
- Arac hafizasi
- Ekspertiz operasyon kuyrugu
- Rapor kalite paneli
- Finans, EBITDA ve royalty simulatifi
- Franchise aday degerlendirme
- Personel / IK performansi
- Pazarlama funnel ve kampanya paneli
- Sikayet cozum merkezi
- Google reviews reputation engine
- WhatsApp CRM unified inbox ve pipeline
- Executive alert intelligence
- Hukuk, KVKK, sozlesme ve itiraz takipleri
- Destek talepleri
- Egitim merkezi
- Ayarlar, rol/yetki matrisi
- REST API
- JSON tabanli kalici demo veri katmani
- SQL semasi taslagi

## Calistirma

```powershell
node server.js
```

Sonra:

```text
http://localhost:5177
```

## API Ornekleri

- `GET /api/bootstrap`
- `GET /api/intelligence`
- `GET /api/branches`
- `GET /api/branches/BR-001`
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/customers`
- `GET /api/customers/CU-1001`
- `GET /api/vehicles`
- `GET /api/staff`
- `GET /api/operations`
- `GET /api/marketing`
- `GET /api/complaints`
- `GET /api/complaints/CP-1001`
- `POST /api/complaints`
- `GET /api/reputation`
- `GET /api/whatsapp`
- `GET /api/alerts`
- `GET /api/legal`
- `GET /api/training`
- `GET /api/tickets`
- `GET /api/roles`
- `GET /api/schema`

## Not

Bu surum, gercek veritabani ve kimlik dogrulama oncesi ekran ihtiyacini, veri alanlarini, API sozlesmesini ve genel merkez yonetim ritmini sabitlemek icin hazirlandi.

## Guven Mimarisi

OTOTR icin ana is mantigi:

```text
Trust = fast complaint solving + strong communication + high ratings + consistent branch quality
```

Bu nedenle CEO Dashboard artik su guven metriklerini de izler:

- Complaints Today
- Avg Resolution Time
- Google Rating Network Avg
- Reviews Recovered
- WhatsApp Leads Today
- WhatsApp Conversion %
- SLA Breaches
- Reputation Risk Branches
