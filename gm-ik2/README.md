# OTOTR İK2 — sentetik demo

Kolay İK'da incelenen ekran ve akışlardan geliştirilen ikinci İK çalışma alanı. Mevcut gm-ik korunur; ERP menüsünde İnsan Kaynakları satırının altına ayrı **İK2 · Demo İK Merkezi** bağlantısı eklenir.

Bu sürüm tarayıcıda çalışan kapsamlı bir demodur. Kolay İK'nın tüm ürün yeteneklerine veya piksel düzeyinde birebirliğine sahip olduğu iddia edilmez. Gerçek çalışan verisi için üretim sistemi değildir.

## Çalıştırma

Depo kökünde `python -m http.server 8172 --bind 127.0.0.1`, ardından `http://127.0.0.1:8172/gm-ik2/`.

Test: `node --test tests/ik2-model.test.mjs tests/ik2-workflows.test.mjs tests/ik2-navigation.test.mjs tests/ik2-audit-regressions.test.mjs tests/ik2-operations.test.mjs tests/ik2-cloud.test.mjs`

## Çalışan demo akışları

| Alan | Davranış |
| --- | --- |
| Ana sayfa | Beş sütunlu geniş ekran, dağılım grafiği, astlar, talepler, izinler, etkinlikler, doğum günleri ve tatiller |
| Çalışan | Ekleme, özlük/iletişim/eğitim/aile/banka alanları, aktif/pasif durum, kart/liste/çok seviyeli organizasyon, arama ve filtre |
| Kariyer | Pozisyon/maaş geçmişi; ileri tarihli değişiklikler açılışta ve açık sayfada tarih ilerlediğinde bir kez uygulanır; demo tarih ilerletme |
| İzin | 13 tür, gün/saat birimi, kesirli bakiye, çakışma, tatil/iş günü hesabı, açıklama ve yerine bakacak kişi |
| Politika | Altı adım; yıllık/aylık hak ediş, yaş/kıdem ekleri, dört devir şekli, eksi bakiye ve bekleme |
| Onay | 1–5 adım, yönetici/İK/belirli kişiler; kendini ve aynı talebi iki kez onaylama engeli; talepte sabit onay sırası |
| Ödeme/mesai/vize | Talep, onay, gerekçeli ret, iptal; harcama/avans için demo ödendi; vize talep takibi |
| Takvim | Ay/hafta/gün, tarih/tür filtresi, etkinlik oluşturma/düzenleme, onaylı izinler |
| Vardiya | Günlük/haftalık limit, mola, gece ve dinlenme kuralı; çift yönlü izin çakışması; atomik şablon uygulama |
| Puantaj/PDKS | Aylık plan/gerçekleşen/fark; Türkiye gün sınırıyla PDKS–puantaj aktarımı, manuel düzeltme koruması, gerekçeli oturum düzeltme, atomik cihaz JSON aktarımı |
| Bordro | Örnek oranlarla dönem hesabı, aktif çalışanlar, ek ödeme/kesinti ve CSV; yasal hesap değildir |
| Performans | Yedi adım; dönem/tür/ağırlık/katılımcı/soru/erişim, yetkinlik-hedef puanı ve ağırlıklı sonuç |
| Ücret | Katılımcı/bütçe, teklif/onay/uygulama, eski maaş değişmişse uygulama engeli |
| Zimmet/eğitim | Seri tekilliği, çalışan ataması, zimmet iadesi, eğitim süresi/eğitmen ve toplu atama |
| Aday/iş akışı | Başvuru/görüşme/teklif, atomik adaydan çalışan oluşturma; görev ekleme/tamamlama/yeniden açma |
| Özel alan | Metin/uzun metin/sayı/tarih/seçim, zorunluluk ve çalışan bazında değer |
| Dosya | TXT/PDF/PNG/JPG yükleme/indirme ve geri alınabilir arşiv, 500 KB sınırı |
| Rapor | Alan/şube seçimi, güncel veriden üretim, şablon kaydı ve CSV |
| Veri/izleme | Atomik JSON içe aktarma, yedek/geri yükleme, bildirim/işlem günlüğü, eski sekmenin üzerine yazma engeli |

## Doğrulama — 17 Kasım 2026

