# Google Yorum AI entegrasyonu

## Amaç

ERP içindeki **Google Yorumlar** modülünde, yorum ve puana göre insan üslubunda yanıt taslağı üretir. Taslaklar hiçbir zaman doğrudan Google'a gönderilmez; önce genel merkez onay kuyruğuna alınır.

## Güvenlik modeli

- `OPENAI_API_KEY` yalnızca Supabase Edge Function sırrıdır; HTML, JavaScript veya Git deposuna yazılmaz.
- OpenAI'ye müşteri adı, telefon, plaka veya ERP iç kayıtları gönderilmez. Yalnızca şube adı/şehir, yıldız puanı ve herkese açık yorum metni gider.
- OpenAI Structured Outputs ile yanıt, risk rotası ve insan onayı zorunluluğu şemaya bağlanır.
- Girdi ve çıktı moderasyonu etkinleştirilmiştir.
- Hukuk/dava/iade/güvenlik/kişisel veri/ciddi teknik hata iddiası otomatik yayınlanamaz.
- Google OAuth yenileme hatalarında yanıt kaybolmamalı; yayın servisi `pending -> publishing -> published|failed` durum makinesi ve idempotency anahtarı kullanmalıdır.

## Kurulum

1. Supabase projesinde `OPENAI_API_KEY` sırrını tanımlayın.
2. İsterseniz `OPENAI_MODEL` sırrıyla modeli değiştirin; varsayılan `gpt-5-mini`.
3. `supabase/functions/google-review-ai` fonksiyonunu JWT doğrulaması açık olarak dağıtın.
4. ERP kullanıcı oturumu açıkken Google Yorumlar ekranında **Yanıt Taslağı Oluştur** düğmesini kullanın.

## Google Business Profile canlı yayın fazı

Canlı yayın için her şubenin `accountId`, `locationId` ve sunucu tarafında şifreli OAuth refresh token eşleşmesi gerekir. Web istemcisi Google tokenı görmemelidir. Yayın uç noktası yalnızca onaylı taslağı kabul etmeli, Google `reviewId` ile idempotent çalışmalı ve gönderim sonrası Google'dan tekrar okuyarak doğrulamalıdır.

## Kabul kriterleri

- Aynı yorum için yeniden üretim farklı ama marka standardına uygun bir taslak verebilir.
- 1-2 yıldız ve hukuki iddialar insan onayı zorunlu döner.
- API kapalıysa güvenli yerel taslak görünür ve bunun API taslağı olmadığı açıkça belirtilir.
- Onay kuyruğuna alma Google'a gönderim yapmaz.
- Anahtar veya OAuth tokenı tarayıcı kaynaklarında bulunmaz.

## Otomatik yenileme ve yayın

- Test edilen değişiklikler `main` dalına gönderildiğinde GitHub Pages dağıtımı otomatik başlar. Dağıtımın başarılı olduğu ve canlı dosyaların gönderilen sürümle eşleştiği kontrol edilmelidir.
- Google Yorumlar ekranı açıldığında yorumlar kendiliğinden alınır. Ekran açık, görünür ve çevrimiçiyken Google yorumları beş dakikada, ortak görev/onay listesi bir dakikada yenilenir.
- Başka ekrandayken, sekme gizliyken veya yanıt/görev düzenleyicisi açıkken arka plan yenilemesi bekler. Düzenlenen metin ve şube/filtre seçimi korunur.
- Yorum ve görev yenilemesi tamamlandıktan sonra cevapsız ve kayıtlı taslağı olmayan yorumların AI yanıtları otomatik hazırlanır. Sayfa kapalıyken çalışan bir sunucu zamanlayıcısı değildir.
- Başarısız yenilemede son başarılı veri tutulur ve hata gösterilir; aynı anda ikinci senkronizasyon başlatılmaz.

## Senkronizasyon performansı

