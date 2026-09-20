# Ruhsat AI Data Intake

Ham ruhsat fotoğrafları kişisel veri içerebilir. Bu nedenle raw görseller public repo içine konmaz ve GitHub'a pushlanmaz. Görseller yerel veya private storage alanında kalır; repo yalnızca hash, split ve doğrulanmış etiket manifestlerini taşır.

Hazırlama:

```bash
dart tools/ruhsat_dataset_prepare.dart C:\private\ruhsatlar C:\private\ruhsat-dataset-v1
```

Çıktılar:

- `manifest.jsonl`: local path, SHA-256, document group, split ve boş field şablonu.
- `labels.csv`: insan doğrulaması için tablo şablonu.

Kurallar:

- Aynı ruhsatın crop, blur, glare, rotate veya page varyantları aynı `document_group` içinde kalır; farklı splitlere düşmez.
- Ground truth sadece insan doğrulanmış etiketlerden oluşur.
- TCKN, açık adres, sahip adı ve telefon etiketlenmez.
- VIN, motor no, plaka ve model yılı kritik alanlardır; bu alanlarda false accept release blocker sayılır.
- Eğitim döngüsü önce parser/prompt/validator candidate üretir, sonra `tools/ruhsat_eval.dart` ile `GOLDEN_TEST` üzerinde kapıdan geçer.

Önerilen ilk set:

- En az 100 modern ruhsat.
- En az 50 eski ruhsat.
- En az 20 düşük ışık/parlama/blur örneği.
- En az 20 iki sayfalı örnek.
- Her örnek için VIN ve motor no insan tarafından görüntüden çift kontrol edilmeli.
