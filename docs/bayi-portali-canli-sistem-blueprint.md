# OTOTR Bayi Portali Canli Sistem Blueprint

Tarih: 2026-05-18

Bu dokumanin amaci, OTOTR bayi portalini genel merkez ERP ekranindan ayirmak ve yeni bir bayinin basvuru anindan ilk rapor teslimine kadar hangi sistem ekranlari, roller, onaylar ve veri kayitlariyla ilerleyecegini netlestirmektir.

Bu plan "demo ekran" degil, canli sisteme tasinacak isletim modeli gibi dusunulmelidir.

## 1. Ana Urun Karari

`Bayi Paneli` artik genel merkezin bayi takip ekrani gibi davranmayacak. Bayi giris yaptiginda kendi subesine ait ayri bir portal gorecek.

Urun ayrimi:

- `OTOTR Genel Merkez ERP`: Tum agi, franchise pipeline'i, denetimi, finans ve stratejiyi yonetir.
- `OTOTR Bayi Portali`: Sadece ilgili bayinin/subenin gunluk operasyonunu, personelini, is emirlerini, raporlarini, finansini ve kalite aksiyonlarini yonetir.
- `OTOTR Web`: Musteri ve franchise adayinin disaridan gordugu public sistemdir. Bayi portali public web'den ayridir.

Bu ayrim ileride domain veya uygulama olarak da ayrilabilir:

- `erp.ototr.com.tr`: Genel merkez.
- `bayi.ototr.com.tr`: Bayi / sube portali.
- `ototr.com.tr`: Public web.
- `rapor.ototr.com.tr`: Musteri rapor dogrulama / QR.

## 2. Uc Ana Yasam Dongusu

Bayi portali tek basina acilmaz. Uc ana yasam dongusunun sonucudur:

1. Franchise / bayi basvuru yasam dongusu.
2. Sube kurulum ve personel aktivasyon yasam dongusu.
3. Gunluk operasyon / is emri / rapor teslim yasam dongusu.

Bu uc dongu birbirine baglanmadikca canli sistem eksik kalir.

## 3. Uctan Uca Canli Senaryo

Bu senaryo 1 hafta icinde yeni bayi basvurusu alinacak ve sistem canliya hazirlanacak varsayimiyla yazildi.

### 3.1 Basvuru ve On Eleme

1. Franchise adayi public web formundan basvurur veya merkez satis ekibi lead acar.
2. Sistem `lead` kaydi olusturur.
3. Lead tipi `Franchise adayi` olarak isaretlenir.
4. Franchise satis ekibi adayi arar.
5. Aday skoru hesaplanir:
   - Yatirim butcesi.
   - Lokasyon bilgisi.
   - Isletme deneyimi.
   - Marka uyumu.
   - Finansal guc.
   - Operasyonu kimin yonetecegi.
6. Aday uygun bulunursa `franchise_application` kaydi acilir.
7. Uygun degilse red / beklet / takip durumuna alinir.

Sistem kapilari:

- Telefon ve iletisim izni yoksa basvuru ilerlemez.
- Yatirim butcesi minimum esigin altindaysa finans on eleme gerekir.
- Lokasyon belirsizse fizibilite asamasina gecemez.

### 3.2 Lokasyon, Finans ve Sozlesme

1. Aday lokasyon onerir.
2. Genel merkez bolge, ilce, rakip, trafik, otopark, m2 ve kira/yatirim dengesini inceler.
3. Finans ekibi yatirim butcesi, sermaye kaniti ve 90 gun nakit akisina bakar.
4. Hukuk sozlesme taslagini hazirlar.
5. Franchise sahibi adayina zorunlu Academy atamalari acilir.
6. Onay sonrasi kayit `Acilis dosyasi` asamasina alinir.

Sistem kapilari:

- Finans onayi olmadan sozlesme imzaya gitmez.
- Hukuk onayi olmadan kurulum emri acilmaz.
- Franchise sahibi `AC-02`, `AC-28`, `AC-29`, `AC-35` egitimleri tamamlamadan bayi portali tam yetki alamaz.

### 3.3 Sube Kurulum Dosyasi

Sozlesme onaylaninca sistem otomatik `branch_opening_project` olusturur.

Kurulum basliklari:

- Tabela ve mimari standart.
- Lift ve ekspertiz cihazlari.
- Mikron, OBD, fren, dyno, sarf ve ekipman.
- Kamera ve internet altyapisi.
- POS, kasa ve e-fatura hazirligi.
- Google Isletme Profili.
- Personel kadro plani.
- Academy egitim paketi.
- Acilis lansmani.
- Kalite on denetimi.

Sistem kapilari:

- Cihaz kalibrasyon kaydi olmadan teknik is emri kabul edilemez.
- Personel tanimlanmadan bayi portali operasyon modlari acilmaz.
- Google profil / lokasyon kaydi olmadan pazarlama hazirlik skoru eksik kalir.
- Kalite on denetimi gecmeden `Canli Acilis` butonu aktif olmaz.