- `sync_reviews`, tek ERP yetki kontrolü ve tek Google erişim anahtarı yenilemesiyle şube yorumlarını okur. Anahtar yalnız sunucuda kullanılır.
- Hesap/konum keşfinin ve yorumların tüm sayfaları okunur. Bağımsız şubeler sınırlı paralellikle işlenir; aynı şubenin sonraki sayfası önceki sayfa anahtarını bekler.
- Şube eşleşmesi sunucuda kesin mağaza koduyla yapılır. Başarısız şube son başarılı verisini korur; başka şubedeki hata başarılı sonuçları gizlemez.
- Google'ın bildirdiği toplam yorum sayısı ile alınabilen yorum sayısı farklıysa arayüz bu farkı belirtir. Cevap bekleyen sayı yalnız alınan yorumlara dayanır; eksik yorum uydurulmaz.
- Her senkronizasyon Google'dan yeniden okur; performans için eski yorum sonucu önbelleğe alınmaz.

## Hazır yanıt kartları

- Yorum solda, kayıtlı AI yanıtı ve işlemler sağdadır. Yanıtlanmış yorumlarda mevcut Google yanıtı gösterilir ve otomatik değiştirilmez.
- Ekran görünürken en fazla iki taslak aynı anda hazırlanır. `prepare_draft` her yorum kimliği için veritabanında tek hazırlık rezervasyonu oluşturur; başka oturum mevcut kaydı alır, ikinci AI çağrısı açılmaz.
- Başarılı hazırlık `approval_pending` olarak kalıcı kaydedilir. Başarısızlık `draft_failed` durumudur ve yalnız açık yeniden deneme ile tekrar AI çağrılır. Yarım kalan hazırlıklar sürüm/deneme kimliği kontrolüyle kurtarılır.
- Sunucu Google'dan doğru yorumu ve şubeyi doğrular; hazırlık sırasında yorum veya mevcut yanıt değişirse taslak onaya geçirilmez.
- Kartta düzenleme ve kaydetme, yeniden üretme, açık onay kutusu ve **Onayla ve gönder** bulunur. Onay yalnız görülen kayıt kimliği, sürüm ve metne bağlıdır; metin veya sürüm değişince sıfırlanır.
- Otomatik hazırlık hiçbir zaman yayın onayı vermez. Taslaklar, görevler ve Google'ın mevcut yanıtları korunur.

## Google yayın doğrulaması

- Canlı bir yanıtta Google, onaylanan Türkçe metne `\n\n(Translated by Google)\n` ve İngilizce çevirisini ekledi. Eski tam metin karşılaştırması bu yanıtı yanlışlıkla belirsiz yayın ve ardından çakışma olarak işaretledi.
- Doğrulama önce birebir eşleşme arar; yalnız bu gözlemlenen işaretin ayırdığı çeviri eki için onaylanan asıl metni birebir karşılaştırır. Harf, noktalama ve içerik farkları yok sayılmaz. Bu biçim gözlemlenen API davranışıdır; Google'ın belgelenmiş çeviri ayrıştırma sözleşmesi değildir.
- Daha önce insan tarafından onaylanmış başarısız kayıtlar `verify_reply` ile yeniden okunabilir. Bu işlem Google'a PUT yapmaz; onay kaydı olmayan bir taslağı yayımlanmış saymaz.
- Google'ın `reviewReplyState` alanındaki `PENDING` ve `REJECTED` durumları başarılı yayın sayılmaz. Belirsiz sonuçları kurtarma işlemi aynı yanıtı otomatik yeniden göndermez.
- Tekil Google sorgusu yanıtı boş döndürürse aynı hesap/konumun güncel yorum listesi tüm sayfalarıyla kontrol edilir. Yalnız aynı yorum kimliği ve konum adı eşleşen kayıt doğrulamaya alınır; eksik, çelişkili veya yarım veri yeni gönderime izin vermez. Doğrulamanın kaynağı ve zamanı kayıt üzerinde tutulur.
- Resmî API kaynakları: [ReviewReply ve moderasyon durumları](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews#ReviewReply), [updateReply yanıtı](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply).
