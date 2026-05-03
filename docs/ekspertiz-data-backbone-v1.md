# OTOTR Ekspertiz Data Backbone v1

Bu dokuman, OTOTR ERP/CRM sisteminde ekspertiz kaydinin ana veri kaynagi olarak nasil tasarlanacagini tarif eder. Incelenen ornek dosyalar:

- `D:\OTOTR\Arabam com ekspertz ornegi.pdf`
- `D:\OTOTR\Borusan Ekspertiz Ornegi.pdf`
- `D:\OTOTR\d expert.pdf`
- `D:\OTOTR\ornek-oto-ekspertiz-raporu.pdf`

Not: Bu dokuman rakip raporlarin kopyasi degildir. Orneklerden alan tipleri, operasyon mantigi, hukuki katman ve veri ihtiyaci cikarildi; OTOTR icin daha kurumsal, veri odakli ve moduller arasi calisacak bir mimari tasarlandi.

## 1. Ana karar

Ekspertiz raporu OTOTR icin PDF ciktisi degil, sistemin ana veri cekirdegidir.

Her arac icin tek bir `expertise_case` olusur. Bu kayit; randevu, arac kabul, musteri karsilama, teknisyen tablet girisi, fotograf/kanit, olcum degerleri, rapor yazimi, kalite onayi, musteri teslimi, sikayet, garanti, hukuk ve bayi performansi verilerini birbirine baglar.

Bu yuzden rapor yapisi su dort katmandan olusmalidir:

1. Operasyon kaydi: is emri, bayi, sube, personel, zaman, paket, odeme.
2. Teknik veri kaydi: ustalarin tablet uzerinden girdigi kontrol, olcum, fotograf, not ve sonuc verileri.
3. Musteri anlatim kaydi: musteriye giden sade ozet, risk dili, tavsiye ve teslim notu.
4. Kurumsal veri kaydi: kalite skoru, hukuki metin, garanti kosulu, itiraz/sikayet baglantisi, analitik.

## 2. Ornek raporlardan cikan dersler

### 2.1 Arabam.com tipi rapor

Gozlenen yapi:

- Sasi numarasi uzerinden rapor kimligi.
- Musteri, telefon, tarih, rapor no.
- Cekis tipi, yedek anahtar, yakit durumu.
- Paket icerigi.
- Kaporta/boya durumu.
- Parca bazli orijinal/boyali/lokal boyali/degisen ayrimi.
- Mikron araligi.
- Kaza/hasar durumu.
- Arac fotograflari.
- Motor uzerinden temel tespitler.

OTOTR icin ders:

- Sasi ve rapor no ana dogrulama alanlari olmali.
- Kaporta/boya parcasi sadece metin degil, parca bazli struktur veri olmali.
- Mikron bilgisi tek yazi olarak degil `min/max/actual/unit/deviceId` seklinde tutulmali.
- Fotograf, ilgili parca ve bulguya baglanmali.

### 2.2 Borusan tipi bilgi formu

Gozlenen yapi:

- Araba bilgi formu ile ekspertiz raporu karisimi.
- Arac genel bilgileri: marka, model, yil, km, yakit, vites, motor hacmi.
- Teknik bilgiler: motor performansi, tork, vites, menzil, donanim.
- Donanim listesi.
- Kaporta ekspertiz.
- Hasar bilgisi, haciz/rehin gibi ticari satis alanlari.
- Fiyat bilgisi.

OTOTR icin ders:

- Ekspertiz verisi satis/CRM verisiyle birlikte calisabilmeli.
- Donanim ve teknik katalog verisi manuel giris degil, mumkunse marka/model katalogundan gelmeli.
- Fiyat, hasar, rehin/haciz gibi ticari karar alanlari raporun teknik cekirdeginden ayrilmali ama ayni `expertise_case` altinda iliskili tutulmali.

### 2.3 D-Expert tipi rapor

Gozlenen yapi:

- Paket adi ve bayi/sube bilgisi belirgin.
- Musteri ve arac bilgileri.
- Kaporta kontrolu.
- Sistem bazli durumlar: sorunsuz, bakim gerekli, onarim/degisim gerekli.
- Ic donanim, aydinlatma, silecek, elektrik/elektronik, emniyet kemeri, lastik/jant, fren, yurur aksam, motor.
- Fren olcumleri, yanal kayma, dyno/test gucu, tork.
- OBD genel ariza tarama.
- Hasar kaydi alanlari.
- Arac resimleri ve diger notlar.
- Uzun hukuki kapsam/disclaimer.

OTOTR icin ders:

