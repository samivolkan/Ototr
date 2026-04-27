# Sprint 1 Backlog

Hedef: Yerelde calisan ileri prototipi ana kaynak kabul edip, gercek MVP'ye gecmeden once temel kalite ve kapsam kontrolunu oturtmak.

## 1. Prototip Kaynak Karari

- [x] Yereldeki gelismis `index.html` ana prototip kabul edildi.
- [x] UTF-8 / Turkce karakter kontrolu yapildi.
- [x] Inline JavaScript syntax kontrolu yapildi.
- [x] Headless Chrome ile temel akislara duman testi kosuldu.
- [ ] GitHub'daki `index.html` yereldeki gelismis prototiple birebir esitleme icin Git CLI kurulumu veya token'li API yolu secilecek.

## 2. Duman Testi Kapsami

Simdilik test edilen akislar:

- Dashboard aciliyor.
- Sol menu route sayisi beklenen seviyede.
- Franchise ekrani aciliyor.
- Yeni lead ekleniyor.
- Lead sayisi artiyor.
- Bayiler ekrani aciliyor.
- Bayi satirindan detay paneli aciliyor.
- Konsol/page error yok.

Eklenmesi gereken testler:

- Arama kutusu ilgili module geciriyor mu?
- `Veri Disa Aktar` JSON uretiyor mu?
- `Demo Verisini Sifirla` akisi calisiyor mu?
- Mobil viewport tasarimi bozuluyor mu?
- Tum nav route'lari hata vermeden aciliyor mu?

## 3. UI Temizligi

- [ ] Butonlarda ayni `data-route` degerinin hem nav hem kart aksiyonlarinda tekrar etmesi testleri zorlastiriyor; nav icin `data-nav-route`, kart aksiyonu icin `data-route` ayrilabilir.
- [ ] Formlarda zorunlu alanlar kullaniciya daha net gosterilmeli.
- [ ] Grafiklerin CDN kapaliyken fallback gorunumu kontrol edilmeli.
- [ ] Mobilde tablo tasmasi icin yatay kaydirma veya kart gorunumu eklenmeli.

## 4. MVP Hazirlik

Ilk gercek moduller:

- CRM lead kaydi
- Randevu yonetimi
- Bayi/sube karti
- Franchise satis hunisi
- Finans/royalty takibi
- Kalite/kriz alarmi

## 5. Teknik Karar

Onerilen mimari:

- Frontend: Next.js veya React
- Backend: Node.js/NestJS veya Laravel
- Veritabani: PostgreSQL
- Auth: Rol bazli yetki
- Audit: Her kritik kayitta degisiklik gecmisi

Karar verilmesi gerekenler:

- Uygulama tek repo mu olacak, yoksa frontend/backend ayrilacak mi?
- Ilk backend Node.js mi Laravel mi olacak?
- Hosting hedefi Vercel + Railway/Supabase mi, yoksa klasik VPS mi?
