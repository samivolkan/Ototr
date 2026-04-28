# Sprint 1 Backlog

Hedef: Yerelde calisan ileri prototipi ana kaynak kabul edip, gercek MVP'ye gecmeden once temel kalite ve kapsam kontrolunu oturtmak.

## 1. Prototip Kaynak Karari

- [x] Yereldeki gelismis `index.html` ana prototip kabul edildi.
- [x] UTF-8 / Turkce karakter kontrolu yapildi.
- [x] Inline JavaScript syntax kontrolu yapildi.
- [x] Headless Chrome ile temel akislara duman testi kosuldu.
- [x] GitHub'daki `index.html` yereldeki gelismis prototiple esitlendi ve push edildi.

## 2. Duman Testi Kapsami

Simdilik test edilen akiskar:

- Dashboard aciliyor.
- Dashboard CEO kokpiti ana basliklari gorunuyor: alarm masasi, sube saglik tablosu, sikayet/itibar radari.
- Tum sol menu route'lari hata vermeden aciliyor.
- Franchise ekrani aciliyor.
- Yeni lead ekleniyor.
- Lead sayisi artiyor.
- Bayiler ekrani aciliyor.
- Bayi satirindan detay paneli aciliyor.
- Arama kutusu ilgili module geciriyor.
- `Demo Verisini Sifirla` akisi calisiyor.
- Mobil viewport temel kontrolu calisiyor.
- Konsol/page error yok.

Eklenmesi gereken testler:

- `Veri Disa Aktar` JSON uretiyor mu?
- Mobil viewport gorsel tasarim/regresyon kontrolu eklenecek.
- Tum nav route'lari icin temel UI beklentileri ayrilacak.

## 3. UI Temizligi

- [x] Butonlarda ayni `data-route` degerinin hem nav hem kart aksiyonlarinda tekrar etmesi giderildi; nav icin `data-nav-route`, kart aksiyonu icin `data-route` ayrildi.
- [x] Dashboard CEO odakli karar ekranina donusturuldu: ag sagligi, operasyon yogunlugu, sikayet radari, sube sapmalari ve gunluk CEO aksiyonlari tek ekrana alindi.
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
