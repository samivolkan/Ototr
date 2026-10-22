# KPI ve Prim Yönetimi

Modül ana ERP içindeki `KPI ve Prim Yönetimi` menüsünden açılır. İlk sürüm yalnızca gölge hesaplama yapar; bordro, ödeme ve muhasebe kaydı üretmez.

## Onaylanan politika

- Gölge süre: kullanıma alındığı gün başlayan 3 ay.
- Gelir esası: KDV hariç net tahsilat.
- Hedef prim: aylık brüt temel ücretin role göre %15-%40'ı.
- Ödeme eğrisi: %60 altı 0; %100'de 1x; %120'de 1,5x; %140 ve üzerinde en fazla 2x.
- Finansal KPI tavanı %140, diğer KPI tavanı %120.
- Nitelikli ziyaret için tarih, galeri, yetkili, sonuç ve takip adımı zorunludur.
- Atıf süresi 30 gün; kaynak ve kapatan çalışan kredisi %50/%50.
- Eksik veri sıfır sayılmaz; sonuç `Eksik Veri` olur.
- Hedefler aktif çalışma gününe göre orantılanır.
- Gölge sonuçlar Şube, Genel Merkez/İK ve Finans kontrolünden geçer.
- Canlı aktivasyon Genel Müdür + İK + Finans ortak onayı gerektirir.
- Snapshot ve audit kayıtları 10 yıl saklanır.

## Veri güvenliği

Canlı ve DEMO hesaplama ayrıdır. DEMO senaryosu bellekte tutulur ve kalıcı depoya yazılmaz. Mevcut prototipte plan ve audit kayıtları sürümlü localStorage anahtarlarında saklanır. PostgreSQL/Supabase geçişinde çalışan, organizasyon, plan sürümü, hedef, ölçüm olayı, kredi dağılımı, snapshot ve audit tabloları ayrı tutulmalı; erişim RLS ile backend seviyesinde uygulanmalıdır. Service-role veya başka gizli anahtar tarayıcıya konulmamalıdır.

## Sonraki entegrasyon

HR adapterı brüt temel ücret ve aktif çalışma gününü; finans adapterı KDV hariç tahsilat, iade ve kapanışı; CRM/iş emri adapterı galeri kaynağı, ziyaret, tamamlanmış ekspertiz ve atıf kayıtlarını harici kimlik ve tekilleştirme anahtarıyla sağlamalıdır. Canlı hesap ancak bu veri sözleşmeleri doğrulandıktan sonra kesinleştirilebilir.