### 3.4 Bayi Portali Aktivasyonu

Genel merkez `Bayi Portali Ac` dediginde sistem:

1. `branch` kaydini aktif eder.
2. `dealer_account` olusturur.
3. Varsayilan bayi portal modullerini acar.
4. Rol bazli yetki sablonlarini yukler.
5. Personel davetlerini olusturur.
6. Academy zorunlu egitimlerini atar.
7. Cihaz ve stok kayitlarini subeye baglar.
8. Ilk gun operasyon checklist'ini acar.

Bayi sahibi ilk giriste:

- Sozlesme ve sorumluluk ozetini gorur.
- Sube bilgilerini onaylar.
- Yetkili kisi ve iban/fatura bilgilerini tamamlar.
- Personel listesini kontrol eder.
- Egitim eksiklerini gorur.

### 3.5 Personel Tanimlama ve Yetki Acilisi

Sube acilisinda tanimlanacak minimum roller:

- Bayi sahibi / franchise sahibi.
- Sube muduru.
- Musteri kabul / sekreterya.
- Kaporta boya ustasi.
- Mekanik usta.
- Diagnostik / OBD ustasi.
- Test operatoru.
- Muhasebe / kasa personeli. Bu rol kucuk subede bayi sahibi veya sekreterya ile birlesebilir.
- Destek / vale / saha personeli.

Her personel icin:

- Kullanici hesabi.
- Rol.
- Sube.
- Ise giris tarihi.
- Evrak durumu.
- Yetki seviyesi.
- Academy egitim yolu.
- Sertifika durumu.
- Cihaz kullanma yetkisi.
- Rapor yazma / onaylama / basma yetkisi.

Yetki kuralı:

- Egitim ve evrak tamamlanmadan tam yetki acilmaz.
- Teknik gorev icin ilgili sertifika veya gecici onay gerekir.
- Mudur onayi yetkisi sadece sube muduru veya bayi sahibi rolunde olur.

### 3.6 Ilk Is Emri ve Ilk Rapor

1. Musteri randevusu gelir veya walk-in musteri kabul edilir.
2. Musteri kabul personeli `Is Emri Ac` ekranina girer.
3. Musteri, arac, taraflar, KVKK, odeme ve paket kaydedilir.
4. Paket secimi kapsam kilidi olusturur.
5. Sistem `expertise_case` ve `work_order` acar.
6. Paket kapsamindaki gorevler otomatik olusur.
7. Gorevler ilgili ustalarin tabletine duser.
8. Ustalar kendi alanlarini doldurur.
9. Rapor motoru teknik ham veriyi musteri diline cevirir.
10. Eksik kanit, riskli ifade ve ikinci kontrol ihtiyaci kontrol edilir.
11. Sube muduru raporu onaylar veya ustaya geri yollar.
12. Sekreterya onayli raporu basar / QR link gonderir.
13. Musteriye teslim imzasi ve rapor anlatim kaydi alinir.
14. Sistem memnuniyet / Google yorum / itiraz risk takibini baslatir.

## 4. Bayi Portali Ana Modulleri

### 4.1 Ana Sayfa / Gunluk Kokpit

Giris yapan kullanici rolune gore farkli kokpit gorur.

Ortak sinyaller:

- Bugunku randevular.
- Acik is emirleri.
- Usta gorev kuyruğu.
- Basim bekleyen raporlar.
- Geciken teslimler.
- Eksik evraklar.
- Eksik fotograf / cihaz ciktisi.
- Gunluk ciro.
- Kasa kapanis durumu.
- Kalite ve sikayet uyarilari.

Bayi sahibi icin ek:

- Gunluk / aylik ciro.
- Paket bazli gelir.
- Royalty durumu.
- Gider ve kar/zarar ozeti.
- Personel performansi.
- Academy eksikleri.

Sube muduru icin ek:

- Operasyon kapasitesi.
- Usta bazli gorev durumu.
- Mudur onayi bekleyen raporlar.
- Eksik kanitlar.
- Geri donen raporlar.

Musteri kabul icin ek:

- Randevu / kabul listesi.
- Is emri acma kisayolu.
- Odeme / evrak durumu.
- Basim ve teslim kuyrugu.

Usta icin ek:

- Bana atanan isler.
- Aktif arac.
- Geri gonderilen duzeltmeler.
- Tamamlanan gorevler.

### 4.2 Is Emirleri

Amaç: Bayide gelen her araci resmi is emrine baglamak.

Alt ekranlar:

- Yeni is emri.
- Acik is emirleri.
- Bekleyen kabul.
- Usta girisinde.
- Mudur onayinda.
- Sekreterya basiminda.
- Teslim edildi.
- Iptal / iade / no-show.

Zorunlu alanlar:

- Musteri.
- Telefon.
- Arac.
- Plaka.
- Sasi no.
- Paket.
- Odeme durumu.
- KVKK/riza.
- Yol testi onayi.
- Teslim hedefi.

