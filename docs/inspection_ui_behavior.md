# OTOTR Mobil Usta Form Davranışı

- Usta uygulaması iş emrini önce paket ve görev grupları halinde gösterir.
- Her grup kartında toplam madde, gönderilen madde, tahmini süre ve blokaj durumu görünür.
- Başlangıç kanıtı tamamlanmadan teknik grup içeriği düzenlenmez.
- Madde kartında radio, checkbox, alan, medya veya cihaz çıktısı davranışı JSON şemasındaki inputType değerinden üretilir.
- Kırmızı veya turuncu seçenek seçildiğinde açıklama ve kanıt kontrolü çalışır.
- media ve document_or_image maddelerinde en az bir fotoğraf veya cihaz çıktısı beklenir.
- Usta "Başlığı Gönder" dediğinde eksikler açık Türkçe liste halinde gösterilir.
- İç görüş ve usta kanaati müşteri raporundan ayrılır, audit iziyle saklanır.
- Offline durumda form cevabı, fotoğraf metadata ve dosya yükleme kuyruğa alınır; aynı idempotencyKey ikinci kez rapora yazılmaz.
- Rapor basımı kilitli kayıt üretir; sonradan revizyon yönetici onayıyla yeni revizyon olarak açılır.
- QR doğrulamada cevaplar reportFieldKey, itemId, optionId, kanıt hash ve audit kaydıyla izlenebilir.
