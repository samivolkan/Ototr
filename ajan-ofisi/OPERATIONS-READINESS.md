# OTOTR operasyon hazırlığı

Hazırlık tarihi: 24.11.2026, Türkiye saati. Bu dosya yayında sürekli çalışan ajan kanıtı değildir.

## Bu teslimin gerçek kapsamı

- Operasyon Kontrol Merkezi, mevcut yönetici oturumuyla üç kaynağı okur: Franchise/Finans devir özeti, Nilüfer yorum yanıt özeti, yöneticiye ait kurgusal aday kayıtları.
- Salt okunur kontrol, görünür sekmede dakikada birdir. Sekme kapalıyken bu merkez çalışmaz. Kaynakların kendi servisleri ayrı değerlendirilir.
- Tüm modüllerin görev tanımı ve bu merkezdeki bağlantı eksiği görünürdür. Bir bağlantı hatası, sıfır iş diye raporlanmaz.
- Ortak iş durum sözleşmesi otomatik testlidir; veritabanına veya çalışan görev sistemine bağlanmış bir yetki servisi değildir. Çağıran uygulama kimliği/yetkiyi sunucuda doğrulamak zorundadır. Testteki actor alanı kimlik doğrulaması yerine geçmez.
- Genel Sami karar kuyruğu, kişi bazlı görevler ve süre kullanımı ortak canlı kaynağa bağlı değildir. Kapasite bilinmiyorsa yeni gerçek karar rezervasyonu yapılmamalıdır.

## Kaynak kanıtı ve bağlantı açıkları

| Alan | Okunan kod / mevcut sözleşme | Doğrulanacak eksik |
|---|---|---|
| Franchise | `franchise-desk-model.mjs`, `franchise-specialist.mjs` | Gerçek olay bazlı görev kabulü ve yöneticiden Sami'ye atama |
| Finans | Franchise özeti içindeki finance_pending / finance_failed / finance_processed | Muhasebenin bütünü, mali kabul ve tahsilat kanıtı; processed tahsilat değildir |
| Yorum | `review-office-live.js`: office_review_status | Bu merkez yalnız Nilüfer toplulaştırılmış durumu okur; tüm şube kapsamı yok |
| SEO | `team/SEO/state.json`: ayrı raporlama yapılandırması | Bu merkezden servis sağlığı ve son çalışmanın kanıtı okunmuyor |
| İK / Saha Satış / Şikâyet | `management-data.mjs`: mevcut uzman kapsamları | Şube/kişi ataması, vardiya, izin, görev kabulü ve tamamlanma olayları |
| Ekspertiz | `inspection-coordinator.html`: yedi aşamalı görev planı | İş emri kimliği, sorgu sağlayıcısı, onaylı rapor sürümü, baskı/sunum/teslim kaydı |
| Yazılım / Sosyal | `management-data.mjs`: önerilen roller | İzole kod alanı, yayın/onay sözleşmesi ve gerçek yürütücü |

Kaynak dosyasının bulunması canlı entegrasyon veya tamamlanmış iş kanıtı değildir.

## Çalışma ilkeleri

1. Bir görev için tek iş sahibi, şube kapsamı, kaynak ve sürüm bulunur. Her olay tekil kimlik taşır.
2. Atandı, kabul edildi, başladı, teslim edildi, denetlendi ve kapandı birbirinden ayrıdır.
3. Engel kaydı neden, insan sorumlu, çözüm için gereken bilgi ve kanıt içerir. Belge yoksa model tahmin etmez.
4. Önce ilgili yönetici çözüm arar. Sami'ye yalnız politika/para/yetki kararı veya yöneticinin çözemediği engel çıkar; tek soru paketinde seçenek ve etki bulunur.
5. Süre hedefleri işletmece onaylanmadan gecikme/performans hükmü verilmez. Vardiya, izin, sistem ve müşteri beklemesi ayrılır.
6. Kaynak güncellenmediğinde eski sonuç güncel gibi gösterilmez. Tekil sorun kimliği tekrarlanan alarmı birleştirir.
7. Model kullanımı yalnız gerekçeli özet ve belirsizlik analizi içindir. Sayım, eşik, zorunlu alan, tekrar kontrolü ve izin kontrolü kurallıdır. Model kullanımına maliyet limiti ve iz kaydı gerekir.
8. Gerçek müşteri/personel verisi, dış mesaj, mali işlem, rapor değişikliği ve ajan kural değişikliği bu teslimde açılmaz.

## Uygulama sırası

1. Bu merkezde üç okuma kaynağını canlı doğrula; hata ve eski veri testlerini geçir.
2. Tek sentetik iş emrini ortak iş sözleşmesine bağla; paralel usta/sorgu, yanlış sıra, tekrar, iptal, geri dönüş ve teslim kanıtını test et.
3. İnsan sorumluları ve yetkili olay kaynağını doğrula. Şube sınırı ve erişim denetimi sunucuda uygulanmadan gerçek görev bağlantısı açılmaz.
4. Merkezi kalıcı engel ve karar kaydını ekle: atama, alıcı kabulü, bağımsız inceleme, 10 karar rezervasyonu ve günlük/haftalık bütçe işlemsel korunmalı.
5. Salt okunur tek şube pilotu: başlangıç ölçümü, yanlış alarm oranı, kaçırılan engel ve insan düzeltmesi ölçülür. Otomatik mali veya personel kararı yok.
6. Servis hesabı, izleme, güvenli yeniden deneme, çalışma saatleri ve hata sorumlusu doğrulandıktan sonra sürekli yürütücü. UI'daki polling sürekli yürütücü yerine sunulmaz.
7. İnsan onaylı mesaj pilotu; ardından ayrı onaylı zaman ve tekrar politikası. Anket puanına göre Google yorum linki filtrelenmez.

## Sabah teslim kontrolü

- Kaynak sağlık durumu ve kapsamı; gerçek/demolar ayrı.
- Gerçek kanıtla biten işler; eksik kanıtlı işler ayrı.
- Yönetici engelleri, Sami kararı gerekenler, kapsam dışı/gönderilmemiş bildirimler.
- Test sonuçları, commit/yayın kimliği ve doğrulanan bağlantılar.
- Sürekli çalışan servis yoksa açıkça belirtilir; başarı uydurulmaz.
