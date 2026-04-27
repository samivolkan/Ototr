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

### inspection_reports

- id
- branch_id
- appointment_id
- customer_id
- vehicle_id
- expert_user_id
- report_no
- score
- risk_level
- result_summary
- pdf_url
- public_link
- locked_at
- created_at

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
- Bir rapor randevudan dogar.
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