Sistem kurallari:

- Paket secilmeden gorev olusmaz.
- Plaka/sasi/motor uyumsuzsa rapor yayina kilitlenir.
- Odeme bekliyorsa rapor basilabilir mi kuralini bayi politikasi belirler. Oneri: musterinin raporu teslim almasi icin odeme tamamlanmali.

### 4.3 Usta Gorevleri / Tablet

Amaç: Her teknik personelin sadece kendi gorevini gormesi ve rapora standart veri yazmasi.

Gorev tipleri:

- Arac kabul on kontrol.
- Kaporta / boya.
- Sasi / direk / podye.
- Motor / mekanik.
- Alt takim.
- OBD / elektronik.
- Fren / suspansiyon / dyno.
- Lastik / jant.
- Donanim / kondisyon.
- Kayit sorgulari.

Her gorevde ortak alanlar:

- Baslangic zamani.
- Bitis zamani.
- Durum kodu.
- Onem seviyesi.
- Olcum degeri.
- Cihaz tipi.
- Cihaz seri no.
- Fotograf/video kaniti.
- Usta ham notu.
- Musteri dili.
- Tavsiye edilen aksiyon.
- Test yapilamadiysa neden.

Gorev durumlari:

- Bekliyor.
- Devam ediyor.
- Eksik kanit.
- Mudur duzeltme istedi.
- Tamamlandi.
- Iptal / kapsam disi.

### 4.4 Rapor Merkezi

Amaç: Bayinin kendi subesindeki tum rapor arsivine kontrollu erisim saglamak.

Filtreler:

- Rapor no.
- Is emri no.
- Plaka.
- Sasi.
- Musteri.
- Telefon.
- Tarih.
- Paket.
- Durum.
- Usta.
- Itirazli / sikayetli / garanti kapsaminda.

Aksiyonlar:

- Raporu ac.
- PDF bas.
- QR link kopyala/gonder.
- Bayi nushasini ac.
- Fotograf albumunu ac.
- Revizyon gecmisini gor.
- Tekrar kontrol ac.
- Itiraz dosyasi ac.

Rapor durumlari:

- Taslak.
- Usta girisinde.
- Eksik kanit.
- Mudur onayi bekliyor.
- Onaylandi.
- Basildi.
- Teslim edildi.
- Itirazli.
- Revize edildi.
- Iptal.

### 4.5 Sekreterya / Teslim

Amaç: Onayli raporu teknik veriye dokunmadan musterinin alacagi hale getirmek.

Gorur:

- Basim bekleyen onayli raporlar.
- Odeme durumu.
- QR link durumu.
- Bayi nushasi.
- Musteri nushasi.
- Teslim imzasi.
- Rapor anlatim kaydi.

Yapabilir:

- Onayli raporu basar.
- QR link gonderir.
- Teslim imzasi alir.
- Teslim kanalini kaydeder.
- Google yorum / memnuniyet istegi tetikler.

Yapamaz:

- Teknik sonuc degistiremez.
- Usta notu silemez.
- Mudur onayi veremez.

### 4.6 Musteriler / CRM

Bayi portali icindeki CRM genel merkez CRM'inden daha dar kapsamli olur.

Gorur:

- Kendi subesine gelen lead/randevu.
- Walk-in musteri.
- Tekrar gelen musteri.
- Galeri / filo musterisi.
- Randevu teyit durumu.
- No-show.
- WhatsApp / telefon notu.
- Gecmis raporlar.

Yapabilir:

- Randevu olusturur.
- Randevuyu is emrine cevirir.
- Musteri notu ekler.
- Tekrar kontrol randevusu acar.
- Google yorum istegi gonderir.

### 4.7 Personel / IK

Amaç: Bayinin kendi sube personelini yonetmesi; genel merkez IK'nin de onay ve denetim gorebilmesi.

Gorur:

- Personel listesi.
- Rol.
- Durum.
- Ise giris.
- Evrak durumu.
- Sertifika durumu.
- Vardiya / izin.
- Performans.
- Disiplin / uyari.
- Prim etkisi.

Aksiyonlar:

- Personel daveti.
- Rol atama.
- Yetki talebi.
- Evrak yukleme.
- Izin / vardiya girisi.
- Pasife alma talebi.
- Personel degisiklik talebi.

IK onay kapilari:

- Yeni personel hesabi genel merkez IK veya yetkili bayi sahibi onayiyla aktif olur.
- Kritik roller icin evrak ve egitim tamamlanmadan teknik yetki acilmaz.
- Personel cikisi yapildiginda erisim ve rapor yetkisi aninda kapanir.

### 4.8 Academy

Amaç: Sube personelinin egitim, sertifika ve yetki durumunu operasyonla baglamak.

Her rol icin zorunlu egitimler:

