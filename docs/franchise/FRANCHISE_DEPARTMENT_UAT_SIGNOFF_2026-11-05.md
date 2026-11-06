# OTOTR Franchise Departman UAT ve Onay Paketi

Durum: **NO_GO — yalnızca sentetik veri**  

## Teknik UAT kanıt bütünlüğü

- `20261105310000_franchise_uat_evidence_immutability.sql` staging projesine uygulandı.
- UAT inceleyicisi onay/red sırasında release adayı, senaryo, revizyon, çalıştıran kişi/rol, kanıt SHA-256’i, sonuç özeti veya gönderim zamanını değiştiremez.
- Yalnız `submitted` sonuç bir kez incelenebilir; bağımsız checker ve 10-2000 karakter inceleme notu zorunludur.
- Hosted negatif testte kanıt değiştirme ve ikinci inceleme reddedildi; değişmez kanıtla bağımsız onay kabul edildi. Rollback sonrasında sentetik Auth ve UAT sonucu sayıları `0` kaldı.
- Teknik kanıt `gm-franchise/uat-immutability-hosted-evidence.json` içindedir. Bu teknik geçiş, aşağıdaki gerçek departman UAT’ları ve insan imzaları yerine geçmez.
- `20261105340000_franchise_uat_command_boundary.sql` staging projesine uygulandı. `authenticated` rolünün sonuç ve imza tablolarına doğrudan yazması kapatıldı; gönderim, inceleme ve imza yalnız kullanıcı/rolü JWT’den sunucuda bağlayan komut RPC’leriyle yapılır.
- Hosted komut kabulünde öz onay ve çalıştıranın kendi senaryosuna departman imzası reddedildi; bağımsız inceleme ve bağımsız İK imzası kabul edildi. Teknik kanıt `gm-franchise/uat-command-hosted-evidence.json` içindedir.
Sürüm: 2026-11-05  
Kapsam: Başvurudan aktif şubeye, 30/60/90 gün takibi dahil.

## UAT yürütme kuralı

Her senaryo staging ortamında iki kullanıcıyla çalıştırılır. Uygulayan ve onaylayan aynı kişi olamaz. Kanıt bağlantısı, sonuç özeti, hata kaydı ve SHA-256 kanıt özeti olmadan senaryo `PASS` sayılamaz. Gerçek aday, personel, telefon, e-posta, TCKN veya finans belgesi kullanılmaz.

ERP’de `Franchise Yönetim Merkezi → Sistem → Yayın hazırlığı → Hosted UAT çalışma alanı` açılır. Release adayı tüm departmanlar için aynı girilir. Senaryo sahibi kanıtın SHA-256 özetini ve 20-2000 karakter sonuç özetini gönderir; reviewer rolündeki farklı kullanıcı 10-2000 karakter inceleme notuyla onaylar veya reddeder. Departman imzası yalnız katalogdaki zorunlu senaryolar bağımsız onaylandıktan sonra açılır. Genel Müdür imzası diğer sekiz onaydan önce sunucu tarafından reddedilir.

## Ortak uçtan uca senaryolar

