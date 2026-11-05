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
- 12 ortak UAT senaryosu ve departman bazlı maker-checker imza matrisi
- Departman görevlerinde en az yetki: çapraz departman okuma/yazma reddi ve değiştirilemez görev kapsamı
- Şube tipine göre parametrik zorunlu kadro ve İK–Academy–BT ayrık alan sahipliği
- Finans, Hukuk ve Operasyon kaynaklı dört değiştirilemez açılış kanıtı; ayrı maker–checker onayı olmadan şube kaydı reddi
- Sayaçtan bağımsız gerçek KVKK makbuzu ve şube tipine göre onaylı belge kataloğu doğrulaması
- Rol sahibi ve sıralı aşama geçişi; atlama/yanlış rol reddi ve değiştirilemez yaşam döngüsü geçmişi
- Kanıtlı 30/60/90 tamamlama, SLA görünümü ve yeniden açmada maker–checker

## NO_GO kapıları

1. Migration ve rollback yerel Supabase PostgreSQL 17 üzerinde geçti; hosted staging projesinde henüz çalıştırılmadı.
2. ERP kimliği ile `app_metadata.franchise_role` ve `franchise_branch_ids` hosted staging kullanıcılarına bağlanmadı.
3. Özel Storage bucket ve saklama politikası yerelde geçti; hosted staging Storage API ve imzalı URL akışı doğrulanmadı.
4. Finans, Hukuk, İK, Academy, BT ve Görev Merkezi adaptörleri gerçek staging uçlarına bağlanmadı.
5. Ortak sağlayıcı sözleşmesi ve sahte sağlayıcı testleri geçti; gerçek e-imza, SMS, e-posta ve WhatsApp sağlayıcıları seçilip staging'de test edilmedi.
6. Yerel idempotency/outbox/rollback testleri geçti; hosted staging eşzamanlılık, dead-letter ve geri yükleme tatbikatı yapılmadı.
7. Departman sahiplerinin UAT imzaları alınmadı.
8. Canlı rollout/rollback kararı onaylanmadı.

Bu kapılar kapanmadan gerçek aday, çalışan, finans veya sözleşme verisi kullanılmaz ve üretim aktivasyonu yapılmaz.
