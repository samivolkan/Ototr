# Hedef kapsamı geliştirme planı

Mevcut canlı kapsam Bursa Nilüfer; aylık şube hedefleri sürüm denetimiyle kaydedilir. Bu değişiklikte genel merkez veya bölge hedefi uydurulmaz, mevcut kayıtlar taşınmaz.

## Gelecek veri sözleşmesi
- Kapsam: headquarters / region / branch; kapsam kimliği, takvim ayı, metrik (yorum adedi), hedef, sürüm ve onay durumu.
- Şube hedefleri aşağıdan yukarıya toplanır. Genel merkez ve bölgenin bağımsız hedefi ayrı tutulur; alt hedeflerle birlikte toplanarak çift sayılmaz.
- Kartta açıkça “atanan hedef” ve “alt birimlerin hedef toplamı” ayrılır. Gerçekleşen kayıtlar benzersiz Google yorum kimliğiyle ve aynı tarih/kapsam filtresiyle hesaplanır.
- Taslak → yetkili onayı → yürürlük akışı, denetim geçmişi ve iyimser sürüm kilidi gerekir. Yönetici kapsamı sunucuda doğrulanır.
- Demo, pasif ve kurulum şubeleri canlı toplamdan dışlanır. Eksik hedef sıfır değildir.

## Uygulama sırası
1. Kapsam ve yetki modeli/migrasyon; mevcut şube verisinin uyumluluğu.
2. GM → bölge → şube seçici; aynı KPI/ilerleme kartlarıyla detay açma.
3. Hedef dağıtımı, onay, sapma ve toplulaştırma testleri.
4. Ayrı canlı kabul testi sonrası aktivasyon.

Bu sürüm yalnız ortak kart sunumunu hazırlar; yeni hedef seviyelerinin backend işlemleri henüz etkin değildir.
