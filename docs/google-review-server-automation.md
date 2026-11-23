# Bursa sunucu otomasyonu

Bursa Nilüfer için pg_cron her 5 dakikada bir Vault kimliğiyle sunucu fonksiyonunu çağırır. Diğer şubeler kapsama alınmaz. Tarayıcı oturumu gerekmez.

## Güvenlik ve yayın
- İstek gövdesi bir kullanıcı kimliği veya şube seçemez. İş kapsamı sunucuda Nilüfer olarak sabittir.
- Worker sırrı yalnız Vault içinde tutulur; API sadece SHA-256 özetini karşılaştırır.
- Kullanıcı çağrıları Auth getUser ile doğrulanmaya devam eder. Fonksiyon gateway verify_jwt=false, özel worker kimliğinin kullanımı içindir; anonim erişim açık değildir.
- AI delegasyonu canlı çalışma kilidi ve hazırlanan yorum kaydı gerektirir.
- En fazla iki yeni taslak ve iki otomatik yayın / çalışma. Risk, düşük yıldız, hukuki bekletme, değişen metin ve mevcut Google yanıtı yayınlanmaz.
- Belirsiz yayın otomatik yeniden gönderilmez. Başarısız taslak tekrarları kullanıcı incelemesi gerektirir.
- CAS sürüm denetimi ve 4 dakikalık çalışma kilidi eşzamanlı gönderimi engeller. pg_net isteği 150 saniyede sonlandırılır.

## İşletim
`google_review_automation` son çalışma, Google doğrulaması, hata ve sonraki zamanı tutar. `google_review_automation_runs` her çalışmanın sayısal sonuçlarını saklar; müşteri metni içermez. Sistem ekranı son AI çağrısını ve çalışma kayıtlarını gösterir. Açık kayıt ile sağlıklı bağlantı ayrıdır; geciken çalışma yeşil gösterilmez.

Durdurma (yetkili veritabanı yönetimi):
```sql
update public.google_review_automation set enabled=false where branch_id='branch-google-nilufer';
select cron.unschedule('ototr-nilufer-review-automation');
```

Yeni şubeler otomatik olarak bu kapsama eklenmez; doğrulama, yetki ve ayrı aktivasyon gerektirir. SMS/WhatsApp gönderimi bu zamanlayıcıya dahil değildir.

## Taslak hazır + iki saat
23 Kasım 2026 Sami kararı: otomatik yayın uygunluğu taslak hazır olduğunda başlayan 120 dakika sonrasıdır. Veritabanı draft_ready_at / auto_send_after değerlerini damgalar. Metin veya sürüm değişince süre yeniden başlar. Elle düzenlenen taslaklar mevcut güvenlik kuralıyla insan onayında kalır.
Sunucu kontrolü 5 dakikada bir; bu nedenle uygun gönderim iki saatten önce olmaz, sonraki uygun kontrolde işlenir. Kuyrukta çalışma başına en fazla iki taslak/yayın sınırı korunur. Yorum uzmanı görev kartı operasyon belgesidir, AI sistem istemini otomatik değiştirmez.