- Franchise sahibi: AC-01, AC-02, AC-05, AC-06, AC-28, AC-29, AC-30, AC-35, AC-36, AC-42.
- Sube muduru: AC-01, AC-04, AC-10, AC-13, AC-14, AC-20, AC-24, AC-30, AC-31, AC-32, AC-33, AC-34.
- Musteri kabul: AC-01, AC-04, AC-09, AC-10, AC-11, AC-12, AC-13, AC-24, AC-25.
- Teknisyen: AC-01, AC-07, AC-08, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-20.
- Diagnostik/OBD: Teknisyen yolu + AC-18.
- EV uzmani: Teknisyen yolu + AC-19.
- Finans/kasa: AC-05, AC-29, AC-30.

Yetki kilitleri:

- AC-05 tamamlanmadan musteri verisi tam gorunmez.
- AC-08 tamamlanmadan arac kabul islemi yapilmaz.
- AC-14/AC-15 tamamlanmadan kritik rapor notu yazma yetkisi sinirli olur.
- AC-16 tamamlanmadan kaporta boya gorevi tam yetkiyle kapanmaz.
- AC-17 tamamlanmadan mekanik gorev tam yetkiyle kapanmaz.
- AC-18 tamamlanmadan OBD gorevi tam yetkiyle kapanmaz.
- AC-31/AC-34 tamamlanmadan sube muduru tam onay yetkisi alamaz.

### 4.9 Finans / Kasa

Amaç: Bayinin gunluk finansini gormesi, genel merkezin de royalty ve finans disiplinini takip etmesi.

Alt ekranlar:

- Gunluk kasa.
- Paket bazli satis.
- POS / nakit / havale.
- Fatura / makbuz.
- Iade / iptal.
- Giderler.
- Personel giderleri.
- Royalty.
- Reklam katkisi.
- Genel merkez borc/alacak.
- Gun sonu kapanis.

Bayi sahibi gorur:

- Ciro.
- Gider.
- Kar/zarar.
- Royalty.
- Personel maliyeti.
- Paket karliligi.

Sube muduru sinirli gorur:

- Gunluk tahsilat.
- Paket satislari.
- Kasa kapanis durumu.
- Gider talep durumu.

Musteri kabul/kasa gorur:

- Odeme alma.
- Fatura/makbuz.
- Gun sonu kasa teslimi.

### 4.10 Stok / Cihaz / Kalibrasyon

Amaç: Teknik operasyonun cihaz ve sarf acisindan kilitlenmemesini saglamak.

Kayitlar:

- Mikron cihazi.
- OBD cihazi.
- Fren/dyno cihazi.
- Lift.
- Kamera.
- Yazici.
- Tablet.
- Sarf malzeme.
- Rapor kagidi.
- Eldiven/temizlik/saha malzemesi.

Zorunlu alanlar:

- Cihaz seri no.
- Kalibrasyon tarihi.
- Sonraki kalibrasyon.
- Sorumlu kisi.
- Ariza durumu.
- Servis kaydi.

Kilit kurallari:

- Kalibrasyonu gecmis cihazla girilen olcum raporda uyarili gorunmeli.
- Kritik cihaz arizaliysa ilgili paket satilamamali veya kapsam disi notu zorunlu olmali.

### 4.11 Kalite / Sikayet / Itiraz

Amaç: Hatalı rapor, eksik kanit, musteri sikayeti ve sube standardi risklerini erken yakalamak.

Alt ekranlar:

- Rapor kalite skoru.
- Eksik fotograf listesi.
- Geri donen raporlar.
- Itirazli raporlar.
- Sikayetler.
- Google yorumlari.
- CAPA aksiyonlari.
- Usta bazli hata.
- Academy yeniden egitim onerileri.

Sistem tetikleyicileri:

- Rapor itirazi acildiysa kalite ticket'i olusur.
- Ayni personelde 2 kez ayni hata varsa Academy yeniden egitim atanir.
- Eksik kanitla rapor teslim edildiyse sube muduru ve bayi sahibi alarm alir.
- Hukuki riskli sikayet P0/P1 olarak merkeze eskale edilir.

### 4.12 Genel Merkez Talepleri / Destek

Bayi portalinda bayi genel merkeze talep acabilmeli:

- Teknik destek.
- Cihaz ariza.
- Stok talebi.
- Personel talebi.
- Finans itirazi.
- Rapor itirazi.
- Hukuk sorusu.
- Pazarlama destek.
- Google profil sorunu.
- Egitim destegi.

Her talep:

- Kategori.
- Oncelik.
- SLA.
- Sorumlu departman.
- Durum.
- Kapanis kaniti.

## 5. Rol Bazli Yetki Matrisi

Yetki tipleri:

- `Gorur`: Veri goruntuleyebilir.
- `Olusturur`: Yeni kayit acabilir.
- `Duzenler`: Kaydin belirli alanlarini degistirebilir.
- `Onaylar`: Kilit acan onayi verebilir.
- `Basar/Teslim`: Raporu basabilir veya teslim edebilir.
- `Yonetir`: Personel, finans, stok gibi yonetsel alanlari yonetebilir.