- Usta girisi uc seviyeli durum standardina sahip olmali: `sorunsuz`, `bakim_gerekli`, `onarim_degisim_gerekli`.
- Olcum cihazlari ayri veri tipi olmali.
- OBD ve cihaz verileri manuel rapor notundan ayrilmali.
- Hukuki metin dinamik olmali: paket, arac tipi, test yapilamayan alan, garanti kosulu, EV/hybrid gibi degiskenlere gore uretilmeli.

### 2.4 RaporTurk tipi rapor

Gozlenen yapi:

- Gorsel ve sertifika hissi guclu.
- Is emri no, plaka, sasi, bayi nushasi/rapor sahibi nushasi ayrimi.
- Arac kabul/teslim/bilgi formu ve imzalar.
- Teknisyen, kabul tarihi, teslim tarihi, giris/cikis km.
- Paket, paket tutari, odeme.
- Arac sahibi, alici, satici/vekil ayrimi.
- Yedek anahtar, ruhsat asli goruldu mu, garanti/sigorta teklifi.
- Ekspertiz oncesi tespit edilen durumlar.
- Musteri riza metni ve KVKK.
- Alt/on/mekanik check-up raporu.
- Cok onemli/orta onemli onceliklendirme.
- Kaporta/boya check-up raporu.
- Agir islem yorumu.
- Garanti sayfalari.
- QR, hologram, dogrulama, mobil uygulama yonlendirmesi.

OTOTR icin ders:

- Is emri ve rapor musteri ciktisi ayni sey degil. Veritabaninda ayni kayda bagli farkli belge nushalari olmali.
- Musteri kabul personelinin verisi teknik rapordan once gelir ve teknik raporu besler.
- Garanti, riza, paket ve odeme rapora sonradan eklenen not degil, ilk sinif veri nesnesi olmali.
- Onem derecelendirmesi musteriye anlatim icin cok degerli: kritik, onemli, takip, bilgi.

### 2.5 Otorapor tipi rapor

Gozlenen yapi:

- Otorapor, rakipler icinde operasyonel paket ve belge disiplini en guclu orneklerden biri.
- Is emri no, plaka, sasi, rapor no ve sube bilgisi raporun her katmaninda belirgin.
- QR/mobil arsiv, dijital rapor uyarisi ve el yazisi/degistirilmis rapor gecersizligi vurgusu var.
- Bayide kalacak nusha ile rapor sahibine verilecek nusha ayriliyor.
- Arac kabul, arac teslim, musteri bilgisi ve imza alanlari teknik rapordan once geliyor.
- Alici, satici, arac sahibi ve vekil ayrimi operasyonel olarak dusunulmus.
- Paket, paket tutari, odeme, yedek anahtar, ruhsat asli, airbag paket uyarisi gibi alanlar acik.
- SBM/Tramer, HGS/km, recall/yetkili servis sorgusu ve satici garanti yukumlulugu metinleri yer aliyor.
- Kaporta boya bolumunde sol, ust, sag ve sasi bakis acilariyla detayli kodlama kullaniliyor.
- Kod seti parca durumunu hizli anlatmak icin yararli: orijinal, boyali, lokal boyali, degisen, plastik parca, kismi boya gibi.
- Airbag icin usta kanaati ve paket disi kapsam uyarisi ayrica belirtiliyor.
- Usta gorusleri ve kaporta/boya garanti metni raporun savunulabilirligini artiriyor.

OTOTR icin ders:

- Otorapor'daki is emri, nusha, QR, dijital gecerlilik ve kabul/teslim disiplini korunmali; fakat musteriye daha sade ve premium bir ilk sayfa ile sunulmali.
- Kaporta kodlari sadece sembol olarak kalmamali; her kodun musteri dili, teknik anlami, onem seviyesi ve veri karsiligi olmali.
- Airbag, recall, SBM/Tramer, HGS/km ve garanti uyarilari rapor sonunda gizli hukuki metin degil, karar ozetinde okunur risk kutulari olmali.
- Bayide kalacak nusha, musteri nushasi, kalite nushasi ve hukuk nushasi ayni `expertise_case` altindan uretilmeli.
- Usta kanaati metni serbest bir paragraf olarak degil, kanit, ikinci kontrol, risk seviyesi ve musteri anlatimi ile bagli tutulmali.

OTOTR kapsam kilidi:

Otorapor'da veri girilen her noktanin OTOTR karsiligi olmalidir. Bu, sadece rapor sayfasi basligi olarak degil, veri tabani alani ve ekran formu olarak ele alinmalidir.

