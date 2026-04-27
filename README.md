# OTOTR ERP + CRM

OTOTR icin genel merkez ERP/CRM sisteminin yeniden baslangicidir.

Canli prototip dosyasi: `index.html`

## Su anki durum

- Tarayicida calisan bir demo arayuz var.
- Veri simdilik tarayici `localStorage` uzerinde mock backend gibi saklaniyor.
- Dashboard, franchise satis, CRM/randevu, bayi yonetimi, operasyon, kalite, finans, pazarlama, hukuk, kriz, Academy, buyume ve sistem mimarisi modulleri var.
- OTOTR Master Book kapsami urun omurgasi olarak kullaniliyor.

## Calistirma

`index.html` dosyasini tarayicida acman yeterli.

## Hedef

Bu prototipi asama asama gercek bir ERP/CRM'e cevirmek:

1. Veri modelini netlestirmek.
2. Frontend'i moduller halinde ayirmak.
3. Backend API ve veritabani kurmak.
4. Yetki/rol sistemini eklemek.
5. Randevu, lead, bayi, rapor, finans ve kalite akislarini gercek kayitlara baglamak.
6. Entegrasyonlari eklemek: WhatsApp/SMS, odeme, e-fatura, Google yorum, rapor linki.

## Oncelikli MVP

Ilk gercek surum icin odak:

- CRM lead kaydi
- Randevu takibi
- Bayi/branch karti
- Franchise satis hunisi
- CEO dashboard
- Kalite alarmi
- Finans/royalty takibi

Detayli plan icin: `docs/erp-crm-roadmap.md`
