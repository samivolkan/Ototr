# İK OTOTR — genel merkez ve bayi demo alanı

İlk sürüm: 18 Kasım 2026. Ana şablon: `../gm-ik2/`, Git sürümü `b5f8f10468b7699e2f0dc013704af3e98fc4371f` (G708). Şablon dosyaları ve tarayıcı kayıtları değiştirilmeden bu ayrı klasöre kopyalanmıştır. Sonraki tasarım ve iş akışı geliştirmeleri burada yapılır.

## Demo organizasyonu

| Birim | Çalışan | Görevler |
| --- | ---: | --- |
| Genel Merkez | 3 | Genel müdür, İK/eğitim, finans |
| Nilüfer | 3 | Bayi müdürü, mekanik/diagnostik, kaporta/boya |
| Gebze | 3 | Bayi müdürü, mekanik/diagnostik, kaporta/boya |
| İnegöl | 3 | Bayi müdürü, mekanik/diagnostik, kaporta/boya |

12 kurgusal kişinin doğum günleri, iletişim, eğitim, aile, acil durum, demo banka/kimlik referansları, kariyer, ücret geçmişi ve mesleki yeterlilik alanları doludur. Gerçek kimlik, telefon, hesap veya sözleşme verisi kullanılmaz. Uygulanmayan alanlar boş bırakılır.

İlişkili örnekler: 12 zimmet, eğitim, indirilebilir TXT belge, giriş-çıkış, puantaj, hedef, iş akışı ve bildirim; 4 etkinlik, performans dönemi, ücret planı ve aday; 12 satırlı demo bordro; izin, harcama, avans, mesai ve vize talepleri. Vardiya kayıtları hazırdır ancak modül varsayılan olarak kapalıdır. Performans skalaları, şablonu, rapor şablonu, çalışma takvimi ve finans kontrol örnekleri de bulunur. Bordro hesaplaması yasal bordro değildir.

## Veri ayrımı ve kapsam

- Anahtar: `ototr.ik-ototr.demo.v2`; İK2'nin anahtarından bağımsızdır.
- Birim seçimi: `ik-ototr.scope` oturum tercihi. Genel merkez tüm kayıtları veya kendi ekibini; bayi görünümü seçilen birimi gösterir.
- Tek demo belge kullanılır; bayi ekranında yapılan değişiklik genel merkez ekranında da görünür. Filtre veri silmez.
- Sunucu demo alanı kimliği `ototr-network-demo` olarak ayrılmıştır. Bu sürümde sunucuya yükleme yapılmamıştır. Aynı tarayıcıdaki yerel kayıtlar otomatik saklanır; cihazlar arası otomatik eşitleme iddiası yoktur.
- Birim filtresi gerçek bayi hesabı yetkilendirmesi değildir. Canlı personel verisine geçişten önce sunucu tarafında hesap/bayi eşlemesi ve veri erişim kuralları gerekir. Mevcut ERP giriş kapısı korunur.

## Kontroller

`node --test tests/ik-ototr-network.test.mjs` seed bağlantılarını, kişi sayılarını, rapor/bordro kapsamını, merkez-bayi kayıt sürekliliğini ve yönetici seçiminin korunmasını denetler. İK2 regresyon testleriyle beraber 123 test başarılıdır. Yerel tarayıcıda 22 menü rotası, 3 kişilik bayi listesi, 12 kişilik merkez listesi, bayi bordrosu ve özlük kaydetme akışı kontrol edilmiştir. Mobil 390px ekranda sayfa taşması görülmemiştir.