- Is emri ve rapor kimligi: is emri no, rapor no, plaka, sasi, motor no, rapor tarihi, bayi, sube, adres, telefon, vergi no, franchise sorumlulugu.
- Operasyon zamanlari: isi acan teknisyen/personel, arac kabul tarih-saat, kapanis tarih-saat, arac teslim saat, giris km, cikis km.
- Paket ve finans: talep edilen paketler, paket tutari, odeme durumu, garanti teklifi, kasko/trafik sigorta teklifi.
- Taraflar: ekspertiz talep eden alici, alici vekili, satici/kullanan kisi, ruhsat sahibi, T.C./vergi no/MERSIS, telefon, e-posta, adres, imza.
- Arac kabul detaylari: yedek anahtar, ruhsatin asli goruldu mu, yakit seviyesi, arac sahibi beyani, ekspertiz oncesi tespit edilen durumlar.
- Riza ve hukuk: KVKK, pazarlama izni, yol testi onayi, dyno/cihaz sorumluluk kabul metni, airbag paket uyari metni, kriminal inceleme disi metni, ekspertiz kapsam/sart kabul metni.
- Dis sorgular: recall/yetkili servis uyari, SBM/Tramer, hasar QR, HGS/PTT kilometre, Km Hunter/cihaz km, ceza/kayit, sorgu yapilamadi nedeni.
- Kaporta kod sozlugu: O, B, LB, D, EM, PP, KCBD, N, Y, AT, AAIG, KKFE ve OTOTR'nin ekleyecegi ikinci kontrol/fotograf/kanit kodlari.
- Kaporta 0-58 nokta seti: genel dolu/onarim, kus pisligi/boya bozulmasi, sasi uclari, kapi icleri, alt on/orta/arka fotograf, airbag isigi, frangartlar, karalama kagidi, alt taban, agir islem, temizlik, marsbiyel, bagaj, camlar, sunroof, sag/sol kapilar, direkler, camurluklar, podye, kule, panel, havuz, tampon, panjur, noktasal ezik-cizik.
- Ozet usta gorusleri: teknik ham not, musteriye anlatim, agir islem yorumu, airbag usta kanaati, servis/bakim tavsiyesi.
- Garanti: kaporta/boya garanti kapsami, teminat limiti, sure/km siniri, ayni gun noter satis sarti, garanti disi kosullar, sikayet/itiraz linki.

OTOTR bu alanlarin uzerine su ek alanlari koymalidir:

- Veri sahibi rol: karsilama, usta, sube muduru, kalite, sistem.
- Kanit zorunlulugu: fotograf, video, cihaz ekrani, ikinci usta, imza, QR.
- Kalite kurali: hangi alan bos kalirsa rapor yayinlanamaz.
- Musteri dili: teknik bulgunun raporda nasil sade anlatilacagi.
- Modul etkisi: CRM, bayi paneli, finans, hukuk, kalite, Academy ve garanti akisina hangi sinyalin gidecegi.

### 2.6 RS tipi rapor

Gozlenen yapi:

- RS raporu daha cok test cihazi, zaman ve teknik sonuc disiplinine odaklaniyor.
- Rapor no, paket, ucret, cikti tarihi, baslangic/bitis saati ve test kilometresi belirgin.
- Bayi bilgisi, TSE ve HYB gibi kurumsal yeterlilik alanlari var.
- Ruhsat ve arac fotograflari rapora ayri sayfa olarak ekleniyor.
- Kaporta boya testleri cok sayfali ve bulgu lejandi ile sunuluyor.
- Suspansiyon testi, fren testi, yanal kayma testi ve referans degerler yer aliyor.
- Dyno performans, motor kontrol, mekanik kontrol ve OBD test sonuclari ayri teknik bolumler halinde veriliyor.
- Ceza/kayit sorgusu, hasar sorgusu ve kilometre sorgusu raporun ek guven katmanini olusturuyor.

OTOTR icin ders:

- Test cihazindan gelen degerler rapora sadece ekran goruntusu olarak degil, normalize edilmis olcum verisi olarak kaydedilmeli.
- Baslangic/bitis saati, test km, cihaz seri no ve teknisyen bilgisi her istasyon sonucuna baglanmali.
- TSE/HYB ve sube yeterlilik bilgileri raporun guven katmaninda gosterilmeli.
- Fren, suspansiyon, yanal kayma, dyno ve OBD icin referans deger, sonuc, yorum ve musteri dili ayri alanlar olmali.
- Ceza, hasar ve km sorgulari teknik rapordan ayrilmadan; ama kapsam siniri net belirtilerek dogrulama panelinde sunulmali.

