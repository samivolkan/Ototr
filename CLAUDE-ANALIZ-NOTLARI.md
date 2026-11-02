# OTOTR Google Yorum Merkezi — Claude analiz paketi

## Kapsam

Bu paket yalnızca Google Yorum Merkezi, Google Business Profile OAuth/senkronizasyonu, AI yanıt akışı ve ilgili testleri içerir. OAuth token, OpenAI anahtarı, Supabase service-role anahtarı veya kullanıcı verisi içermez.

## Bu sürümde tamamlananlar

- Nilüfer canlı şube; Gebze, Ankara Merkez, İzmir Bornova ve İstanbul Kadıköy demo şube olarak ayrıştırıldı. İnegöl kullanıcı isteği doğrultusunda listeden çıkarıldı.
- Son başarılı canlı Google verisi tarayıcı cache’inde tutulur; senkronizasyon başlamadan önce liste/kartlar cache’ten çizilir.
- Yeni senkronizasyonda `since_by_branch` ile son `updateTime` sınırı gönderilir. Google sayfaları güncel kayıt sınırında durur; yalnızca yeni/değişen yorumlar frontend cache’ine merge edilir. Boş/eksik/hatalı yanıt eski veriyi silmez.
- Arka plan yenileme Google yorumlarında 5 dakika, onay/iş akışında 1 dakika çalışır; geçici hatalarda en fazla 15 dakikalık backoff uygulanır. Sayfa görünür değilse, başka rota açıksa veya modal açıksa istek yapılmaz.
- Gelişmiş bağlantı ayarları artık gerçek kaynak kimliği olarak kullanılır: hesap ID + konum ID varsa tüm hesap/konum keşfi atlanır ve doğrudan konum doğrulanır. Mağaza kodu varsa ayrıca eşleşme kontrol edilir.
- Nilüfer mağaza kodu: `13674839659006303129`; Google konum ID: `13476693615171033693`; hesap/grup ID: `114698852482564472140`.
- Canlı sync ve AI işlevleri yetkili ERP oturumu olmadan çalışmaz; browser tarafına gizli token taşınmaz.
- Google Review Center doğrudan açılışta yalnızca ilgili ekranı çizerek diğer ERP modüllerinin ilk render’ını erteleyen lazy render korumasına sahiptir. `app-core.min.js` preload/cache-busting sürümü güncellenmiştir.
- AI yanıtları Nilüfer için `OTOTR Bursa Nilüfer Otoekspertiz Ekibi` imzasını tek kez kullanır. OpenAI sağlayıcısının moderation alanı yoksa bu durum hata sayılmaz; açık güvenlik hatası/flag varsa yanıt yayınlanabilir kabul edilmez.

## Canlı servis durumu

- Supabase `google-business-oauth`: ACTIVE, v30.
- Supabase `google-review-ai`: ACTIVE, v17.
- Yetkisiz sync isteği HTTP 401 ve `ERP oturumu gerekli.` dönüyor; bu beklenen fail-closed davranıştır.

## Doğrulanan testler

Çalıştırılan odaklı paket: 223 test, 223 başarılı.

Kapsananlar: AI yanıt doğrulama/moderation, imza ve kişiselleştirme, workflow/approval/publish güvenliği, hedefler, dashboard hesapları, gerçek cache trendi, arka plan yenileme zamanlayıcısı, analiz ve canlı trend yardımcıları.

Ek olarak:

- `node --check` ile frontend ve Edge Function JavaScript/TypeScript kaynakları kontrol edildi.
- `git diff --check` temiz.
- Yerel tarayıcıda ekran yenileme sonrası Google Yorum Merkezi görünür, 5 şube görünür, İnegöl görünmez, konsol error/warn yok.
- Yetkisiz yerel sync denemesinde demo/kaynak ekranı boşalmadı.

## Bilinçli doğrulama sınırı

Mevcut yerel browser oturumunda dijital@ototr.com adına yetkili ERP access token bulunmadığı için Nilüfer’in gerçek Google yorum sayısı, son `updateTime` ve canlı yorum kartları uçtan uca okunarak doğrulanmadı. Bu nedenle pakette gerçek yorum veya puan uydurulmadı. Yetkili oturumla ilk sync yapıldığında cache ve artımlı akışın gözlemlenmesi gereken kontrol listesi:

1. Nilüfer için “Google Senkronize Et” çalıştırılır.
2. İlk başarılı sync son zamanı ve yorum kartları görünür.
3. Aynı işlem tekrarlandığında eski yorumlar kaybolmaz; yalnızca yeni/değişen kayıt sayacı değişir.
4. Google’da yeni bir yorum/yanıt değişikliği yapıldıktan sonra en geç 5 dakika içinde veya manuel sync sonrası kart/sayaç/grafik güncellenir.

## Claude’dan özellikle istenecek analiz

- Cache’in tarayıcı localStorage yerine Supabase tarafında kullanıcı/şube kapsamlı kalıcı cache’e taşınması gerekip gerekmediği.
- Google `reviews.list` sıralama ve `updateTime` sınırının Google API davranışıyla production ortamında tekrar doğrulanması.
- OAuth bağlantısının tek `ototr-primary` kaydı yerine şube/hesap kapsamına ayrılması gerekip gerekmediği.
- 2.7 MB civarı başlangıç HTML + app-core payload’ının Google ekranı için route-level code splitting ile daha da küçültülmesi.
- Canlı yetkili oturumla performans, yeni yorum ekleme, güncellenen yanıt ve hata sonrası cache koruma için E2E senaryolarının eklenmesi.

## Bilinen eski test notu

`tests/google-reviews.test.mjs` eski inline-HTML harness’ının arşiv testidir; uygulama artık `assets/app-core.min.js` üzerinden yüklendiği için release gate’e dahil edilmemiştir. Claude analizinde bu testin yeni app-core fixture’ına taşınması önerilir.
