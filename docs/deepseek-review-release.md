# DeepSeek yorum ekranı — 15 Kasım 2026

Tasarım kaynağı kullanıcının `deepseek_html_20261115_f77c97 (1).html` dosyasıdır. Ana CSS birebir korunmuştur (SHA256: `ba5ce16db609b56829e8b2ac52a930ad1af34cb8ce30509388edeee3719b0e18`). Ayrı `erp-fit` bloğu yalnız dar ekran taşmasını ve entegrasyon açıklamasını düzeltir. Önceki yönetim ekranının HTML/CSS bileşenleri kaldırılmıştır; ERP kabuğu ve veri servisleri devam eder.

Yayın hedefi GitHub Pages `samivolkan/Ototr`, `#google-reviews`. Oto-tr.com ayar ekranı referanstır; oradaki gizli anahtarlar kopyalanmamıştır. O alan adına ait OAuth dönüş URL'si GitHub Pages'e taşınamaz; mevcut çalışan Supabase Google bağlantısı korunur. OpenAI mevcut sunucu servisi üzerinden kullanılır; anahtar veya model yapılandırması istemciye yazılmaz.

## Canlı ve demo kapsamı

- Bursa Nilüfer: ERP yorumları, kayıtlı Google yanıtları, sürümlü taslak düzenleme/kaydetme, OpenAI taslak üretimi/yenileme, açık onayla yayın, belirsiz yayın sonucunu doğrulama, kalıcı hukuk/şikayet/şube sevki.
- Gebze ve İnegöl: açıkça etiketli demo; canlı gönderim ve senkronizasyon yok.
- Canlı taslaklar bu HTML'nin demo localStorage alanına yazılmaz. Taslak düzenlenirken arka plan yenilemesi bekler; hatada yazılan metin korunur.
- Zaman aşımının insan onayı yerine geçtiği istemci yayın yolu kaldırılmıştır. Mevcut veritabanında otomatik yanıt politikası kapalıdır. Gönderim yalnız güncel sürüm ve görülen metinle açık onay üzerinden ilerler.
- Rol seçici demo yetki vermez; canlı işlemlerde mevcut sunucu yetkilendirmesi belirleyicidir.
- Ek analizler, AI persona denemeleri, kullanıcı yönetimi, bildirim/SMTP/WhatsApp, delegasyon ve gelişmiş hukuk dosyası adımları demo kapsamındadır. Bu sürüm bunları canlı backend özellikleri olarak sunmaz. Demo Go-Live düğmesi sahte migration/yayın başarı mesajları üretmez.

## Kontroller

- İlgili AI, taslak/onay, yenileme ve entegrasyon testleri: 174 geçti.
- Yeni veri API'si: demo engeli, güncel metin/sürüm zorunluluğu, başarısız AI çağrısında koruma, eşzamanlı işlem engeli.
- 12 ekran sekmesi tarayıcıda açıldı; konsol hatası görülmedi.
- Mobil 375 piksel içerik genişliğinde sayfa genişliği de 375 piksel; yatay taşma yok.
- JS sözdizimi, diff whitespace ve orijinal CSS eşitliği kontrol edildi.
- Test için gerçek Google yanıtı yayınlanmaz. Canlı yayın sonrası okuma/bağlantı kontrolü ayrıca yapılır.
