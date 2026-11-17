# OTOTR İK2 — sentetik demo

Kolay İK'da incelenen ekran ve akışlardan geliştirilen ikinci İK çalışma alanı. Mevcut gm-ik korunur; ERP menüsüne ayrı **İK2 · Demo İK Merkezi** bağlantısı eklenir.

Bu sürüm tarayıcıda çalışan kapsamlı bir demodur. Kolay İK'nın tüm ürün yeteneklerine veya piksel düzeyinde birebirliğine sahip olduğu iddia edilmez. Gerçek çalışan verisi için üretim sistemi değildir.

## Çalıştırma

Depo kökünde `python -m http.server 8172 --bind 127.0.0.1`, ardından `http://127.0.0.1:8172/gm-ik2/`.

Test: `node --test tests/ik2-model.test.mjs tests/ik2-workflows.test.mjs`

## Çalışan demo akışları

| Alan | Davranış |
| --- | --- |
| Ana sayfa | Beş sütunlu geniş ekran, dağılım grafiği, astlar, talepler, izinler, etkinlikler, doğum günleri ve tatiller |
| Çalışan | Ekleme, özlük/iletişim/eğitim/aile/banka alanları, aktif/pasif durum, kart/liste/çok seviyeli organizasyon, arama ve filtre |
| Kariyer | Pozisyon/maaş geçmişi; ileri tarihli değişiklikler mevcut bilgiyi değiştirmeden plan olarak saklanır |
| İzin | 13 tür, gün/saat birimi, kesirli bakiye, çakışma, tatil/iş günü hesabı, açıklama ve yerine bakacak kişi |
| Politika | Altı adım; yıllık/aylık hak ediş, yaş/kıdem ekleri, dört devir şekli, eksi bakiye ve bekleme |
| Onay | 1–5 adım, yönetici/İK/belirli kişiler; kendini ve aynı talebi iki kez onaylama engeli; talepte sabit onay sırası |
| Ödeme/mesai/vize | Talep, onay, gerekçeli ret, iptal; harcama/avans için demo ödendi; vize talep takibi |
| Takvim | Ay/hafta/gün, tarih/tür filtresi, etkinlik oluşturma/düzenleme, onaylı izinler |
| Vardiya | Günlük/haftalık limit, mola, gece ve dinlenme kuralı; çift yönlü izin çakışması; atomik şablon uygulama |
| Puantaj/PDKS | Aylık plan/gerçekleşen/fark, günlük kayıt, yerel giriş/çıkış simülasyonu |
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

52 İK2 otomatik testi ve mevcut ERP menüsünün 3 regresyon testi. Pages yayınına İK2 test adımı eklendi.

Tarayıcıda 44 ana/alt görünümün açılması; çalışan oluşturma ve boş alan hatası; altı adımlı politika; iki ayrı kişiyle onay; çalışan rolünde başka özlük dosyası/bordro engeli; yedi adımlı performans ve 75/80 puanlarından %60 ağırlıkla 77 sonucu kontrol edildi.

Filtreli raporda Nilüfer'in dört çalışanı doğrulandı. Checkbox isimlerinin filtreyle çakışması bulundu ve düzeltildi. TXT dosyası yüklenip indirildi, SHA-256 özetleri eşleşti. PDKS çift giriş engeli/çıkış, adaydan çalışan, ücret teklif/onay/uygulama, 13 çalışanlı demo bordro, görevler, zimmet iadesi, özel alan ve takvim görünümleri denendi.

Vardiya şablonu, onaylı izin çakışması ve 8 saat plan/8 saat gerçekleşen puantaj doğrulandı. JSON yedek sonrasında ek kayıt oluşturuldu; geri yüklemede çalışan sayısı tekrar 13 oldu. 390 px görünümde dokuz ana ekranda yatay sayfa taşması görülmedi. Geniş tablolar kendi alanlarında kayar. İncelenen tarayıcı konsolunda uygulama hatası/uyarısı görülmedi. Bunlar bütün olası kombinasyonların testi değildir.

## Veri ve erişim

Kayıtlar `ototr.ik2.demo.v2` localStorage anahtarında, yalnızca o tarayıcı/origin içinde tutulur. Önceki v1 anahtarına dokunulmaz. Sunucuda HR tablosu, private dosya depolama veya gerçek personel kaydı oluşturulmaz. Demo rol seçimi gerçek yetkilendirme değildir; sayfa yenilenince başlangıç demo yöneticisine döner.

Yayında mevcut ERP oturumu `saha-satis/erp-access.js` ile denetlenir. HTML başlangıçta kilitlidir. CSP inline JavaScript'e izin vermez; yalnızca mevcut Supabase proje adresine bağlantı açar. Loopback QA sentetik verilerle oturumsuz çalışır. ERP giriş kontrolü sunucu tarafı HR yetkilendirmesinin yerine geçmez.

## Tam ürün eşdeğerliği için kalanlar

- Gerçek personel/dosya verisi için sunucu kalıcılığı, RLS, yetki matrisi ve operasyonel yedekleme.
- Mevzuatla doğrulanmış bordro, SGK/e-vizite, kümülatif matrah/istisnalar, kıdem/ihbar ve banka dosyaları.
- E-posta/SMS/davet, gerçek PDKS cihazı, ATS, Multinet ve diğer servis bağlantıları. Demo bu servislere gönderim yapmaz.
- Tek tek soru puanlanan 360 derece performans, kapsamlı ücret hiyerarşisi, kişi bazında birden çok çalışma/izin politikası ve otomatik takvim ilerlemesi.
- Kaynak üründeki tüm alt seçeneklerin ve görsel ayrıntıların birebir eşleştirilmesi. Kullanıcının talimatıyla mevcut ekran kayıtları esas alınmıştır; kaynak demo beklenmemiştir.

Bu maddeler tamamlanmış demo işlevleriyle karıştırılmamalıdır. Canlı İK kullanımı için ayrı uygulama ve doğrulama gerekir.

## Lisans ve gizlilik

Yerel Lucide 0.468.0 ikonlarının lisansı `vendor/LUCIDE-LICENSE` dosyasındadır. Kaynak ürünün logosu, çalışan fotoğrafları, ekran kayıtları veya özel verileri Git'e eklenmez.