## 3. OTOTR rapor felsefesi

OTOTR raporu uc kisi icin ayni anda calismali:

1. Musteri: Aracin durumunu sade, guvenilir ve korkutmadan anlamali.
2. Usta/sube: Teknik tespiti eksiksiz, kanitli ve savunulabilir sekilde kaydetmeli.
3. Genel merkez: Kalite, bayi performansi, sikayet, hukuk, finans ve egitim verisini otomatik uretmeli.

Bu nedenle OTOTR rapor dili iki katmanli olacak:

- Teknik katman: Ustanin girdigi olcum, parca, durum, cihaz verisi, fotograf, ham not.
- Musteri katmani: Sistem tarafindan standartlastirilmis ozet, risk dili, tavsiye, onem derecesi.

Usta serbest metin yazabilir; fakat raporun musteriye giden ana dili sadece serbest metinden olusmamalidir. Serbest metin kalite ve hukuk icin risk uretir. Bu yuzden standart secim listeleri, durum kodlari ve kontrollu not sablonlari kullanilmalidir.

## 4. Ana surec

1. Lead/randevu olusur.
2. Musteri kabul araci teslim alir.
3. `expertise_case` ve `work_order` acilir.
4. Paket ve kapsam kilitlenir.
5. Musteri, arac sahibi, satici/vekil ve riza bilgileri kaydedilir.
6. Arac giris km, yakit, yedek anahtar, ruhsat, hasar beyanlari kaydedilir.
7. Tablet is istasyonlarina kontrol gorevi dagitir.
8. Ustalar parca, sistem, cihaz, fotograf ve not verilerini girer.
9. Rapor motoru teknik bulgulari musteri diline cevirir.
10. Sube muduru veya kalite yetkilisi raporu onaylar.
11. Rapor yayinlanir, QR/link uretilir.
12. Musteriye teslim ve anlatim kaydi girilir.
13. Memnuniyet, itiraz, sikayet veya garanti akisina baglanir.

## 5. Veri sahipligi

### 5.1 Musteri karsilama personeli girer

- Randevu no.
- Is emri no.
- Musteri tipi: alici, satici, galeri, filo, kurumsal.
- Musteri ad/soyad veya unvan.
- Telefon, e-posta.
- KVKK ve ticari ileti izinleri.
- Arac sahibi bilgisi.
- Satici/vekil bilgisi.
- Plaka.
- Sasi no.
- Motor no.
- Marka, model, versiyon.
- Model yili.
- Yakit tipi.
- Vites tipi.
- Cekis tipi.
- Giris km.
- Yakit seviyesi.
- Yedek anahtar durumu.
- Ruhsat asli goruldu mu.
- Trafik/kasko/garanti teklif istegi.
- Paket secimi.
- Paket tutari.
- Odeme durumu.
- Arac sahibinin beyanlari.
- Ekspertiz oncesi goze carpan durumlar.
- Teslim alinan evraklar.

### 5.2 Usta/teknisyen girer

- Istasyon baslangic/bitis zamani.
- Kontrol edilen sistem/parca.
- Durum kodu.
- Olcum degeri.
- Cihaz tipi ve cihaz seri no.
- Fotograf/video kaniti.
- Ses, koku, titresim gibi gozlemsel bulgu.
- Usta notu.
- Onem derecesi.
- Tavsiye edilen aksiyon.
- Test yapilamadiysa nedeni.

### 5.3 Sube muduru/kalite onayi girer

- Rapor tamamlik skoru.
- Eksik fotograf/olcum kontrolu.
- Riskli ifade kontrolu.
- Garanti kapsami uygunlugu.
- Musteri ozetinin dogrulugu.
- Rapor yayin onayi.
- Ikinci ekspertiz/ikinci usta kontrol ihtiyaci.

### 5.4 Sistem otomatik uretir

- Rapor no.
- QR dogrulama kodu.
- Rapor linki.
- Versiyon no.
- Degisiklik gecmisi.
- Kalite skoru.
- Risk skoru.
- Bayi performans etkisi.
- Sikayet/itiraz risk sinyali.
- Academy egitim ihtiyaci.
- Hukuki metin varyasyonu.

## 6. Ana database varliklari

### 6.1 `expertise_cases`

Ana ekspertiz dosyasi.

Temel alanlar:

- id
- report_no
- work_order_no
- branch_id
- dealer_id
- appointment_id
- customer_id
- vehicle_id
- package_id
- status
- opened_at
- intake_started_at
- inspection_started_at
- inspection_completed_at
- report_approved_at
- report_published_at
- delivered_at
- created_by
- assigned_manager_id
- overall_result
- overall_risk_level
- report_quality_score
- customer_summary
- internal_note