62 İK2 otomatik testi ve mevcut ERP menüsünün 3 regresyon testi. Pages yayınına İK2 test adımı eklendi.

Tarayıcıda 44 ana/alt görünümün açılması; çalışan oluşturma ve boş alan hatası; altı adımlı politika; iki ayrı kişiyle onay; çalışan rolünde başka özlük dosyası/bordro engeli; yedi adımlı performans ve 75/80 puanlarından %60 ağırlıkla 77 sonucu kontrol edildi.

Filtreli raporda Nilüfer'in dört çalışanı doğrulandı. Checkbox isimlerinin filtreyle çakışması bulundu ve düzeltildi. TXT dosyası yüklenip indirildi, SHA-256 özetleri eşleşti. PDKS çift giriş engeli/çıkış, adaydan çalışan, ücret teklif/onay/uygulama, 13 çalışanlı demo bordro, görevler, zimmet iadesi, özel alan ve takvim görünümleri denendi.

Vardiya şablonu, onaylı izin çakışması ve 8 saat plan/8 saat gerçekleşen puantaj doğrulandı. JSON yedek sonrasında ek kayıt oluşturuldu; geri yüklemede çalışan sayısı tekrar 13 oldu. 390 px görünümde dokuz ana ekranda yatay sayfa taşması görülmedi. Geniş tablolar kendi alanlarında kayar. İncelenen tarayıcı konsolunda uygulama hatası/uyarısı görülmedi. Bunlar bütün olası kombinasyonların testi değildir.

## Veri ve erişim

Kayıtlar `ototr.ik2.demo.v2` localStorage anahtarında, yalnızca o tarayıcı/origin içinde tutulur. Önceki v1 anahtarına dokunulmaz. Sunucuda yalnızca erişimi kapalı İK2 demo çalışma alanı ve sürümlü işlem geçmişi altyapısı vardır. Gerçek personel kaydı oluşturulmaz; ayrı özel dosya kasası ve üretim personel yetki matrisi henüz yoktur. Demo rol seçimi gerçek yetkilendirme değildir; sayfa yenilenince başlangıç demo yöneticisine döner.

Yayında mevcut ERP oturumu `saha-satis/erp-access.js` ile denetlenir. HTML başlangıçta kilitlidir. CSP inline JavaScript'e izin vermez; yalnızca mevcut Supabase proje adresine bağlantı açar. Loopback QA sentetik verilerle oturumsuz çalışır. ERP giriş kontrolü sunucu tarafı HR yetkilendirmesinin yerine geçmez.

## Tam ürün eşdeğerliği için kalanlar

- Gerçek personel/dosya verisi için sunucu kalıcılığı, RLS, yetki matrisi ve operasyonel yedekleme.
- Mevzuatla doğrulanmış bordro, SGK/e-vizite, kümülatif matrah/istisnalar, kıdem/ihbar ve banka dosyaları.
- E-posta/SMS/davet, gerçek PDKS cihazı, ATS, Multinet ve diğer servis bağlantıları. Demo bu servislere gönderim yapmaz.
- Kaynak ürünün birebir tüm seçenekleri, gelişmiş ücret hiyerarşisinin kalan seçenekleri ve tarayıcı kapalıyken sunucu zamanlayıcısı.
- Kaynak üründeki tüm alt seçeneklerin ve görsel ayrıntıların birebir eşleştirilmesi. Kullanıcının talimatıyla mevcut ekran kayıtları esas alınmıştır; kaynak demo beklenmemiştir.

Bu maddeler tamamlanmış demo işlevleriyle karıştırılmamalıdır. Canlı İK kullanımı için ayrı uygulama ve doğrulama gerekir.

## Lisans ve gizlilik

Yerel Lucide 0.468.0 ikonlarının lisansı `vendor/LUCIDE-LICENSE` dosyasındadır. Kaynak ürünün logosu, çalışan fotoğrafları, ekran kayıtları veya özel verileri Git'e eklenmez.

## İkinci modül denetimi — 17 Kasım 2026

