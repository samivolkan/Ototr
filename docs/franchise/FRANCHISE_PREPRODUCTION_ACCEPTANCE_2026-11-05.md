# OTOTR Franchise Üretim Öncesi Kabul Durumu

Karar: **NO_GO**

## Tamamlanan kanıtlar

- Tekil başvuru/franchise dosyası ve 14 aşamalı yaşam döngüsü
- 10 zorunlu kadro, özlük, Academy sertifikası ve yetki kilidi
- Eksik belge, tahsilat, görev veya personelde fail-closed açılış
- Maker–checker istisna akışı; talep eden kendi talebini onaylayamaz
- Hukuk, ruhsat ve %100 tahsilatın istisnaya kapalı olması
- Atomik şube, kullanıcı kapsamı ve 30/60/90 görev üretimi
- Supabase/PostgreSQL şeması, RLS, indeksler ve entegrasyon outbox tasarımı
- Departman adaptör sözleşmeleri ve yapılandırılmamış adaptörlerin görünür hata vermesi
- Supabase PostgreSQL 17 üzerinde migration, atomik aktivasyon, idempotency, outbox ve rollback yerel kabul testi
- E-posta, SMS, WhatsApp ve e-imza amaç/izin/şablon/idempotency sözleşmesi; sahte sağlayıcı ve log maskeleme testleri
- 16 ortak UAT senaryosu ve dokuz farklı sorumlu için departman bazlı maker-checker imza matrisi
- Departman görevlerinde en az yetki: çapraz departman okuma/yazma reddi ve değiştirilemez görev kapsamı
- Şube tipine göre parametrik zorunlu kadro ve İK–Academy–BT ayrık alan sahipliği
- Finans, Hukuk ve Operasyon kaynaklı dört değiştirilemez açılış kanıtı; ayrı maker–checker onayı olmadan şube kaydı reddi
- Sayaçtan bağımsız gerçek KVKK makbuzu ve şube tipine göre onaylı belge kataloğu doğrulaması
- Rol sahibi ve sıralı aşama geçişi; atlama/yanlış rol reddi ve değiştirilemez yaşam döngüsü geçmişi
- Kanıtlı 30/60/90 tamamlama, SLA görünümü ve yeniden açmada maker–checker
- Yedi boyutlu, kanıtlı ve rol ayrımlı aday puanlaması; skor yalnız öneri üretir, nihai karar bağımsız kurul maker–checker onayıdır
- Kurul sonrası skor revizyonunda eski kararın otomatik geçersizleşmesi ve yeniden bağımsız onay zorunluluğu
- 13 hedef sistem için 34 sürümlü departman olay sözleşmesi; alan minimizasyonu, zorunlu alan, sürüm ve hassas veri denetiminin worker ve PostgreSQL katmanlarında birlikte uygulanması
- Aday, bayi, denetçi ve tedarikçi için atama bazlı RLS; güvenli portal görünümü, persona–iş türü kilidi ve yalnız atanmış kullanıcının kontrollü işlem RPC'si
- On kanaldan idempotent başvuru alımı; tekil franchise dosyası, güvenli kaynak referansı, üç ayrı izin makbuzu ve ham kimlik/lead verisini saklamama kuralı
- Yayın kararı artık JSON üzerindeki `GO` etiketine güvenmez; 16 kapı, dokuz hosted staging kanıt özeti, dokuz bağımsız departman imzası, sabit release/rollback commitleri, rollback planı onayı ve süresi dolmamış değişiklik penceresini kodla yeniden hesaplar

## NO_GO kapıları

1. On üç departman adaptörü gerçek staging uçlarına bağlanıp bağımsız maker-checker probe kabulü almadı.
2. Gerçek e-imza, SMS, e-posta ve WhatsApp sağlayıcıları staging'de bağımsız kabul edilmedi; iki scheduler bilinçli olarak kapalı.
3. On altı insan UAT senaryosu ve dokuz farklı sorumlu imzası tamamlanmadı.
4. Release ve onun erişilebilir atası olan rollback commit sabitlenmedi; rollback planı onayı, değişiklik penceresi, Genel Müdür ve kullanıcı yayın onayı alınmadı.
5. Canlı `ototr.com/franchise` PHP kaynağına üç ayrı izin ve Edge intake paketi uygulanıp sentetik gönderim/temizlik kabulü yapılmadı.

Bu kapılar kapanmadan gerçek aday, çalışan, finans veya sözleşme verisi kullanılmaz ve üretim aktivasyonu yapılmaz.
