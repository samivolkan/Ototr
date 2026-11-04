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

## NO_GO kapıları

1. Migration staging Supabase projesinde çalıştırılmadı; rollback kanıtı yok.
2. ERP kimliği ile `app_metadata.role` ve `branch_ids` bağlanmadı.
3. Özel Storage bucket, saklama süresi ve imzalı URL politikası kurulmadı.
4. Finans, Hukuk, İK, Academy, BT ve Görev Merkezi adaptörleri gerçek staging uçlarına bağlanmadı.
5. E-imza, SMS, e-posta ve WhatsApp sağlayıcıları seçilmedi/test edilmedi.
6. Eşzamanlı aktivasyon, tekrar deneme, outbox dead-letter ve geri yükleme testleri yapılmadı.
7. Departman sahiplerinin UAT imzaları alınmadı.
8. Canlı rollout/rollback kararı onaylanmadı.

Bu kapılar kapanmadan gerçek aday, çalışan, finans veya sözleşme verisi kullanılmaz ve üretim aktivasyonu yapılmaz.