| ID | Senaryo | Beklenen sonuç | Sahip | İkinci onay |
|---|---|---|---|---|
| UAT-01 | Altı kanaldan sentetik başvuru | Tekil aday ve franchise dosyası, üç ayrı izin makbuzu | Franchise | KVKK |
| UAT-02 | Skorlama ve kurul kararı | Eşik öneri üretir; kurul kararı denetim izine yazılır | Franchise | Genel Müdür |
| UAT-03 | Eksik kritik kapıyla ilerleme | Aşama değişimi reddedilir; çift onaylı istisna kritik olmayan kapıda çalışır | Franchise | İlgili departman |
| UAT-04 | Hukuk ve e-imza hazırlığı | Onaylı şablon/sürüm/izin olmadan talep oluşmaz; gerçek imza gönderilmez | Hukuk | Franchise |
| UAT-05 | %100 tahsilat kapısı | %99’da aktivasyon reddedilir; %100 ve mutabakatla geçer | Finans | Muhasebe |
| UAT-06 | Lokasyon ve mimari | Konum, fotoğraf, ölçüm, denetçi ve teslim tutanağı eksikse kapı kapanmaz | Operasyon | Mimari/Proje |
| UAT-07 | On zorunlu kadro | Eksik işe alım/özlük/sözleşme aktivasyonu engeller | İK | Franchise |
| UAT-08 | Academy ve kullanıcı yetkisi | Süresi geçerli rol sertifikası olmadan hesap açılmaz | Academy | BT |
| UAT-09 | Atomik aktif şube | Tek şube, 10 kapsamlı hesap, 39 departman açılış görevi ve 3 takip görevi doğrulanır | BT | Operasyon |
| UAT-10 | Tekrar aktivasyon ve outbox | Aynı işlem ikinci kez kayıt üretmez; retry/dead-letter izlenir | BT | Bilgi Güvenliği |
| UAT-11 | Şube izolasyonu | Yetkisiz kullanıcı başka şube/dosya/veri/belgeyi göremez | Bilgi Güvenliği | KVKK |
| UAT-12 | 30/60/90 takip | Görevler doğru sahip, SLA ve kanıt şartıyla açılır | Operasyon | Kalite |
| UAT-13 | Finansal koşul ve royalty | Taksit toplamı, %99/%100 kapısı, KDV dahil matrah ve 0/6/12 ay muafiyet doğrulanır | Finans | Muhasebe |
| UAT-14 | Hukuk, bölge ve saha | Due diligence, imza, poligon/ilçe/yarıçap ve zorunlu saha kanıtları birlikte doğrulanır | Hukuk | Mimari/Operasyon |
| UAT-15 | Açılış uygulama teslimatları | Mimari, tedarik, kalibrasyon, İSG, kalite, pazarlama, BT, deneme ve kurul kapıları tamamlanır | Franchise | Genel Müdür |
| UAT-16 | Dış portallar ve bayi kapsamı | Aday/bayi/denetçi/tedarikçi yalnız atanmış işi görür; iptal edilen hesabın JWT şube kapsamı kaldırılır | BT | Bilgi Güvenliği |

## Departman imzaları

| Departman | UAT sahibi | Zorunlu kanıt | Karar | Kimlik SHA-256 | Tarih (UTC) |
|---|---|---|---|---|---|
| Franchise Sorumlusu | Franchise Sorumlusu | UAT-01..03, UAT-15 | BEKLİYOR | — | — |
| Finans Sorumlusu | Finans Sorumlusu | UAT-05, UAT-13 | BEKLİYOR | — | — |
| Hukuk/KVKK | Hukuk/KVKK Sorumlusu | UAT-04, UAT-11, UAT-14 | BEKLİYOR | — | — |
| İK Sorumlusu | İK Sorumlusu | UAT-07 | BEKLİYOR | — | — |
| Academy Sorumlusu | Academy Sorumlusu | UAT-08 | BEKLİYOR | — | — |
| Operasyon/Kalite/İSG | Operasyon/Kalite/İSG Sorumlusu | UAT-06, UAT-12, UAT-14..15 | BEKLİYOR | — | — |
| Tedarik/Mimari/Pazarlama | Tedarik/Mimari/Pazarlama Sorumlusu | UAT-06, UAT-15 | BEKLİYOR | — | — |
| ERP/Bilgi Güvenliği | ERP/Bilgi Güvenliği Sorumlusu | UAT-09..11, UAT-16 | BEKLİYOR | — | — |
| Genel Müdür | Genel Müdür veya yetkili vekili | Tüm imzalar sonrası nihai karar | BEKLİYOR | — | — |

## Canlıya geçiş kararı

Tüm 16 senaryo `PASS`, dokuz imza birbirinden bağımsız, tüm kanıt özetleri dolu, hosted staging geri dönüş tatbikatı başarılı ve yayın commit'i sabitlenmiş değilse karar değişmez: **NO_GO**. Karar `node gm-franchise/release-readiness.mjs` ile yeniden hesaplanır; belge veya JSON üzerindeki elle yazılmış `GO` etiketi yetkili değildir.
