# İnsan düzeltmelerinden geliştirme

Yerel panelde “Kontrol ettim” ile onaylanan seçili araç alanları otomatik olarak `/api/admin/feedback` adresine gönderilir. Sunucu modunda yönetim anahtarı gerekir. Açık test tünelinde yönetim erişimi kapalı kalır; burada kayıt yapılmış gibi gösterilmez.

Her okuma kimliği için son onaylı durum saklanır. Aynı okumayı tekrar göndermek sayıları çoğaltmaz. Alan yeniden düzenlenince onayı kalkar, yeni geri bildirim eski onayı geri çeker. Hiç onay kalmazsa ilgili inceleme silinir. İstekler sıralanır; ağ hatasında kullanıcıya kayıt hatası gösterilir. Sayfa kapanmadan önce kayıt mesajını bekleyin; fotoğraf ve değerler tarayıcıda kalıcı kuyruğa alınmaz.

Tüm araç alanları için düzeltme/eksiklik sayısı, güven sinyali, yöntem, sürüm ve fotoğraf koşulu tutulur. Serbest metin, plaka, şasi, motor/belge numarası, sahip bilgisi ve fotoğraf saklanmaz. Cins alanında kod ve açıklama eşleşiyorsa yalnız AA–AG kodu geliştirme hedefi olarak tutulur. Kod/açıklama çelişkisi hedef üretmez. Bilinmeyen değerler genel düzeltme istatistiğinde kalır.

Kalite paneli cins hedeflerinin sayılarını “değerlendirme bekliyor” olarak gösterir. Sayılar benzersiz araç değil, inceleme sayısıdır; aynı belge tekrar okutulursa yeni inceleme olabilir.

## Yayın öncesi geliştirme akışı

1. Gerçek belge istatistiklerinde en çok düzeltilen alan ve koşulları belirleyin; kurgusal sonuçları ayrı tutun.
2. İzinli yerel koleksiyonda ilgili örnekleri insan tarafından doğrulayın. Anonim istatistikler tek başına OCR modelini eğitmeye yeterli değildir.
3. Çıkarım veya sözlük değişikliğini geliştirme kümesinde deneyin. Tek kullanıcı düzeltmesini genel bir otomatik değiştirme kuralına çevirmeyin.
4. Aynı araca ait örnekleri ayırmadan oluşturulmuş bir test kümesini bağımsız saymayın. Ayrı tutulan doğrulama belgelerinde alan doğruluğu, gerileme ve süreyi ölçün.
5. Başarılı adayı sürümleyip yayınlayın. Model ağırlığı eğitimi ayrı, açık bir işlem olmalıdır.

Bu değişiklik eğitim verisi toplandığını veya modelin otomatik eğitildiğini iddia etmez. Gövde kodu hedefleri ve hata istatistikleri sonraki iyileştirmeyi seçmek içindir.
