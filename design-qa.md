# Google Bağlantı Ayarları — Design QA

## Source of truth

- Referans: `C:\Users\SAMIVO~1\AppData\Local\Temp\codex-clipboard-dee86c70-4cf8-426b-89c9-34c74abf2c3b.png`
- Uygulama ekranı: `google-connections-implementation.png`
- Yan yana karşılaştırma: `design-qa-comparison.png`
- Test görünümü: `1488 × 1058` CSS piksel, DPR `1`
- Test durumu: Google Bağlantı Ayarları açık, 5 şube aktif, filtre yok, seçim yok

## Full-page comparison

Referanstaki yoğun tek tablo yapısı; başlık ve durum satırı, dört KPI, bilgi kartı, yeni şube formu, filtre çubuğu, dokuz tablo kolonu, beş şube satırı, sayfalama ve iki alt bilgi kartıyla yeniden kuruldu. Eski iki sütunlu kart görünümü kaldırıldı.

Mevcut OTOTR Google Yorum Merkezi yan menüsü ve OTOTR Ekspertiz logosu bilinçli olarak korundu. Referanstaki tüm ERP menüsünü kopyalamak bu modülün gezinme yapısını bozacağı için yalnızca sayfa gövdesi ve işlevsel tablo düzeni eşleştirildi.

## Focused evidence

- Tablo satırları kompakt tek listede ve referansla aynı içerik sırasındadır.
- Google hesap/grup ID ve mağaza kodları maskeli gösterilir; kopyalama düğmeleri bulunur.
- Nilüfer satırında kimlik doğrulama çağrısı, demo satırlarda düzenleme ve üç nokta işlem menüsü bulunur.
- Üç nokta menüsünde `Düzenle` ve `Kaldır` seçenekleri çalışır.
- Demo şubelerde son eşitleme metni doğru biçimde `Senkronizasyon bekliyor` gösterilir.
- Toplu seçim sonrası `Aktif yap`, `Pasif yap` ve `Kaldır` çubuğu açılır.

## Interaction verification

- Arama: `Gebze` sorgusunda görünür kayıt ve sayaç `1` oldu.
- Kaynak filtresi: `Demo` seçiminde `4` kayıt gösterildi.
- Aktif filtresi: Gebze pasife alındığında aktif-only görünümünden çıktı; pasifler açıldığında geri göründü; tekrar aktifleştirildi ve son durumda 5 aktif şube korundu.
- Filtre kalıcılığı: tam yeniden çizim sonrası `Gebze` araması ve aktif/pasif tercihi korundu.
- Seçim modeli: 1 satır seçildiğinde sayaç `1` ve toplu işlem çubuğu görünür oldu.
- Satır menüsü: `Kaldır` işlemi görünür ve erişilebilir olarak doğrulandı; veri silinmemesi için onay penceresi kabul edilmedi.
- Düzenleme iptali: Gebze hesap ID alanı geçici olarak değiştirildi; `İptal` sonrası özgün değer eksiksiz geri yüklendi.
- Eski kart renderer sayısı `0`, yeni tablo renderer sayısı `1`, görünür satır sayısı `5` olarak doğrulandı.
- Yürütülebilir 7 inline script sözdizimi kontrolünden geçti; `git diff --check` temiz geçti.

## Comparison history

1. İlk yapıdaki iki sütunlu şube kartları kaldırıldı.
2. Tek tablo renderer, filtreler ve toplu işlemler eklendi.
3. Eski CSS'in tabloyu yeniden kartlara bölmesi engellendi.
4. Aktif-only filtresinin ilk açılışta uygulanmaması düzeltildi.
5. Pasif şubenin senkronize olabilmesi engellendi.
6. OAuth bağlı olduğu halde şube eşitlemesi başarısızsa yanlış `Bağlı` gösterimi engellendi.
7. Gizlenen seçili satırların toplu işlemden etkilenmesi engellendi.
8. Kayıt hatalarında yanlış başarı bildirimi kaldırıldı.
9. Referans ölçüsünde son görsel karşılaştırma yapıldı.

## Known environment note

Tarayıcı konsolunda sayfanın bu özelliğine ait olmayan `MutationObserver` kaynaklı ortam hataları görüldü. Google bağlantı renderer veya olay kodunda `MutationObserver` kullanılmıyor; yukarıdaki etkileşim testleri bu hatalardan etkilenmedi.

## Final result

passed