| Modul / Alan | Bayi Sahibi | Sube Muduru | Musteri Kabul / Sekreterya | Kaporta Ustasi | Mekanik Usta | OBD Ustasi | Test Operatoru | Kasa / Muhasebe | Destek Personeli |
|---|---|---|---|---|---|---|---|---|---|
| Ana kokpit | Tum sube | Operasyon | Kendi isleri | Kendi isleri | Kendi isleri | Kendi isleri | Kendi isleri | Kasa | Sinirli |
| Is emri | Gorur | Olusturur/duzenler | Olusturur/duzenler | Sadece gorev | Sadece gorev | Sadece gorev | Sadece gorev | Odeme alanlari | Sinirli |
| Paket secimi | Gorur | Degistirebilir | Secer | Gorur | Gorur | Gorur | Gorur | Fiyat gorur | Yok |
| Odeme | Tum | Ozet | Girer | Yok | Yok | Yok | Yok | Yonetir | Yok |
| Teknik bulgu | Gorur | Gorur/geri yollar | Degistiremez | Kendi alanini girer | Kendi alanini girer | Kendi alanini girer | Kendi alanini girer | Yok | Yok |
| Fotograf/kanit | Gorur | Kontrol eder | Kabul/teslim kaniti | Teknik kanit | Teknik kanit | Cihaz kaniti | Test kaniti | Odeme kaniti | Saha kaniti |
| Rapor onayi | Izler | Onaylar | Yok | Yok | Yok | Yok | Yok | Yok | Yok |
| Rapor basim | Izler | Izler | Basar/teslim eder | Yok | Yok | Yok | Yok | Odeme uygunsa gorur | Yok |
| Rapor arsivi | Tum sube | Tum sube | Musteri/teslim icin | Kendi girdigi raporlar | Kendi girdigi raporlar | Kendi girdigi raporlar | Kendi girdigi raporlar | Odeme baglantili | Yok |
| Musteri CRM | Tum sube | Tum sube | Olusturur/duzenler | Yok | Yok | Yok | Yok | Odeme bilgisi | Sinirli |
| Personel | Tum | Vardiya/perf | Yok | Kendi profil | Kendi profil | Kendi profil | Kendi profil | Yok | Kendi profil |
| Academy | Tum sube | Tum sube | Kendi egitimi | Kendi egitimi | Kendi egitimi | Kendi egitimi | Kendi egitimi | Kendi egitimi | Kendi egitimi |
| Finans | Tum | Ozet | Odeme/kasa sinirli | Yok | Yok | Yok | Yok | Yonetir | Yok |
| Stok/cihaz | Tum | Yonetir | Yazici/kagit | Kullandigi cihaz | Kullandigi cihaz | Kullandigi cihaz | Kullandigi cihaz | Yok | Sarf bildirir |
| Kalite/sikayet | Tum | Yonetir | Musteri iletisim | Kendi hatasi | Kendi hatasi | Kendi hatasi | Kendi hatasi | Yok | Yok |
| Genel merkez talebi | Acar/onaylar | Acar | Kendi alaninda acar | Teknik talep | Teknik talep | Teknik talep | Test talep | Finans talep | Stok/saha talep |

## 6. Rol Bazli Ana Ekranlar

### 6.1 Bayi Sahibi

Ana hedef: Sube sagligi, para, risk, kalite ve personel.

Menu:

- Kokpit.
- Is emirleri.
- Raporlar.
- Musteriler.
- Personel.
- Academy.
- Finans.
- Stok & Cihaz.
- Kalite & Sikayet.
- Genel Merkez Talepleri.
- Sube Ayarlari.

Kritik KPI:

- Gunluk/aylik ciro.
- Paket bazli gelir.
- Royalty borcu.
- Gider.
- Net kar tahmini.
- Rapor adedi.
- Rapor kalite skoru.
- Google puani.
- Sikayet sayisi.
- Academy uyum skoru.
- Personel doluluk.

### 6.2 Sube Muduru

Ana hedef: Gunluk operasyonu aksatmadan rapor kalitesini kilitlemek.

Menu:

- Gunluk Operasyon.
- Is Emirleri.
- Usta Gorevleri.
- Mudur Onayi.
- Raporlar.
- Teslim Kuyrugu.
- Personel Vardiya.
- Academy Eksikleri.
- Kalite & Sikayet.
- Stok & Cihaz.

Kritik KPI:

- Acik is emri.
- Geciken gorev.
- Eksik kanit.
- Onay bekleyen rapor.
- Teslim bekleyen musteri.
- Usta basina is.
- Ortalama teslim suresi.
- Gunluk kapasite.

### 6.3 Musteri Kabul / Sekreterya

Ana hedef: Musteriyi dogru almak, is emrini eksiksiz acmak, onayli raporu teslim etmek.

Menu:

- Randevular.
- Is Emri Ac.
- Arac Kabul.
- Odeme Durumu.
- Basim Kuyrugu.
- Teslim / QR Gonder.
- Musteri Notlari.

