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

## Sunucu erişimi ve eşitleme — 18 Kasım 2026

- Çevrim içi uygulama ERP oturumunu kullanır. `ik_ototr_private.members` yalnızca sunucudan yönetilir; tarayıcı rol seçimi yetki vermez.
- Mevcut doğrulanmış Saha ERP merkez hesabı dört birimi, Bursa/Nilüfer ve Gebze hesapları yalnızca kendi birimlerini okuyabilir. Bayi müdürleri kendi biriminde yazabilir; saha çalışanı salt okunurdur. Yeni/atanmamış hesaplar varsayılan olarak erişemez. Üyelik pasifleşmesi, birim değişikliği, hesap yasağı ve merkez rolünün kaldırılması her sunucu isteğinde yeniden kontrol edilir.
- İnegöl örnek sorumlusu **Elif Aksoy** kurgusaldır; gerçek giriş hesabı veya parola üretilmemiştir. Hesap bağlanıncaya kadar İnegöl'ü merkez yönetir.
- `public.ik_ototr_units` dört ayrı belge tutar. RLS başka birimin belgesini tarayıcıya göndermez. Doğrudan INSERT/UPDATE/DELETE kapalıdır. Kayıt RPC'si yetki, birim, çalışan bağlantıları ve beklenen sürümü denetler; sunucuda gerçek kullanıcı kimliğiyle işlem izi bırakır.
- Merkez toplu görünümü okumak içindir. Düzenleme öncesi üst menüden ilgili birim seçilir. Birimler arası personel nakli bu sürümde sunulmaz; birim içi düzenleme desteklenir. Her birimin ayarları ayrıdır. Birim dışı yönetici/onaylayıcı bağlantıları bağımsız demo belgelerinde tutulmaz.
- Görünür sayfa 5 saniyede bir sunucuyu kontrol eder. Form açıkken formun taban sürümü korunur; eski sürümle kayıt üzerine yazılamaz. Kayıt onayı sunucu yanıtından sonra verilir. Bağlantı/oturum hatasında yazma durur; yeniden bağlantı için sayfa yenilenir. Çevrim dışı yazma kuyruğu yoktur.
- Sunucu verisi tarayıcı localStorage'ına yazılmaz. Yerel localhost demosu ayrı `ototr.ik-ototr.demo.v2` anahtarını kullanır; otomatik sunucuya aktarılmaz. Eski ortak IK2 alanı bu uygulamanın eşitlemesinde kullanılmaz.
- Veriler hâlâ kurgusaldır. Gerçek PDKS/bordro bağlantısı yoktur; bu çalışma gerçek veri devreye alma onayı değildir.

## Kontroller

`tests/ik-ototr-sync.test.mjs`: belge ayrımı, 12 kişilik merkez birleşimi, iki bağımsız istemci eşitlemesi, çakışma, açık formun sürümü, salt okunur/çevrim dışı kayıt engeli ve yetki kaldırma kontrolleri.

CI ile aynı komutta 125 test geçti. Supabase'de gerçek `authenticated` / `anon` rollerine geçilerek merkez, bayi, salt okunur hesap, bilinmeyen hesap, yetki yükseltme, doğrudan yazma, çapraz bayi, yanlış çalışan bağlantısı ve sürüm çakışması sınandı. Test yazıları transaction sonunda rollback edildi.

Güvenlik taramasında proje genelindeki mevcut sızdırılmış parola korumasının kapalı olduğu uyarısı ayrıca görülmüştür; bu sürüm Auth ayarlarını değiştirmez.

Canlı G710 kontrolünde Gebze hesabının yalnızca 3 çalışanı gördüğü ve iki sekme arasında telefon alanı değişikliğinin aktarıldığı doğrulandı. Test alanı eski değerine geri getirildi. Çakışma yanıtı HTTP 409 olarak ayrıldı; SDK tekrar denemesi kapatıldı ve veri isteklerine 15 saniye zaman aşımı eklendi.
