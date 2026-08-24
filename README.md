# OTOTR ERP + CRM

Bu proje, OTOTR icin genel merkez ERP/CRM sisteminin yeniden baslangicidir.

Mevcut calisir prototip: `index.html`

## Calisma duzeni

Aktif yerel klasor: `C:\Users\Samivolkannnn\Documents\ototr_25052026`

Eski `New project` klasoru artik aktif calisma alani degildir. Detay ve arsiv
notlari icin: `docs/calisma-duzeni.md`

## Su anki durum

- Tek dosyalik, tarayicida calisan bir demo arayuz var.
- Veri `localStorage` uzerinde mock backend gibi saklaniyor.
- Dashboard, franchise satis, CRM/randevu, bayi yonetimi, operasyon, kalite, finans, pazarlama, hukuk, kriz, Academy, buyume ve sistem mimarisi modulleri var.
- `ALL.docx` icindeki OTOTR Master Book, urun kapsaminin ana kaynagi olarak kullanildi.

## Calistirma

`index.html` dosyasini tarayicida acman yeterli.

## Test

Manuel test:

1. `index.html` dosyasini tarayicida ac.
2. Sol menuden moduller arasinda gez.
3. `Yeni Lead` ile kayit olustur.
4. Franchise kanban ekraninda `Ilerle` aksiyonunu dene.
5. Bayi tablosunda satira tiklayip detay panelini ac.
6. `Veri Disa Aktar` ile JSON indirmeyi dene.

Otomatik duman testi:

```powershell
$env:NODE_PATH='C:\Users\Samivolkannnn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\Samivolkannnn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools/test-index.mjs
```

## Ekspertiz Test Masteri

CRM'deki `#test-master` rotasi, 24.08.2026 tarihli kilitli ekspertiz
masterini yonetmek icin kullanilir.

- Tum test bolumleri, kategoriler ve alt maddeler tek agacta goruntulenir.
- Bolum, kategori ve madde eklenebilir; duzenlenebilir, silinebilir ve
  surukle-birak veya yukari/asagi tuslariyla tasinabilir.
- Degisiklikler tarayicida otomatik kaydedilir; geri al/ileri al desteklenir.
- Master JSON olarak disa aktarilabilir, panoya kopyalanabilir ve tekrar ice
  aktarilabilir.
- Kilitli baslangic verisi `data/ototr_test_master_final_v1.json` dosyasindadir.

Master veri testi:

```powershell
& 'C:\Users\Samivolkannnn\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools/test-test-master.mjs
```

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

Sprint 1 is listesi icin: `docs/sprint-1-backlog.md`