Status onerisi:

- `draft`
- `intake_waiting`
- `intake_completed`
- `inspection_waiting`
- `inspection_in_progress`
- `technician_review`
- `report_draft`
- `manager_approval`
- `quality_hold`
- `published`
- `delivered`
- `disputed`
- `cancelled`

### 6.2 `vehicles`

Arac ana karti.

- id
- plate
- vin
- engine_no
- brand
- model
- trim
- model_year
- registration_year
- fuel_type
- transmission_type
- drive_type
- body_type
- engine_volume
- engine_power
- color
- current_km
- source_catalog_id

### 6.3 `vehicle_ownership_context`

Aracin islem anindaki sahiplik/kisi baglami.

- expertise_case_id
- buyer_customer_id
- seller_customer_id
- registered_owner_name
- registered_owner_identity_masked
- proxy_person_name
- proxy_document_seen
- sale_context

### 6.4 `expertise_packages`

Paket tanimi.

- id
- name
- tier
- price
- duration_min
- includes_body_paint
- includes_mechanical
- includes_obd
- includes_dyno
- includes_brake_test
- includes_suspension_test
- includes_road_test
- includes_airbag_check
- includes_warranty
- warranty_type

### 6.5 `work_orders`

Operasyonel is emri.

- id
- expertise_case_id
- branch_id
- opened_by_user_id
- assigned_reception_user_id
- assigned_manager_id
- intake_time
- delivery_time
- entry_km
- exit_km
- key_status
- license_seen_status
- fuel_level
- payment_status
- invoice_status
- customer_signature_status
- seller_signature_status

### 6.6 `inspection_stations`

Istasyon tanimlari.

Ornek istasyonlar:

- Arac kabul
- Dis fotograf
- Kaporta/boya
- Sasi/direk/podye
- Motor/mekanik
- Sanziman/aktarma
- Alt takim/yurur aksam
- Fren/suspansiyon test
- Elektrik/elektronik
- OBD
- Dyno
- Ic donanim
- Lastik/jant
- Yol testi
- Rapor teslim

### 6.7 `inspection_tasks`

Her istasyon icin tablete dusen gorev.

- id
- expertise_case_id
- station_id
- assigned_user_id
- status
- started_at
- completed_at
- blocked_reason
- requires_second_check

### 6.8 `inspection_items`

Kontrol maddeleri.

- id
- station_id
- code
- label
- category
- importance_default
- input_type
- allowed_statuses
- requires_photo_on_bad
- requires_measurement
- customer_visible_default
- affects_score

### 6.9 `inspection_results`

Ustanin fiili girisi.

- id
- expertise_case_id
- task_id
- item_id
- status
- severity
- measurement_value
- measurement_min
- measurement_max
- measurement_unit
- device_id
- technician_note
- customer_note_candidate
- recommendation
- is_customer_visible
- created_by
- reviewed_by

Durum kodlari:

- `ok`
- `original`
- `painted`
- `local_painted`
- `changed`
- `damaged`
- `maintenance_required`
- `repair_required`
- `replace_required`
- `not_checked`
- `not_applicable`

Onem dereceleri:

- `critical`
- `important`
- `follow_up`
- `info`

### 6.10 `body_paint_panels`

Kaporta/boya icin parca sozlugu.

Parca gruplari:

- On tampon
- Arka tampon
- Kaput
- Tavan
- Bagaj
- Sol on camurluk
- Sol on kapi
- Sol arka kapi
- Sol arka camurluk
- Sag on camurluk
- Sag on kapi
- Sag arka kapi
- Sag arka camurluk
- On panel
- Arka panel
- Sol on direk
- Sol orta direk
- Sol arka direk
- Sag on direk
- Sag orta direk
- Sag arka direk
- Sol sasi
- Sag sasi
- Podye
- Marspiyel
- Ic direkler
- Alt taban

### 6.11 `body_paint_results`

Kaporta/boya sonuc kaydi.

- expertise_case_id
- panel_id
- paint_status
- micron_min
- micron_max
- micron_avg
- dent_status
- scratch_status
- photo_required
- technician_note
- heavy_repair_suspected
- structural_risk

### 6.12 `measurements`

Cihaz olcumleri.

- expertise_case_id
- measurement_type
- station_id
- device_id
- axis
- left_value
- right_value
- difference_value
- unit
- threshold_min
- threshold_max
- pass_fail
- raw_payload

Olcum tipleri:

- Mikron
- Fren
- El freni
- Suspansiyon
- Yanal kayma
- Dyno guc
- Tork
- Aku
- OBD hata kodu
- Lastik dis derinligi

### 6.13 `obd_scans`

- expertise_case_id
- scan_time
- device_id
- vehicle_protocol
- vin_detected
- km_detected
- system_count
- fault_count
- raw_file_url

### 6.14 `obd_scan_modules`

- obd_scan_id
- module_code
- module_name
- status
- fault_count
- fault_codes
- note

### 6.15 `media_assets`

Fotograf/video/ek dosya.

- id
- expertise_case_id
- station_id
- item_id
- panel_id
- media_type
- url
- thumbnail_url
- angle
- captured_by
- captured_at
- device_id
- required_flag
- quality_status

Fotograf acilari:

- On genel
- Arka genel
- Sol yan
- Sag yan
- Motor bolumu
- Bagaj
- Ic kokpit
- Gosterge km
- Ruhsat/evrak
- Hasar yakin plan
- OBD ekran
- Dyno/fren cihaz ekrani

### 6.16 `report_documents`

Uretilen belge nushalari.

- id
- expertise_case_id
- document_type
- version
- status
- pdf_url
- html_snapshot_url
- qr_token
- published_at
- invalidated_at

Document type:

- `customer_report`
- `dealer_copy`
- `owner_copy`
- `internal_work_order`
- `legal_terms`
- `warranty_certificate`
- `photo_album`

### 6.17 `report_revisions`

Rapor degisiklik gecmisi.

- id
- expertise_case_id
- version_from
- version_to
- changed_by
- change_reason
- changed_fields
- approved_by
- created_at

Kural: Yayina alinmis rapor silinmez. Duzeltme gerekiyorsa yeni versiyon uretilir, eski versiyon arsivlenir.

### 6.18 `report_delivery_events`

- expertise_case_id
- delivered_to_customer_id
- delivery_channel
- delivered_by
- delivered_at
- explanation_done
- customer_signature_status
- whatsapp_sent
- sms_sent
- email_sent
- satisfaction_triggered

### 6.19 `warranty_records`

- expertise_case_id
- warranty_type
- warranty_provider
- warranty_start_at
- warranty_end_at
- km_limit
- coverage_limit_amount
- coverage_scope
- exclusions
- status

### 6.20 `expertise_disputes`

- expertise_case_id
- customer_id
- complaint_id
- subject
- disputed_item_id
- severity
- requested_resolution
- second_check_status
- legal_risk
- status

## 7. Rapor bolum mimarisi

OTOTR musteri raporu asagidaki bolumlerle tasarlanmali.

### 7.1 Kapak

- OTOTR logo ve rapor kimligi.
- Rapor no.
- QR dogrulama.
- Plaka/sasi maskeleme.
- Arac fotografi.
- Sube/bayi bilgisi.
- Rapor tarihi.
- Paket adi.
- Kisa sonuc etiketi.
- Rapor gecerlilik notu.

### 7.2 Hizli karar ozeti

Musterinin ilk bakacagi alan.

- Genel sonuc.
- Kritik bulgu sayisi.
- Onemli takip maddesi sayisi.
- Kaporta/boya ozeti.
- Mekanik ozeti.
- Elektronik/OBD ozeti.
- Garanti/kapsam bilgisi.
- OTOTR tavsiye dili.

Ornek sonuc tipleri:

- Alim kararini engelleyen kritik bulgu yok.
- Pazarlikta dikkate alinmasi gereken bulgular var.
- Detayli servis kontrolu onerilir.
- Yuksek riskli; alim oncesi ikinci kontrol onerilir.

### 7.3 Arac ve is emri bilgileri

- Is emri no.
- Rapor no.
- Plaka.
- Sasi.
- Motor no.
- Marka/model/versiyon.
- Yil.
- Km.
- Yakit.
- Vites.
- Cekis.
- Paket.
- Kabul ve teslim zamani.
- Giris/cikis km.
- Teknisyenler.

### 7.4 Musteri/kabul bilgileri

Musteriye giden PDF'te KVKK sebebiyle maskeleme uygulanir.

- Talep eden.
- Alici.
- Satici/vekil.
- Ruhsat sahibi.
- Yedek anahtar.
- Ruhsat goruldu mu.
- Arac sahibinin beyanlari.
- Sigorta/garanti teklif istegi.
- Odeme ve fatura durumu.

### 7.5 Kaporta/boya raporu

Iki gorunum olmali:

1. Gorsel arac semasi.
2. Parca bazli detay tablo.

Her parca icin:

- Durum.
- Mikron araligi.
- Ezik/cizik/gocuk.
- Degisim/boya/lokal boya.
- Fotograf.
- Usta notu.
- Musteri notu.
- Yapisal risk.

### 7.6 Sasi, direk, podye ve agir islem yorumu

Bu bolum musteri ve hukuk icin ayrica kritik.

- On/arka sasi.
- Direkler.
- Podyeler.
- Ic direkler.
- Alt taban.
- Agir islem suphe durumu.
- Ikinci usta kontrolu.
- Kanit fotografi zorunlulugu.

### 7.7 Mekanik ve motor

- Motor yag seviyesi.
- Motor sesli calisma.
- Yag/su kacagi.
- Turbo.
- Enjektor.
- Sogutma sistemi.
- Kayis/zincir.
- Motor kulaklari.
- Egzoz.
- Yol testi notu.

### 7.8 Sanziman ve aktarma

- Vites gecisleri.
- Kavrama.
- Sanziman yag kacagi.
- Diferansiyel.
- Aks/kardan.
- Debriyaj.
- 4x4/cekis sistemi.

### 7.9 Alt takim ve yurur aksam

- Amortisor.
- Helezon.
- Salincak.
- Rot/rotil.
- Tabla.
- Aks kafasi.
- Direksiyon kutusu.
- Burclar.
- Alt koruma.

### 7.10 Fren, suspansiyon, yanal kayma

- Fren sol/sag degerleri.
- Fren fark yuzdesi.
- El freni.
- Suspansiyon olcumleri.
- Yanal kayma.
- Test limitleri.
- Gecme/kalma sonucu.

### 7.11 Elektrik, elektronik ve OBD

- Aku.
- Farlar.
- Stoplar.
- Silecek.
- Klima.
- Cam/ayna.
- Multimedya.
- Airbag.
- ABS/ESP.
- OBD modul listesi.
- Ariza kodlari.
- Silinmis/gecmis hata ayrimi.

### 7.12 Ic mekan ve donanim

- Koltuklar.
- Doseme.
- Tavan.
- Emniyet kemerleri.
- Gosterge.
- Kumandalar.
- Donanim listesi.
- Eksik/hasarli aksesuarlar.

### 7.13 Lastik, jant ve dis ekipman

- Lastik marka/model.
- Uretim tarihi.
- Dis derinligi.
- Jant hasari.
- Stepne/tamir kiti.
- Bijon/kriko.

### 7.14 Fotograf ve kanit albumu

- Zorunlu fotograflar.
- Hasar fotograflari.
- Cihaz ekranlari.
- Evrak/ruhsat kontrol kaniti.
- Teslim fotografi.

### 7.15 Hukuki kapsam ve garanti

Dinamik olmalidir.

- Paket kapsami.
- Yapilamayan testler.
- Garanti varsa kosullari.
- Garanti yoksa net ifade.
- Sorumluluk sinirlari.
- Km/tarih gecerliligi.
- Satis sonrasi gecerlilik.
- QR dogrulama ve rapor versiyonu.

## 8. Tablet veri girisi icin basliklar

Tablet uygulamasini ayrica tasarlayacagiz; ancak veri basliklari simdiden sabitlenmeli.

### 8.1 Tablet ana ekran

- Bugunku isler.
- Aktif arac.
- Paket kapsam ikonlari.
- Eksik istasyonlar.
- Kritik bulgular.
- Onay bekleyen raporlar.
- Offline senkron durumu.

### 8.2 Arac kabul formu

- Plaka/sasi okuma.
- Musteri dogrulama.
- Paket secimi.
- Km fotografi.
- Yakit seviyesi.
- Yedek anahtar.
- Ruhsat.
- Hasar beyanlari.
- Imza/riza.
- Teslim alindi fotografi.

### 8.3 Usta kontrol ekrani

Her kontrol maddesi ayni formatta olmali:

- Madde adi.
- Durum secimi.
- Onem secimi.
- Olcum varsa deger.
- Fotograf ekle.
- Usta notu.
- Musteriye goster/gizle.
- Test yapilamadi nedeni.
- Ikinci kontrol iste.

### 8.4 Rapor yazim ekrani

- Otomatik olusan musteri ozeti.
- Kritik bulgular.
- Onemli bulgular.
- Takip/bakim onerileri.
- Usta notlarindan secilecek cumleler.
- Rapor dili kontrolu.
- Hukuki risk uyarisi.
- Onaya gonder.

## 9. Kalite ve risk kurallari

Sistem rapor yayinlamadan once su kurallari calistirmali:

