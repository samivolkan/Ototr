# OTOTR Franchise Departman UAT ve Onay Paketi

Durum: **NO_GO — yalnızca sentetik veri**  
Sürüm: 2026-11-05  
Kapsam: Başvurudan aktif şubeye, 30/60/90 gün takibi dahil.

## UAT yürütme kuralı

Her senaryo staging ortamında iki kullanıcıyla çalıştırılır. Uygulayan ve onaylayan aynı kişi olamaz. Kanıt bağlantısı, sonuç özeti, hata kaydı ve SHA-256 kanıt özeti olmadan senaryo `PASS` sayılamaz. Gerçek aday, personel, telefon, e-posta, TCKN veya finans belgesi kullanılmaz.

## Ortak uçtan uca senaryolar

| ID | Senaryo | Beklenen sonuç | Sahip | İkinci onay |
|---|---|---|---|---|
| UAT-01 | Altı kanaldan sentetik başvuru | Tekil aday ve franchise dosyası, üç ayrı izin makbuzu | Franchise | KVKK |
| UAT-02 | Skorlama ve kurul kararı | Eşik öneri üretir; kurul kararı denetim izine yazılır | Franchise | CEO/Yönetim |
| UAT-03 | Eksik kritik kapıyla ilerleme | Aşama değişimi reddedilir; çift onaylı istisna kritik olmayan kapıda çalışır | Franchise | İlgili departman |
| UAT-04 | Hukuk ve e-imza hazırlığı | Onaylı şablon/sürüm/izin olmadan talep oluşmaz; gerçek imza gönderilmez | Hukuk | Franchise |
| UAT-05 | %100 tahsilat kapısı | %99’da aktivasyon reddedilir; %100 ve mutabakatla geçer | Finans | Muhasebe |
| UAT-06 | Lokasyon ve mimari | Konum, fotoğraf, ölçüm, denetçi ve teslim tutanağı eksikse kapı kapanmaz | Operasyon | Mimari/Proje |
| UAT-07 | On zorunlu kadro | Eksik işe alım/özlük/sözleşme aktivasyonu engeller | İK | Franchise |
| UAT-08 | Academy ve kullanıcı yetkisi | Süresi geçerli rol sertifikası olmadan hesap açılmaz | Academy | BT |
| UAT-09 | Atomik aktif şube | Tek şube, 10 kapsamlı hesap, 36 açılış işi ve 3 takip görevi oluşur | BT | Operasyon |
| UAT-10 | Tekrar aktivasyon ve outbox | Aynı işlem ikinci kez kayıt üretmez; retry/dead-letter izlenir | BT | Bilgi Güvenliği |
| UAT-11 | Şube izolasyonu | Yetkisiz kullanıcı başka şube/dosya/veri/belgeyi göremez | Bilgi Güvenliği | KVKK |
| UAT-12 | 30/60/90 takip | Görevler doğru sahip, SLA ve kanıt şartıyla açılır | Operasyon | Kalite |

## Departman imzaları

| Departman | UAT sahibi | Zorunlu kanıt | Karar | Kimlik SHA-256 | Tarih (UTC) |
|---|---|---|---|---|---|
| Franchise | Franchise Yönetimi | UAT-01..03 | BEKLİYOR | — | — |
| Finans / Muhasebe | Finans Direktörü | UAT-05 | BEKLİYOR | — | — |
| Hukuk / KVKK | Hukuk Yöneticisi | UAT-04, UAT-11 | BEKLİYOR | — | — |
| İK | İK Yöneticisi | UAT-07 | BEKLİYOR | — | — |
| Academy | Academy Yöneticisi | UAT-08 | BEKLİYOR | — | — |
| Operasyon / Kalite / İSG | Operasyon Direktörü | UAT-06, UAT-12 | BEKLİYOR | — | — |
| Tedarik / Mimari / Pazarlama | Proje Yöneticisi | İlgili 36 görev | BEKLİYOR | — | — |
| BT / Bilgi Güvenliği | ERP Teknik Lideri | UAT-09..11 | BEKLİYOR | — | — |
| CEO/Yönetim | CEO veya vekili | Tüm imzalar sonrası nihai karar | BEKLİYOR | — | — |

## Canlıya geçiş kararı

Tüm satırlar `PASS`, tüm kanıt özetleri dolu, staging geri dönüş tatbikatı başarılı ve yayın commit'i sabitlenmiş değilse karar değişmez: **NO_GO**.