Kritik KPI:

- Bekleyen randevu.
- Evrak eksigi.
- Odeme bekleyen.
- Basim bekleyen.
- Teslim bekleyen.
- Google yorum istenecek musteri.

### 6.4 Kaporta / Boya Ustasi

Ana hedef: Kaporta-boya bulgusunu kanitli ve standart girisle kapatmak.

Menu:

- Bana Atanan Isler.
- Aktif Arac.
- Kaporta/Boya 58 Nokta.
- Fotograf/Kanit.
- Geri Donen Duzeltmeler.
- Tamamlanan Isler.

Kritik KPI:

- Bekleyen gorev.
- Eksik fotograf.
- Geri donen rapor.
- Ortalama gorev suresi.
- Hata/itiraz sayisi.

### 6.5 Mekanik Usta

Menu:

- Bana Atanan Isler.
- Aktif Arac.
- Motor/Mekanik.
- Alt Takim.
- Fotograf/Kanit.
- Geri Donen Duzeltmeler.
- Tamamlanan Isler.

### 6.6 Diagnostik / OBD Ustasi

Menu:

- Bana Atanan Isler.
- Aktif Arac.
- OBD Moduller.
- Airbag/SRS Yontem.
- Aku/Sarj.
- Cihaz Ekran Kaniti.
- Tamamlanan Isler.

### 6.7 Test Operatoru

Menu:

- Bana Atanan Testler.
- Fren Testi.
- Suspansiyon.
- Dyno / Yol Testi.
- Lastik / DOT.
- Cihaz Ciktisi.

### 6.8 Kasa / Muhasebe

Menu:

- Gunluk Kasa.
- Tahsilatlar.
- Paket Satislari.
- Fatura / Makbuz.
- Iade / Iptal.
- Gun Sonu Kapanis.
- Royalty Ozet.

## 7. Onay ve Kilit Mimarisi

### 7.1 Bayi Acilis Kilitleri

Sube canli acilamaz:

- Sozlesme onayi yoksa.
- Finans onayi yoksa.
- Minimum personel tanimli degilse.
- Franchise sahibi ve sube muduru zorunlu egitimleri tamamlamadiysa.
- Cihaz/kalibrasyon kaydi yoksa.
- Google profil / lokasyon hazirligi eksikse.
- Kalite on denetimi tamamlanmadiysa.

### 7.2 Personel Yetki Kilitleri

Personel tam yetki alamaz:

- KVKK ve gizlilik egitimi tamamlanmadiysa.
- Evrak eksikse.
- Rol egitimi tamamlanmadiysa.
- Sertifika suresi dolduysa.
- Disiplin/kalite kilidi varsa.

### 7.3 Is Emri Kilitleri

Is emri acilmaz veya ilerlemez:

- Musteri bilgisi yoksa.
- Arac plaka/sasi eksikse.
- Paket secilmediyse.
- KVKK/yol testi riza eksikse.
- Odeme politikasina gore tahsilat eksikse.

### 7.4 Rapor Yayin Kilitleri

Rapor onaylanmaz:

- Paket kapsamindaki gorevler tamamlanmadiysa.
- Islemli kaporta satirinda fotograf yoksa.
- Cihaz olcumu gereken alanda cihaz ciktisi yoksa.
- Usta ham notu musteri diline cevrilmediyse.
- Riskli ifade kontrolu gecmediyse.
- Ikinci usta kontrolu gereken bulgu onaysizsa.
- Plaka/sasi/motor no uyumsuzsa.

### 7.5 Teslim Kilitleri

Rapor teslim kapanmaz:

- Mudur onayi yoksa.
- Rapor PDF / QR uretilmediyse.
- Odeme durumu politikaya uygun degilse.
- Teslim imzasi veya teslim kanali kaydedilmediyse.

## 8. Veri Modeli Onerisi

Mevcut `docs/data-model.md` ve `docs/ekspertiz-data-backbone-v1.md` genisletilerek su tablolar netlesmeli.

### 8.1 Franchise ve Acilis

- `franchise_leads`
- `franchise_applications`
- `franchise_scores`
- `branch_opening_projects`
- `opening_checklist_items`
- `opening_approvals`
- `opening_assets`
- `opening_training_plan`

### 8.2 Bayi Portali ve Yetki

- `dealer_accounts`
- `branch_users`
- `branch_roles`
- `role_permissions`
- `permission_overrides`
- `user_training_locks`
- `user_device_permissions`
- `branch_audit_logs`

### 8.3 Gunluk Operasyon

- `appointments`
- `work_orders`
- `expertise_cases`
- `inspection_tasks`
- `inspection_results`
- `body_paint_results`
- `measurements`
- `obd_scans`
- `media_assets`
- `report_documents`
- `report_delivery_events`
- `report_revisions`

### 8.4 Sube IK / Academy

- `employees`
- `employee_documents`
- `employee_role_assignments`
- `shift_plans`
- `leave_requests`
- `academy_courses`
- `academy_enrollments`
- `certificates`
- `training_attempts`