- Kritik bulgu fotografi yoksa rapor yayinlanamaz.
- Agir islem supheli ise ikinci usta onayi gerekir.
- Sasi/direk/podye alanlari bos birakilamaz.
- Paket kapsami disi test musteri raporunda acikca belirtilir.
- OBD yapilmadiysa nedeni zorunludur.
- Dyno yapilmadiysa teknik gerekce zorunludur.
- Giris km fotografi yoksa rapor kalite skoru duser.
- Serbest metinde riskli kelime varsa mudur onayi gerekir.
- Yayina alinmis rapor degistirilecekse revizyon nedeni zorunludur.

## 10. Modul etkileri

### 10.1 CRM

Ekspertiz kaydi CRM'e su verileri verir:

- Musteri arac gecmisi.
- Paket tercihi.
- Memnuniyet riski.
- Rapor teslim aramasi.
- Tekrar ekspertiz firsati.
- Galeri/kurumsal musteri hacmi.

### 10.2 Bayi paneli

- Gunluk arac adedi.
- Rapor gecikmesi.
- Eksik fotograf/olcum.
- Usta verimliligi.
- Ciro ve paket dagilimi.
- Sikayet riski.

### 10.3 Kalite

- Rapor kalite skoru.
- Usta bazli hata.
- Sube bazli eksik kanit.
- Ikinci kontrol orani.
- Itiraz/sikayet kok nedeni.

### 10.4 Finans

- Paket geliri.
- Ek hizmet geliri.
- Garanti/servis/teklif geliri.
- Bayi ciro ve royalty.
- Iade/tazmin/itiraz maliyeti.

### 10.5 Hukuk

- Riza metni.
- Imza kaniti.
- Rapor versiyonu.
- Rapor teslim kanali.
- Itiraz edilen madde.
- Garanti kapsami.
- Sorumluluk siniri.

### 10.6 Academy

- Hangi usta hangi konuda hata yapiyor.
- Rapor dili eksigi.
- Kaporta/mekanik/OBD egitim ihtiyaci.
- Sube muduru onay kalitesi.

### 10.7 AI karar destek

- Sikayet olasiligi.
- Agir islem suphe modeli.
- Fiyat pazarlik etkisi.
- Rapor kalite tahmini.
- Musteriye anlatim cumlesi onerisi.

## 11. OTOTR tasarim dili

Raporun bize yakisan hali:

- Premium ama sade.
- Teknik olarak guven veren.
- Musteri icin okunabilir.
- Bayi icin operasyonel.
- Hukuk icin savunulabilir.
- Genel merkez icin olculebilir.

Gorsel tasarim ilkeleri:

- Kapakta arac fotografi, rapor no ve QR dogrulama net gorunmeli.
- Ilk sayfada uzun tablo degil, karar ozeti olmali.
- Teknik detaylar bolum bolum ilerlemeli.
- Kritik bulgular renk ve onem seviyesiyle ayrilmali.
- Kaporta/boya icin arac semasi kullanilmali.
- Hukuki metin raporun sonuna alinmali, ancak kapsam/garanti ozeti basta gorunmeli.
- Musteri PDF'i ile ic operasyon nushasi ayrilmali.

## 12. MVP kapsam onerisi

Ilk gercek surum icin en dogru kapsam:

1. `expertise_case` ana kaydi.
2. Musteri kabul formu.
3. Paket ve odeme kaydi.
4. Kaporta/boya parca bazli giris.
5. Mekanik temel kontrol.
6. OBD manuel/cihaz sonucu girisi.
7. Fotograf kanitlari.
8. Rapor taslak ve mudur onayi.
9. Musteri PDF/HTML rapor.
10. QR dogrulama.
11. Rapor teslim kaydi.
12. Sikayet/itiraz baglantisi.

MVP sonrasi:

- Cihaz entegrasyonlari.
- Otomatik katalog/donanim verisi.
- AI rapor dili onerisi.
- Garanti motoru.
- Ikinci el degerleme.
- Mobil musteri rapor arsivi.

## 13. Bir sonraki uygulama adimi

Bu dokumandan sonra yapilacak en dogru siralama:

1. `docs/data-model.md` icine ekspertiz tablolarini ana model olarak islemek.
2. Demo veriye `expertiseCases`, `inspectionItems`, `inspectionResults`, `mediaAssets` eklemek.
3. Bayi Paneli ekranini bu veriyle beslemek.
4. Rapor Yazimi ekranini statik formdan gercek veri modeline baglamak.
5. Tablet uygulamasi icin ayri ekran akisi tasarlamak.
