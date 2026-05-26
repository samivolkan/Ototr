# 2026-05-23 Smart VIN Work Orders Migration

Bu prototipte kalici veri `localStorage` mock backend uzerinde tutulur. Uygulama acilisinda `smart-vin-v1` migration anahtariyla eski is emirlerine VIN alanlari geri doldurulur. Gercek backend'e geciste asagidaki alanlar mevcut `dealer_work_orders` ve `vehicles` tablosuna ayni naming convention ile eklenmelidir.

## Alanlar

- `vin_normalized` varchar(17), unique nullable
- `vin_validation_status` varchar(32)
- `vin_decode_status` varchar(64)
- `vin_decoded_make` varchar(80)
- `vin_decoded_model` varchar(120)
- `vin_decoded_year` integer
- `vin_decoded_body_class` varchar(120)
- `vin_decoded_manufacturer` varchar(160)
- `vin_decoded_source` varchar(64)
- `vin_confidence_score` integer default 0
- `vin_manual_review_required` boolean default false
- `vin_manual_review_approved` boolean default false
- `vin_manual_review_approved_by` varchar(120)
- `vin_decoded_at` timestamp nullable

## Kurallar

- `vin_normalized` 17 karakter VIN standardina gore tutulur.
- Duplicate kontrolu `vin_normalized` uzerinden yapilir.
- Decoder ulasilamazsa kayit akisi bloklanmaz; `vin_decode_status=VIN_FORMAT_VALID_DECODER_UNAVAILABLE` yazilir.
- Uyum skoru dusukse kayit engellenmez, `vin_manual_review_required=true` olarak saklanir.
