# TASK2 sorumluluk devri

Durum: Migrationlar uygulandı; istemci ekranı, ofis özeti ve sentetik testler hazır. Canlı ekran doğrulaması yayın sonrası yapılacak. Gerçek çalışan adına devir yapılmadı.

## İşleyiş

1. Güncel görevi kabul etmiş sorumlu, aynı ERP çalışma alanındaki aktif ve yazma yetkili alıcıyı seçer; kabul koşulunu yazar.
2. Tek bekleyen devir kaydı açılır. Görev sahibi değişmez.
3. Yalnız belirtilen alıcı kabul veya gerekçeli ret verebilir. Gönderen veya yönetici gerekçeyle iptal edebilir.
4. Kabulde görev sahibi ve yeni sahibin görev kabul kaydı aynı veritabanı işlemi içinde değişir. Bir adım başarısızsa tamamı geri alınır.
5. Yeni sorumlu mevcut kanıt teslimi, bağımsız inceleme ve yönetici kapanışı akışını kullanır.

Para, ekspertiz raporu veya müşteri iletişimi yetkisi verilmez. Şubeler arası devir açılmaz. Aynı merkez çalışma alanındaki kişiler arasında devir mümkündür; gerçek departman/yönetici eşlemesi ayrıca doğrulanmalıdır.

## Güncellik ve geçmiş

- Görev içeriği veya sahibi değişirse eski bekleyen devir kabul edilemez. Yeni kaynak kabulü gerekir.
- Kapalı, arşivlenmiş veya incelemedeki görev devredilemez.
- Kaynak çalışma alanı kilidi ve devir sürümü eşzamanlı istekleri sıralar.
- Aynı istek kimliği aynı işlem için tekrar kullanılabilir; farklı içerik reddedilir. Başarılı kabulün tekrarında yeni kaynak sürümü doğrulanır.
- Ret, iptal ve önceki devir olayları özel geçmiş tablosunda korunur. İstemcinin doğrudan tablo erişimi yoktur.
- Mevcut görev düzenleyicisindeki doğrudan atama yolu kaldırılmadı. Böyle bir değişiklik devir kaydını güncelliğini kaybetmiş hale getirir; devir protokolüne uyulduğu iddia edilmez.

## Kanıt

`tests/task2-handoff-sql.test.mjs` gerçek migration SQL'ini izole PGlite üzerinde sentetik hesaplarla çalıştırır. Yetki/şube sınırı, aktiflik, izleyici rolü, yanlış alıcı, eski sürüm, tekrar istek, gerekçeli ret/iptal, görev kapsamı değişikliği, kapalı görev ve özel tablo erişimi denetlenir. Kabul kaydı eklenirken yapay hata verilerek sahiplik değişikliğinin geri alındığı doğrulanır. Kabul edilen devirden sonra yeni sahibin teslimi, bağımsız yönetici incelemesi ve kapanışı da mevcut teslim migration'ıyla birlikte çalıştırılır.

## Entegrasyon ve kalan doğrulamalar

- Hazır: Görev detayında alıcı seçimi, kabul koşulu ve açık kabul/ret/iptal kontrolleri.
- Test edildi: Kaydedilmemiş yerel değişiklikler ve eski ekran sürümünde işlem engeli; ağ tekrarlarında sabit istek kimliği.
- Hazır: Ofiste bekleyen ve güncelliğini kaybetmiş devir sayıları; rutin takip yöneticiye, karar gerektiren engeller koordinatöre.
- İstemci testleri geçti; migrationlar uygulandı. Masaüstü/mobil görsel doğrulama ve canlı salt-okunur kontrol yayın sonrasında yapılacak.
- Gerçek departman/yönetici eşlemesi ve ortak Sami karar kuyruğu hâlâ ayrı, tamamlanmamış işlerdir.
