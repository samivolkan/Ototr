# Ruhsat AI Evaluation

Dataset splitleri `TRAIN`, `VALIDATION`, `GOLDEN_TEST` olmalıdır. Aynı ruhsatın crop, rotation, glare veya blur varyantları aynı `document_group` içinde tutulur ve farklı splitlere dağıtılamaz.

Ana kalite metriği `Critical False Accept Rate` değeridir. VIN, motor no, plaka veya model yılı exact match düşerse, ya da kritik false accept artarsa release fail sayılır. Genel F1 artışı bu kapıyı geçersiz kılamaz.

Çalıştırma:

```bash
dart tools/ruhsat_eval.dart expected.jsonl predicted.jsonl
```

Beklenen alan metrikleri: exact match, normalized exact match, missing rate. Üretim dashboard’u precision, recall, F1, character error rate, manual correction rate, Critical Field Perfect Rate, All Field Perfect Rate, Manual Review Rate, Auto Accept Rate ve Rescan Rate değerlerini aynı JSONL üzerinden genişletebilir.
