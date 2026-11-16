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

---

# Yorum Sayfası 2 — 16.11.2026 tasarım doğrulaması

## Kaynak, durum ve kanıt

- Kaynak: kullanıcının `ototr-google-yorum-duzeltilmis.html` dosyası; genel bakış, son 12 ay, masaüstü.
- Uygulama: `google-review-management.html?variant=2`; mevcut ERP köprüsü ve ayrı sunum katmanı.
- Masaüstü: 1920 × 882 tarayıcı alanı, kaydırma çubuğu hariç 1905 px içerik. Mobil: 390 × 844.
- Yerel kanıt klasörü: `review-page-2-evidence` (görev çalışma alanında; özel müşteri ekranları nedeniyle Git deposuna alınmadı).
- Kaynak tam görünüm: `01-source-overview.jpg`; uygulama tam görünüm: `06-alternative-desktop-final.jpg`; mobil: `05-alternative-mobile.jpg`.
- Karşılaştırılan durum: genel bakış / son 12 ay. Kaynak 20 örnek şubeyi, uygulama yalnız seçili üç şubeden birini gösterir. Sayı farkı bilinçli veri kapsamı farkıdır.

## Beş görsel kontrol

- Tipografi: DM Sans, koyu güçlü başlıklar, küçük yardımcı metinler ve aynı OTOTR marka yapısı korundu.
- Aralık: 1440 px merkez içerik, altı kart, iki sütunlu ana grafik düzeni; mobilde iki kart ve tek grafik sütunu.
- Renk: Koyu menü, açık gri arka plan, beyaz kartlar, mavi yorum, mor eğilim, kırmızı hedef. Demo uyarısı ayrı sarı alanda.
- Varlık ve ikonlar: Kaynağın marka/menü işaretleri korunur; yeni dış görsel veya rastgele grafik değeri eklenmedi.
- Metin: Canlı/demo, dönem, kayıtlı hedef ve eksik ölçüm durumu açık. Taklit A/B başarı yüzdesi gösterilmez.

## Düzeltme döngüsü

1. İlk yakalamada sabit 54 px üst başlık ikinci menü satırını beyaz içerik üzerine taşırıyordu (P1).
2. Yalnız alternatif için otomatik başlık yüksekliği ve tam genişlik ikinci satır uygulandı.
3. Son yakalamada iki menü satırı koyu alan içinde; yatay taşma yok. Mobilde 375 px içerik 390 px görünüm alanı içinde kaldı.

## Etkileşim ve teknik kontrol

- Üç şube seçimi ve dört dönem seçimi; canlı/demo veri ayrımı.
- Demo hedefi Kaydet, yeniden yükle ve aynı değeri gör; ilerleme ve hedef serisinin güncellenmesi.
- Yorum detayı ve demo alternatif yanıt; mobil liste ve detay genişliği.
- Klavye odağı, menü Enter/Space ve grafiklerin erişilebilir veri açıklamaları.
- Chrome konsolunda alternatif sayfaya ait hata/uyarı yok.
- 71 hedefli test, JS sözdizimi ve diff kontrolü geçti.
- Canlı Google'a müşteri yanıtı gönderimi ve canlı hedef değişikliği bu tasarım testi kapsamında yapılmadı.

final result: passed

### Canlı yayın son kontrolü

- Yayında ERP kayıtları, aylık hedef ve gerçekleşme/ilerleme alanları doğrulandı.
- ERP'nin zaten Türkçe biçimlenmiş senkronizasyon tarihi yeniden `Date` ile ayrıştırıldığında `Invalid Date` oluşturuyordu. Köprü Türkçe etiketi koruyacak şekilde düzeltildi; gün/ay karışmasına karşı regresyon testi eklendi.
- Alternatif sayfada dış ERP kabuğunun ikinci profil kontrolü gizlendi; çıkış işlemi başlıktaki açılır Profil menüsünde tutuldu. Yayın sayacı yalnız bir kez sol altta gösterilir.
- Hedefli test kapsamı bu düzeltmeyle 72 teste çıktı.
- Gebze/İnegöl'den canlı şubeye dönüşte demo yönetim isteğinin canlı hedef formunu kilitlemesi giderildi. Demo kapsamı yönetim servisini çağırmaz; Nilüfer'e dönüş mevcut ERP okumasını yeniler.
