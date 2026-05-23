# Veri Modeli Taslagi

Bu taslak, ilk gercek ERP/CRM surumu icin ana tablolarin omurgasidir.

## Ana varliklar

### users

- id
- name
- email
- phone
- role
- branch_id
- status
- created_at

Roller:

- CEO
- Genel mudur
- Franchise satis
- Operasyon
- Kalite
- Finans
- Hukuk
- Pazarlama
- Sube muduru
- Eksper

### branches

- id
- code
- name
- city
- district
- region
- status
- manager_user_id
- opening_date
- google_rating
- nps
- quality_score
- risk_level
- created_at

### customers

- id
- type
- name
- phone
- email
- city
- source
- marketing_permission
- notes
- created_at

Musteri tipleri:

- Bireysel
- Kurumsal
- Galeri
- Filo
- Franchise adayi

### vehicles

- id
- customer_id
- plate
- vin
- vin_normalized
- vin_validation_status
- vin_decode_status
- vin_decoded_make
- vin_decoded_model
- vin_decoded_year
- vin_decoded_body_class
- vin_decoded_manufacturer
- vin_decoded_source
- vin_confidence_score
- vin_manual_review_required
- vin_decoded_at
- brand
- model
- year
- km
- fuel_type
- created_at

### appointments

- id
- branch_id
- customer_id
- vehicle_id
- package_id
- appointment_at
- status
- source
- assigned_user_id
- notes
- created_at

Durumlar:

- Bekliyor
- Geldi
- Devam ediyor
- Tamamlandi
- No-show
- Iptal

### expertise_cases

Ekspertiz, sistemin ana veri kaynagidir. Randevudan dogar ama sadece PDF raporu degildir; arac kabul, tablet kontrol, usta notu, fotograf, olcum, kalite onayi, teslim, sikayet, garanti ve hukuk kayitlarini birbirine baglar.

- id
- branch_id
- dealer_id
- appointment_id
- customer_id
- vehicle_id
- report_no
- work_order_no
- package_id
- status
- risk_level
- overall_result
- report_quality_score
- customer_summary
- opened_at
- inspection_started_at
- inspection_completed_at
- report_approved_at
- report_published_at
- delivered_at
- created_at

Alt tablolar:

- work_orders
- inspection_tasks
- inspection_items
- inspection_results
- body_paint_results
- measurements
- obd_scans
- media_assets
- report_documents
- report_revisions
- report_delivery_events
- warranty_records
- expertise_disputes

Detayli tasarim: `docs/ekspertiz-data-backbone-v1.md`

### leads

- id
- type
- name
- phone
- city
- source
- stage
- score
- budget
- owner_user_id
- next_action
- next_action_at
- notes
- created_at

Lead tipleri:

- Franchise adayi
- Kurumsal musteri
- Filo anlasmasi
- Galeri partneri

### franchise_applications

- id
- lead_id
- city
- district
- investment_budget
- business_experience
- location_status
- financial_score
- character_score
- brand_fit_score
- decision_status
- created_at

### finance_transactions

- id
- branch_id
- type
- amount
- currency
- period
- due_date
- paid_at
- status
- notes
- created_at

Tipler:

- Ciro
- Royalty
- Reklam katkisi
- Yazilim lisansi
- Egitim geliri
- Gider

### quality_audits

- id
- branch_id
- audit_type
- score
- finding
- severity
- owner_user_id
- action_plan
- due_date
- closed_at
- created_at

### support_tickets

- id
- branch_id
- customer_id
- report_id
- title
- category
- severity
- status
- sla_due_at
- owner_user_id
- root_cause
- resolution
- created_at

### academy_courses

- id
- title
- audience
- certification_name
- status
- created_at

### academy_enrollments

- id
- course_id
- user_id
- branch_id
- progress
- exam_score
- certificate_status
- completed_at

## Iliskiler

- Bir subenin cok kullanicisi, randevusu, raporu, finans kaydi ve kalite denetimi olur.
- Bir musteri cok arac ve cok randevuya sahip olabilir.
- Bir randevu bir araca, bir musterine, bir subeye ve bir pakete baglanir.
- Bir randevu gelise dondugunde `expertise_cases` kaydi acilir; rapor, tablet kontrolu, fotograf, olcum, teslim ve itiraz kayitlari bu ana dosyanin altinda tutulur.
- Bir franchise adayi once `leads`, sonra uygun bulunursa `franchise_applications` kaydina donusur.
- Kalite, kriz ve finans kayitlari CEO kokpitine alarm olarak akar.

## Ilk API endpointleri

- `GET /dashboard/summary`
- `GET /branches`
- `GET /branches/:id`
- `GET /customers`
- `POST /customers`
- `GET /appointments`
- `POST /appointments`
- `GET /leads`
- `POST /leads`
- `PATCH /leads/:id/stage`
- `GET /finance/royalties`
- `GET /quality/audits`
- `GET /tickets`
- `POST /tickets`

## Kritik tasarim karari

Her kayitta `created_by`, `updated_by`, `created_at`, `updated_at` ve mumkunse `audit_log` tutulmali. Franchise zincirinde sadece son durum degil, kimin neyi ne zaman degistirdigi de onemlidir.
