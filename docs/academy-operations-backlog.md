# OTOTR Academy Operasyon Motoru Backlogu

Bu dokuman, Academy icerik uretiminden bagimsiz olarak sistem tarafinda tamamlanacak ana isleri tanimlar.

Modul ders metinleri ChatGPT ile daha sonra uretilecek. Bu backlog'un amaci egitimlerin atanmasi, tamamlanmasi, sinavlanmasi, sertifikaya donusmesi, yetki kilidine baglanmasi ve kalite/sikayet akislarindan yeniden egitim uretilmesidir.

## 1. Ana Kalan Isler

| Oncelik | Is | Amac | Sistem etkisi |
|---:|---|---|---|
| 1 | Egitim tamamlama ve sinav sonucu isleme | Personel egitimi tamamladi, sinavdan gecti/kaldi, tekrar egitim veya sertifika aldi durumlarini kaydetmek | `assignment`, `completion`, `exam_result`, `certificate` kayitlari ayrisir |
| 2 | Zorunlu egitim kilidi | Zorunlu egitim bitmeden personelin tam aktif veya kritik yetki almasini engellemek | CRM, rapor kilidi, musteri verisi, sube aksiyon kapatma gibi yetkiler Academy durumuna baglanir |
| 3 | Sertifika yenileme takvimi | Suresi dolacak sertifikalar, yenileme tarihi ve gecikme alarmini takip etmek | Yaklasan yenileme, geciken yenileme ve yetki dusumu alarmlari olusur |
| 4 | Kalite/sikayet kaynakli yeniden egitim | Kalite bulgusu veya musteri sikayeti kok nedeni egitim acigina baglaniyorsa otomatik egitim onermek/atamak | Kalite, sikayet, CAPA ve Academy yeniden egitim akisina baglanir |
| 5 | Academy raporlama | Rol, sube, bolge, egitim, egitmen, sertifika ve gecikme bazli net raporlar olusturmak | Merkez, bolge muduru ve sube muduru farkli kirilimlarda egitim sagligini gorur |
| 6 | Personel tarafi gorunumu | Sube muduru, teknisyen, musteri kabul gibi rollerin sadece kendine atanan egitimleri gormesi | Rol bazli Academy ekrani ve kisiye ozel egitim inbox'i olusur |
| 7 | Canli veri gecis modeli | Backend geldiginde course, assignment, exam, certificate ve completion tablolarini netlestirmek | Prototip verisi gercek veritabani modeline sorunsuz tasinir |
| 8 | Icerik deposu ve manifest | ChatGPT'den gelecek detayli modul iceriklerini dosya ve durum bazinda takip etmek | Hangi egitimin tam icerigi geldi, revizyonda veya yayina hazir gorunur |

## 2. Bizim Onceki Plana Eklenen Net Basliklar

Bu listeden alinmasi gereken yeni/eksik kalan noktalar:

- Egitim tamamlama ve sinav sonucunu islemek sadece "egitim atama"dan ayri ele alinmali.
- Sertifika sadece statik bilgi degil; tarih, yenileme, gecikme ve yetki dusumu uretmeli.
- Personel kendi Academy inbox'ini gormeli; herkes tum katalogu ayni sekilde gormemeli.
- Kalite ve sikayet ekranlarindan Academy yeniden egitim onerisi uremeli.
- Backend veri modeli simdiden course/assignment/exam/certificate/completion olarak ayrilmali.

## 3. Operasyon Motoru Veri Modeli Taslagi

Backend asamasinda Academy icin ayrilmasi gereken cekirdek tablolar:

| Tablo | Ne tutar | Kritik alanlar |
|---|---|---|
| `academy_courses` | Egitim katalog kaydi | code, title, level, required_roles, status, version |
| `academy_course_contents` | Detayli modul icerigi dosya/kayit baglantisi | course_code, content_file, content_status, version, updated_at |
| `academy_assignments` | Kisiye/role/subeye atanan egitim | course_id, user_id, branch_id, assigned_by, due_date, status |
| `academy_completions` | Egitim tamamlama kaydi | assignment_id, completed_at, completion_source, proof_url |
| `academy_exam_results` | Sinav sonucu | assignment_id, score, passed, attempt_no, answered_at |
| `academy_certificates` | Sertifika ve yenileme durumu | user_id, course_id, certificate_no, issued_at, expires_at, renewal_status |
| `academy_locks` | Yetki kilidi ve acilma kosulu | user_id, role, permission_key, required_course_id, lock_status |
| `academy_retraining_events` | Kalite/sikayet kaynakli yeniden egitim | source_type, source_id, root_cause, course_id, user_id, status |

## 4. Uygulama Sirasi

1. Academy atama kaydina `Planlandi / Devam Ediyor / Tamamlandi / Kaldi / Sertifika Verildi / Gecikti` durumlari eklenir.
2. Egitim detayindan veya kisi listesinden `Tamamlandi`, `Sinav sonucu gir`, `Sertifika ver` aksiyonlari acilir.
3. Zorunlu egitim kilidi, personel/rol/yetki gorunumunde net badge ve engelleyici kural olarak gosterilir.
4. Sertifika yenileme takvimi ve yaklasan/geciken alarm kutusu Academy kokpitine eklenir.
5. Sikayet ve kalite ekranlarindan Academy yeniden egitim onerisi/atamasi uretilir.
6. Rol bazli personel Academy gorunumu eklenir: kisi sadece kendi egitim inbox'ini, mudur kendi subesini, bolge muduru kendi bolgesini gorur.
7. Raporlama ekraninda rol, sube, bolge, egitim, egitmen, sertifika ve gecikme filtreleri netlestirilir.
8. ChatGPT'den gelecek detayli modul icerikleri icin `docs/academy/course-content/` ve manifest yapisi eklenir.

## 5. Ilk Yapilacak Is

Bir sonraki uygulama icin en dogru baslangic:

**Egitim tamamlama / sinav sonucu / sertifika verme akisini eklemek.**

Bu is tamamlaninca Academy artik sadece egitim atayan degil, egitim sonucunu ve yetki etkisini takip eden sisteme donusur.

