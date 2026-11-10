# Şube Sağlık ve Erken Uyarı

ERP dashboard’ındaki eski statik güven skoru, sekiz alanlı açıklanabilir sağlık modeline dönüştürüldü. Ekran; sağlık puanını, veri yeterliliğini, gelecek 30 gün risk olasılığını, tahmin kaynağını ve skoru en fazla düşüren üç nedeni birlikte gösterir.

## Güvenlik ve karar ilkeleri

- BigQuery ML çıktısı ancak `modelVersion` ve geçerli tahmin kaydı varsa “BigQuery ML” etiketiyle gösterilir.
- Model yokken sonuç “Kural bazlı ön izleme” olarak işaretlenir; AI iddiası yapılmaz.
- Tahmin tek başına yaptırım, prim, fesih veya personel kararı üretmez. Yetkili kullanıcı kanıtları inceler.
- Şube yöneticisi yalnız kendi şubesini; CEO ve genel müdür ağ görünümünü okuyabilir.
- Ham müşteri/personel verisi model tablosuna taşınmaz. Günlük toplulaştırılmış skorlar ve gerekçe özeti tutulur.

## Canlıya geçiş kapıları

1. Kaynak eşlemesi ve veri sözlüğü onayı: Operasyon, CRM, Google, Kalite, Finans, İK, Hukuk, Pazarlama.
2. En az 6 aylık, tercihen 12 aylık günlük şube geçmişi; her eğitim satırında veri yeterliliği en az %70.
3. Zaman bazlı train/test ayrımı; ROC-AUC yanında precision/recall, calibration ve şube/bölge sapma analizi.
4. `ML.EXPLAIN_PREDICT` nedenlerinin alan sahiplerince doğrulanması.
5. 30 gün gölge çalışma: sonuç görünür, otomatik aksiyon kapalı.
6. Model kartı, sürüm, eğitim aralığı, eşikler, geri alma ve veri sorumlusu onayı.

Migration doğrudan tarayıcı erişimini kapatır. `erp_branch_health_latest` RPC’si aktif ERP hesabını ve şube kapsamını her çağrıda doğrular.
