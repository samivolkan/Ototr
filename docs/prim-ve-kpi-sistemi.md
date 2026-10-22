# KPI ve Prim Yönetimi

Modül ana ERP içindeki `KPI ve Prim Yönetimi` menüsünden açılır. İlk sürüm yalnızca gölge hesaplama yapar; bordro, ödeme ve muhasebe kaydı üretmez.

## Onaylanan politika

- Gölge süre: kullanıma alındığı gün başlayan 3 ay.
- Gelir esası: KDV hariç net tahsilat.
- Hedef prim: aylık brüt temel ücretin role göre %15-%40'ı.
- Ödeme eğrisi: %60 altı 0; %100'de 1x; %120'de 1,5x; %140 ve üzerinde en fazla 2x.
- Finansal KPI tavanı %140, diğer KPI tavanı %120.
- Nitelikli ziyaret için tarih, galeri, yetkili, sonuç ve takip adımı zorunludur.
- Galeri kazanım atfı 30 gün; aktif portföy değerlendirmesi hareketli 90 gündür.
- Kaynak sahibi CRM'deki `gallery_owner_employee_id`, kapatan kişi randevu/iş emrindeki `sales_closer_employee_id` alanıdır. Teknik personel satış kapatan olarak otomatik atanmaz.
- Kaynak ve kapatan çalışan kredisi %50/%50; aynı kişiyse kredi %100'dür.
- Üretken galeri için ilk 60 günde iki tahsil edilmiş iş, iki farklı araç ve kendine yönlendirme kontrolü gerekir.
- Eksik veri sıfır sayılmaz; sonuç `Eksik Veri` olur.
- Hedefler aktif çalışma gününe göre orantılanır.
- Gölge sonuçlar Şube, Genel Merkez/İK ve Finans kontrolünden geçer.
- Canlı aktivasyon Genel Müdür + İK + Finans ortak onayı gerektirir.
- Gölge kayıtlar için başlangıç saklama hedefi iki yıldır; kesinleşmiş kayıtların süresi hukuk/KVKK veri kategorisi matrisine göre belirlenir.

## Maliyet ve canlıya geçiş

Rapor %100, %120 ve KPI tavanı (%131 / yaklaşık 1,775x) senaryolarını gösterir. Net tahsilat oranı sırasıyla en fazla %3, %4 ve %5; primin bayi faaliyet kârına etkisi en fazla %20 olmalıdır. Sınır aşılırsa ödeme sessizce kesilmez, plan yeniden tasarlanır.

Üç ay dolması tek başına aktivasyon sağlamaz. Veri tamamlılığı en az %95, atıf itirazı en fazla %3, beş iş gününde itiraz çözümü en az %90, doğrulanmamış satış en fazla %2 olmalı; maliyet, güvenlik, hukuk/KVKK ve son iki kapanış kriterleri geçmelidir. Supabase/PostgreSQL, RLS, sunucu tarafı hesaplama, hash'li snapshot, audit ve yedek/geri yükleme testi canlı aktivasyonun zorunlu kapısıdır.

İadeler 90 gün izlenir ve sonraki primde ayrı mahsup satırı olarak gösterilir; otomatik maaş kesintisi yapılmaz. Kalite göstergesi ilk gölge dönemde yalnızca izlenir. Mevsim katsayısı en az 12 aylık veri oluşmadan uygulanmaz. Genel Müdür kendi planının onayında yer almaz.

## Veri güvenliği

Canlı ve DEMO hesaplama ayrıdır. DEMO senaryosu bellekte tutulur ve kalıcı depoya yazılmaz. Mevcut prototipte plan ve audit kayıtları sürümlü localStorage anahtarlarında saklanır. PostgreSQL/Supabase geçişinde çalışan, organizasyon, plan sürümü, hedef, ölçüm olayı, kredi dağılımı, snapshot ve audit tabloları ayrı tutulmalı; erişim RLS ile backend seviyesinde uygulanmalıdır. Service-role veya başka gizli anahtar tarayıcıya konulmamalıdır.

## Sonraki entegrasyon

HR adapterı brüt temel ücret ve aktif çalışma gününü; finans adapterı KDV hariç tahsilat, iade ve kapanışı; CRM/iş emri adapterı galeri kaynağı, ziyaret, tamamlanmış ekspertiz ve atıf kayıtlarını harici kimlik ve tekilleştirme anahtarıyla sağlamalıdır. Canlı hesap ancak bu veri sözleşmeleri doğrulandıktan sonra kesinleştirilebilir.