49 ana/alt görünüm açıldı; 28 bağımsız sentetik iş akışı ve durumun yeniden yüklenmesi doğrulandı. Sekiz yeni regresyon testiyle gece vardiyası–ertesi gün izin çakışması, puanlandıktan sonra ağırlık değişimi, bekleyen onaylayıcının pasife alınması, teklif altına bütçe indirilmesi, tamamlanan akışın görev değişimi, kullanılan birimin kaldırılması, bozuk bordro yedeği ve bozuk özlük içe aktarımı düzeltildi. Toplam 65 test (62 İK2 + 3 ERP menüsü) geçti. Bu sayılar tüm olası senaryoların veya Kolay İK eşdeğerliğinin kanıtı değildir.

Bu denetimdeki PDKS aktarımı ve tarih ilerlemesi eksikleri aşağıdaki geliştirmeyle kapatıldı. Otomatik işlem uygulama açılışında/açıkken çalışır; tarayıcı kapalıyken sunucu işi yoktur.

## Gelişmiş akışlar — 17 Kasım 2026

- 13 izin türü için ayrı ücretli/ücretsiz, yıllık kota, talep başına süre, bekleme, açıklama ve yerine bakacak kişi kuralları; puantajda ayrı izin/mesai toplamları.
- Onaylı vize talebinden erişim kontrollü, açıkça demo olarak işaretli çalışma belgesi indirme.
- Çalışan bazında farklı izin politikaları; politika çalışma günlerini kullanan vardiya şablonları; yıl geçişinde bir kez izin devri.
- Soru bazında 0–100 puan, katılımcı başına birden çok değerlendirici, tüm yanıtlar gelince hesaplanan sonuç, yeniden gönderme/yetki/kapalı dönem engeli.
- Yönetici ekip ücret teklifi; teklif sahibi ve ücret sahibinden bağımsız 1–5 sıralı onay; bütçe ve eski maaş kontrolü; son uygulama yalnızca İK rolünde.
- Çalışana ait belgeyi bekleyen harcamaya bağlama; bağlı fişin indirilmesi ve yanlış arşiv/silme engeli.
- Harici demo bordro JSON dosyasında tutar, brüt–kesinti–net dengesi, çalışan tekilliği ve dönem tekilliği kontrolü. Bu işlem vergi/SGK doğrulaması değildir.
- 23 rapor alanı: yönetici/politika/kıdem/eğitim, kullanılan/bekleyen izin, zimmet/eğitim sayısı, onaylı mesai/harcama/avans dahil.

Doğrulama: 86 İK2 + 3 mevcut ERP testi; ayrıca sunucuda rollback ile 10 erişim/tutarlılık kontrolü. Tarayıcıda iki değerlendiricinin 80 ağırlıklı puanı ve gece PDKS oturumunun 2+6 saat puantajı doğrulandı. Tarayıcı aracı sonrasında kullanılamaz hale geldiğinden bu turdaki kalan yeni formlar için tarayıcı kabulü tamamlanmış sayılmaz.

## Sunucu çalışma alanı

Ayarlar → Veri Aktar → Sunucu Çalışma Alanı. Bu sürüm otomatik eşitleme yapmaz; yetkili kullanıcı açıkça Kaydet/Yükle işlemini seçer. Sunucu sürümü ile çakışma kontrolü yapılır. İşlem geçmişi ve anlık görüntüler istemci tarafından değiştirilemez. Sunucuda yalnızca `synthetic-demo` veri modu kabul edilir.

`ik2_private.members` kapalı yetki kaydıdır. Hiçbir gerçek hesap atanmadı; kurgusal Deniz Yılmaz bir Supabase hesabı değildir. Üretim çalışan/şube yetkileri bu demo depo modelinden ayrı uygulanmalıdır. Kullanıcı gerçek hesap seçmeden üyelik eklenmez. RLS, anonim/üyeliksiz erişimi ve üyelik tablosuna istemci yazımını engeller.

Uygulanan migration dosyaları: `20261117151713_ik2_private_foundation.sql`, `20261117152358_ik2_workspace_validation.sql`. Sunucu test üyelikleri ve çalışma alanları transaction sonunda geri alındı; kalıcı üye ve çalışma alanı sayısı sıfır.

Bordro/PDKS sağlayıcısı henüz yok. Örnek dosya sözleşmeleri çalışır; canlı cihaz, bordro programı, SGK, banka, e-posta/SMS, ATS veya Multinet bağlantısı varmış gibi gösterilmez. Üretim geçişi, tüm ürün alt seçenekleri ve görsel birebirlik tamamlandı iddiası yoktur.
