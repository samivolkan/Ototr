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
- Arka plan yenilemesi yalnız okuma yapar; AI taslağı oluşturmaz, onay vermez ve Google'a yanıt yayımlamaz. Sayfa kapalıyken çalışan bir sunucu zamanlayıcısı değildir.
- Başarısız yenilemede son başarılı veri tutulur ve hata gösterilir; aynı anda ikinci senkronizasyon başlatılmaz.