### 8.5 Finans / Kasa

- `cash_sessions`
- `payments`
- `invoices`
- `refunds`
- `branch_expenses`
- `royalty_accruals`
- `royalty_payments`
- `cash_closing_approvals`

### 8.6 Stok / Cihaz

- `branch_assets`
- `device_calibrations`
- `device_service_records`
- `inventory_items`
- `inventory_movements`
- `stock_requests`

### 8.7 Kalite / Sikayet

- `quality_checks`
- `quality_findings`
- `capa_actions`
- `customer_complaints`
- `report_disputes`
- `root_cause_records`
- `training_recommendations`

## 9. Durum Makineleri

### 9.1 Franchise Adayi

```text
Yeni Lead
-> Ilk Gorusme
-> On Eleme
-> Lokasyon Inceleme
-> Finans Onayi
-> Hukuk / Sozlesme
-> Acilis Dosyasi
-> Kurulum
-> Egitim / Personel
-> Kalite On Denetim
-> Canli Acilis
-> Ilk 90 Gun Takip
```

### 9.2 Sube Acilis Projesi

```text
Taslak
-> Planlandi
-> Kurulumda
-> Personel Bekliyor
-> Egitim Bekliyor
-> Cihaz / Kalibrasyon Bekliyor
-> Kalite On Denetim
-> Acilisa Hazir
-> Canli
-> Ilk 90 Gun Izleme
```

### 9.3 Is Emri

```text
Taslak
-> Kabul Bekliyor
-> Usta Gorevleri Olustu
-> Usta Girisinde
-> Eksik Kanit
-> Mudur Onayi Bekliyor
-> Onaylandi
-> Sekreterya Basiminda
-> Teslim Edildi
-> Itirazli / Revizyon
```

### 9.4 Usta Gorevi

```text
Bekliyor
-> Devam Ediyor
-> Eksik Kanit
-> Tamamlandi
-> Mudur Duzeltme Istedi
-> Yeniden Tamamlandi
```

### 9.5 Rapor

```text
Taslak
-> Veri Toplaniyor
-> Kalite Kontrol
-> Yayin Onayi Bekliyor
-> Yayinlandi
-> Basildi
-> Teslim Edildi
-> Revize Edildi
-> Itirazli
```

## 10. Ilk Hafta Canliya Hazirlik Plani

### Gun 1 - Basvuru ve Pipeline

Hedef:

- Franchise adayi basvurusu sisteme dussun.
- Aday skoru hesaplansin.
- On eleme ve takip gorevleri acilsin.

Ekranlar:

- Public web franchise formu.
- Franchise satis lead detayi.
- Aday skorlama.
- Aday takip gorevleri.

Veri:

- Lead.
- Franchise application.
- Franchise score.
- Notes/tasks.

### Gun 2 - Onay ve Acilis Dosyasi

Hedef:

- Lokasyon, finans ve hukuk onay sureci sistemde izlenebilir olsun.

Ekranlar:

- Lokasyon fizibilite.
- Finans onayi.
- Hukuk/sozlesme.
- Acilis projesi.

Veri:

- Opening project.
- Approval chain.
- Checklist.

### Gun 3 - Bayi Portali Aktivasyonu

Hedef:

- Sube kaydi ve bayi portali olussun.
- Bayi sahibi ilk girisi yapabilsin.

Ekranlar:

- Bayi portal ana sayfa.
- Sube ayarlari.
- Kullanici davetleri.
- Genel merkez talep merkezi.

Veri:

- Branch.
- Dealer account.
- Roles.
- Permissions.

### Gun 4 - Personel, IK ve Academy

Hedef:

- Personeller tanimlansin.
- Roller ve egitimler otomatik atansin.
- Yetki kilitleri gorunsun.

Ekranlar:

- Personel listesi.
- Personel detay.
- Evrak durumu.
- Academy atamalari.
- Yetki kilitleri.

Veri:

- Employees.
- Employee documents.
- Academy enrollments.
- Certificates.

### Gun 5 - Cihaz, Stok, Finans ve Kasa

Hedef:

- Sube operasyon icin cihaz, stok ve kasa olarak hazir gorunsun.

Ekranlar:

- Stok/cihaz.
- Kalibrasyon.
- Kasa ayarlari.
- POS/fatura.
- Royalty sozlesme ozet.

Veri:

- Assets.
- Device calibrations.
- Inventory.
- Cash session config.
- Finance rules.

### Gun 6 - Ilk Is Emri ve Rapor Akisi

Hedef:

- Ilk musteri kabul edilsin.
- Is emri acilsin.
- Paket gorevleri ustalara dussun.
- Ustalar tablet/PC ile veri girsin.
- Rapor taslagi olussun.

Ekranlar:

- Is emri ac.
- Usta tablet.
- Rapor taslak.
- Mudur onayi.
- Sekreterya basim.

Veri:

- Work order.
- Expertise case.
- Inspection tasks.
- Results.
- Media assets.
- Report document.

### Gun 7 - Teslim, Sikayet ve Ilk 90 Gun Takip

Hedef:

- Rapor musterinin eline gecsin.
- Memnuniyet ve Google yorum akisi baslasin.
- Ilk 90 gun takip paneli acilsin.

Ekranlar:

- Teslim / QR.
- Memnuniyet.
- Google yorum istegi.
- Kalite kontrol.
- Ilk 90 gun bayi takip.

Veri:

- Delivery event.
- Satisfaction event.
- Review request.
- Quality score.
- 90 day branch tracking.

## 11. MVP Uygulama Sirasi

Canliya en yakin prototip icin onerilen uygulama sirasi:

1. Mevcut `Bayi Paneli` ekranini `Bayi Portali` olarak yeniden isimlendir.
2. Rol secici ekle: Bayi Sahibi, Sube Muduru, Musteri Kabul, Usta, Kasa.
3. Rol secimine gore menu ve ana kokpit degissin.
4. Is emri akisini koru ve detaylandir:
   - Yeni is emri.
   - Aktif is emirleri.
   - Paket kapsam gorevleri.
   - Usta gorev tablosu.
   - Mudur onayi.
   - Sekreterya teslim.
5. Rapor merkezi ekle:
   - Gecmis rapor arama.
   - Rapor no/plaka/sasi filtre.
   - PDF/QR/itiraz aksiyonlari.
6. Personel + Academy sekmesi ekle:
   - Personel listesi.
   - Rol, evrak, egitim, yetki kilidi.
7. Finans + kasa sekmesi ekle:
   - Gunluk tahsilat.
   - Paket gelirleri.
   - Kasa kapanis.
   - Royalty ozet.
8. Stok/cihaz sekmesi ekle:
   - Cihazlar.
   - Kalibrasyon.
   - Sarf/stok.
9. Kalite/sikayet sekmesi ekle:
   - Itirazli rapor.
   - Eksik kanit.
   - CAPA.
   - Egitim onerisi.

## 12. İlk Ekran Tasarim Prensibi

Bayi portali bir pazarlama sayfasi gibi olmamali. Gunluk is yapan operasyon ekrani olmali.

Tasarim prensipleri:

- Ilk ekranda is yapilabilir bilgiler.
- Kisa KPI, uzun tablo dengesi.
- Rol bazli sade menuler.
- Geciken/eksik/riski net renklerle goster.
- Teknik personelde sadece kendi gorevi.
- Sekreterya ekraninda basim ve teslim odakli akış.
- Bayi sahibinde para, kalite, personel ve risk.
- Sube mudurunde operasyon, onay ve kapasite.
- Genel merkez verisi bayi ekraninda sinirli gosterilmeli.

## 13. Kritik Eksikler ve Karar Gereken Noktalar

Bu sorular uygulama sirasinda netlesmeli:

1. Bayi sahibi kendi personel maas/gider detayini tam gorecek mi, yoksa sadece toplam gider mi?
2. Sube muduru odeme/ciro detayinda ne kadar yetkili olacak?
3. Odeme tamamlanmadan rapor teslim edilebilir mi?
4. Bayi sahibi teknik rapor sonucunu degistirebilir mi? Oneri: hayir, sadece itiraz/ikinci kontrol baslatir.
5. Usta ham notu musterinin raporuna hangi seviyede yansiyacak? Oneri: ham not sadece ic kayit, musteri dili standart.
6. Kucuk subede ayni kisi hem musteri kabul hem kasa hem sekreterya olabilir mi? Oneri: olabilir, ama sistem rol yetkilerini ayri tutar.
7. Franchise sahibi egitimleri tamamlamadan portal acilir mi? Oneri: sinirli acilir, finans/personel/rapor onayi kilitli kalir.
8. Ilk 90 gun boyunca genel merkez hangi alanlari zorunlu denetleyecek?
9. Rapor itirazinda bayi mi genel merkez mi ilk cevap sahibi olacak? Oneri: ilk cevap sube, P1/P0 merkez eskalasyon.
10. Cihaz kalibrasyonu gecerse sistem is emrini durduracak mi, yoksa raporda uyarili mi gosterecek? Oneri: kritik cihazda durdurur.

## 14. Sonuc

Bayi portali, OTOTR franchise sisteminin gunluk isletim merkezi olmalidir. Sadece rapor basan bir panel degil; personel, egitim, yetki, kasa, cihaz, kalite, sikayet, genel merkez talebi ve rapor veri omurgasini tek yerde birlestiren sube isletim sistemi olmalidir.

Ilk uygulanacak hedef:

- Bayi portali rol secimli hale getirilecek.
- Ana kokpit role gore degisecek.
- Is emri, usta gorevi, mudur onayi ve sekreterya teslim akisi korunup genisletilecek.
- Rapor arsivi, personel/Academy, finans/kasa, stok/cihaz ve kalite sekmeleri eklenecek.
