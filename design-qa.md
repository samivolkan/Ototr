# OTOTR AI ERP Asistanı — Design QA

## Source of truth

- Referans görsel: `C:\Users\SAMIVO~1\AppData\Local\Temp\codex-clipboard-f34a610c-75ee-427e-82b2-abcc65c43661.png`
- Referans ölçüsü: `768 × 457` piksel.
- Uygulama: `http://127.0.0.1:4173/index.html#dashboard`
- Tarayıcı kanıtı: Codex in-app Browser, tab 3 (araç tarafından görüntülenen masaüstü ve mobil yakalamalar; dosya sistemi yolu üretmiyor).
- Masaüstü görünümü: `1265 × 744` CSS piksel, normal panel açık durumu.
- Mobil görünümü: `390 × 844` CSS piksel, panel açık ve örnek AI yanıtı görünür durumda.
- Yoğunluk normalizasyonu: Uygulama yakalamaları CSS piksel ölçeğinde incelendi; referansın panel bölgesi kırpılmadan karşılaştırıldı.

## Full-view comparison evidence

Referanstaki sağ alt müşteri hizmetleri bileşeninin temel kompozisyonu korundu: koyu başlık, kırmızı dairesel destek ikonu, kapatma kontrolü, beyaz yuvarlatılmış panel, kart tabanlı hızlı seçimler ve kırmızı yüzen aç/kapat düğmesi. ERP kullanımına uygun olarak panel genişletildi; WhatsApp seçeneği yerine Kokpit, şube, görev ve risk verileriyle etkileşimli karar desteği getirildi.

Panel masaüstünde ERP içeriğini tamamen kapatmadan sağ kenarda açılıyor. Mobil görünümde 12 piksel kenar boşluğu, sabit alt giriş alanı ve kaydırılabilir mesaj alanı korunuyor; kalıcı kontroller viewport dışında kalmıyor.

## Focused comparison evidence

- Tipografi: Referansla uyumlu modern sans-serif yapı; ERP'nin mevcut Inter ailesi, güçlü başlık ve küçük yardımcı metin hiyerarşisi korundu.
- Aralık ve ritim: Başlık 16 px, kartlar 11–13 px iç boşluk, 12–14 px yarıçap ve dengeli 8–12 px dikey aralıklarla referans yoğunluğuna yakın.
- Renkler: OTOTR kırmızısı, koyu başlık ve açık gri sınırlar mevcut ERP tokenlarıyla uyumlu; koyu tema varyantı ayrıca kod seviyesinde destekleniyor.
- Görsel ve ikonlar: Özel raster varlık gerekmiyor. Mevcut Lucide ikon kütüphanesi kullanıldı; emoji, özel SVG veya placeholder kullanılmadı.
- Metin: Müşteri hizmetleri kopyası ERP yönetim bağlamına uyarlandı. Demo/canlı ayrımı, kaynak bilgisi ve insan onayı zorunluluğu açıkça gösteriliyor.

## Primary interactions tested

- Yüzen düğmeyle panel açma ve kapatma.
- `Bugünün kritik risklerini özetle` hızlı sorusunun ERP verisinden yanıt üretmesi.
- Yanıtta kaynak ve insan onayı notunun gösterilmesi.
- `AI Öneri Merkezi` düğmesinin `#ai` rotasına geçmesi.
- Mobil `390 × 844` görünümde panel, mesaj kaydırma alanı ve giriş kontrolleri.
- Escape kısayolu, klavye odağı ve erişilebilir adlar kod ve AX ağacında doğrulandı.

## Comparison history

1. İlk masaüstü yakalamasında referansın koyu başlık/kırmızı vurgu/beyaz kart oranlarıyla eşleşme doğrulandı; P0/P1/P2 fark bulunmadı.
2. Mobil yakalamada ilk ekran görüntüsü etkileşimden hemen önceki kareyi gösterdi; güncel durum yeniden yakalandı ve panelin viewport içine tam oturduğu doğrulandı. Kod değişikliği gerekmedi.

## Console and test notes

- `ototr-ai-assistant` filtreli tarayıcı konsolunda hata veya uyarı yok.
- Ana ERP'nin daha önce de bulunan, AI bileşeninden bağımsız `MutationObserver` hatası konsolda görüldü.
- Yeni statik test ve JavaScript sözdizimi testi geçti.
- Mevcut `tools/test-index.mjs` ortamda Playwright paketi olmadığı için çalışmadı.
- Mevcut `tests/google-reviews.test.mjs`, güncel HTML'de artık bulunmayan eski işaretleyiciyi aradığı için başarısız; AI değişikliğiyle ilgili değil.

## Findings

- P0/P1/P2 görsel veya etkileşim sorunu bulunmadı.
- P3: Gerçek üretim modeli bağlandığında yanıt bekleme durumuna süre aşımı ve yeniden dene kontrolü eklenebilir.

## Final result

passed
