# Ruhsat OCR 0.3.3 doğrulama raporu

19 Ekim 2026. Windows, aynı yerel CPU ve mevcut ONNX modelleri. Gerçek belge çıkarımı ağ bağlantısı engellenerek yapıldı. Bu rapor geliştirme ölçümüdür; bağımsız test doğruluğu veya üretim kapasitesi garantisi değildir.

## Kapsam

51 ruhsat fotoğrafının tamamı son kaynak koduyla iki kez okundu: 102 okuma. Dosya SHA256 değerleri ve kaynak kod parmak izi doğrulandı. Doğru değer karşılaştırması 48 belgede 827 araç alanını kapsar; bu etiketler asistan tarafından görsel olarak hazırlanmıştır ve insan onaylı değildir. Kalan üç zor belgede güvenilir beklenen değer seti yoktur; bu belgeler hız ve tekrar kararlılığı ölçümünde vardır, doğruluk paydasında yoktur. Fotoğraflar, gerçek alan değerleri ve sahip bilgileri bu raporda veya teslim paketinde bulunmaz.

## Aynı bilgisayardaki ölçüm

| Sürüm / tur | Okuma | Medyan saniye | p95 saniye | İlk tur tam eşleşme |
|---|---:|---:|---:|---:|
| 0.3.2 ilk ölçüm | 102 | 15.741 | 23.781 | 685/827 |
| 0.3.2 tekrar ölçüm | 51 | 15.816 | 25.210 | 685/827 |
| 0.3.3 son aday | 102 | 14.240 | 24.207 | 709/827 |

Tekrarlar doğruluk paydasını büyütmez. İlk ölçüm ve tekrar ölçümündeki süre farkı bilgisayar yükü/ısınma değişkenliğini gösterir; başka sunucuya taşınırken yeniden ölçülmelidir. Model başlatma süresi belge sürelerine dahil değildir.

Son adayda ilk sürüme göre 24 beklenen alan düzeldi; bilinen doğru alanlarda gerileme 0. Ara geliştirme adayında doğrulanmış kazanımlara göre gerileme de 0. İki son tur arasında değişen araç değeri sayısı 0.

Bu sayılar tüm belgelerin tamamen okunduğu anlamına gelmez. Son adayda beklenen değerle birebir eşleşmeyen 118 alan vardır; Türkçe yazım, noktalama, bulanıklık, kesik hücreler ve etiket hataları bu toplamı etkileyebilir. Eksik/çelişkili alanlar fotoğrafla kontrol edilir; güven puanı kalibre edilmiş doğruluk olasılığı değildir.

## Kabul kontrolleri

- 143 Python ve 25 JavaScript testi geçti: alan eşleme, çok satırlı alanlar, hücre sınırları, yakınlaştırma kurtarması, veri gizliliği, API ve ERP aktarım sınırları.
- Kurgusal belgedeki 23 beklenen değer eşleşti. Otomatik 0/90/180/270 derece, yön kontrolü kapalı dik belge, elle döndürme, yana dönük belgede uyarı ve boş belge olmak üzere sekiz gerçek çıkarım senaryosu geçti.
- Kullanıcının Renault belgesinde 17/17 beklenen araç alanı eşleşti. Şasi, motor numarası, cins ve yakıt için alan yeniden okumalarında beklenen değer adaylar arasında bulundu; dört işlem de kullanıcı onayı gerektiriyor.
- Son kaynak parmak izi: `8f1a286e6acb6b93a0b382d039954182357fc4ae2c94583ea33678caff472de9`. Gerçek koleksiyon ve ayrıntılı yerel sonuçlar Git kapsamı dışındadır.

## Hatalı alanlarda bölgesel yeniden okuma

Sekiz farklı geliştirme fotoğrafında, ilk okumada yanlış olan fakat belge üzerinde kanıt kutusu bulunan birer araç alanı ayrıca sınandı. Sekiz denemenin dördünde beklenen doğru değer yeniden okuma adayları arasına girdi; dördünde bulunamadı. Bölgesel işlemler 0,43–1,49 saniye sürdü ve tamamı kullanıcı onayı gerektirdi. Bu sonuç 709/827 ilk okuma sayısına eklenmedi.

Bu küçük seçilmiş grup rastgele veya bağımsız bir test değildir; kanıt kutusu olmayan eksik alanları kapsamaz. Bazı işlemler birden fazla aday ürettiği için adayın bulunması otomatik olarak doğru adayın seçildiği anlamına gelmez. Kullanıcı fotoğrafla karşılaştırmalı; gerekli durumda alanı elle düzeltmeli veya daha net fotoğraf yüklemelidir.

## Seçilen ve elenen değişiklikler

Türkçe açıklama eşleme, aynı hücrede satır devamı, eğik başlık/değer kutuları, ağırlık hücresi sınırları ve gözlenen alternatifleri koruma iyileştirildi. Ayrıntılı okumada yakınlaştırmadan sonra eksik kalan araç alanı, tam fotoğraftaki ikinci model kanıtıyla kurtarılabilir; değer üzerine yazılmaz, sahip bilgisi kurtarılmaz ve kontrol zorunludur. Bu koruma zor belgelerde süreyi artırabilir.

Varsayılan CPU paralelliği en fazla altı mantıksal işlemci oldu; `OTOTR_OCR_THREADS` ile 1–16 arasında değiştirilebilir. Daha düşük çözünürlük, hızlı mod, farklı yön bulma ve kontrast deneyleri de ölçüldü. Hız kazanırken bilinen doğru alanı bozan veya toplam sürede anlamlı avantaj sağlamayan deneyler varsayılan yapılmadı. Belge başına örnek ezberi veya model ağırlığı eğitimi yapılmadı.

## Teslim sınırları

GitHub Pages arayüzü OCR motorunu kendi başına çalıştırmaz. Mevcut geçici HTTPS bağlantısı bu bilgisayardaki OCR servisine gider; bilgisayar kapalıyken okuma çalışmaz. Kalıcı sunucuya geçiş ve canlı oto-tr.com değişikliği yapılmadı. ERP alan aktarımının otomatik testleri vardır; mevcut bayi giriş/yapılandırma sınırı nedeniyle canlı iş emri kalıcı kaydı uçtan uca doğrulanmış sayılmaz.

Yeni belge yüklemek veya hata geri bildirimi vermek modeli kendiliğinden eğitmez. İnsan tarafından onaylı etiketler, araç/belge grubuna göre ayrılmış bağımsız test kümesi ve ayrıca eğitilebilir model ağırlıkları gerekir. Kurulum ve entegrasyon için [yazılımcı teslim belgesine](YAZILIMCI_TESLIM.md) bakın.
