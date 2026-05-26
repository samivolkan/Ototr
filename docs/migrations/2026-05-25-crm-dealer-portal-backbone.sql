-- OTOTR CRM and dealer portal backbone.
-- Target: PostgreSQL / Supabase
-- Purpose: CRM pipeline, franchise application flow, dealer portal operations,
-- finance, quality, support, academy and audit layers on top of the existing
-- expertise/work-order backbone.

create extension if not exists pgcrypto;

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (
    role in (
      'CEO',
      'GENERAL_MANAGER',
      'REGIONAL_MANAGER',
      'BRANCH_MANAGER',
      'RECEPTION_STAFF',
      'INSPECTION_TECHNICIAN',
      'TECHNICAL_SUPERVISOR',
      'QUALITY_AUDITOR',
      'FINANCE',
      'LEGAL',
      'CRM_AGENT',
      'FRANCHISE_SALES',
      'OPERATIONS',
      'MARKETING',
      'HR',
      'ACADEMY_MANAGER',
      'SUPPORT_AGENT',
      'DEALER_OWNER',
      'DEALER_STAFF'
    )
  );

alter table public.branches
  add column if not exists branch_type text not null default 'FRANCHISE',
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists manager_user_id uuid references public.app_users(id),
  add column if not exists owner_user_id uuid references public.app_users(id),
  add column if not exists opening_date date,
  add column if not exists address text,
  add column if not exists timezone text not null default 'Europe/Istanbul',
  add column if not exists tax_office text,
  add column if not exists tax_number text,
  add column if not exists legal_company_name text,
  add column if not exists google_place_id text,
  add column if not exists google_profile_url text,
  add column if not exists google_rating numeric(3,2),
  add column if not exists google_review_count integer not null default 0,
  add column if not exists nps_score numeric(5,2),
  add column if not exists quality_score numeric(5,2),
  add column if not exists risk_level text not null default 'LOW',
  add column if not exists portal_enabled boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.branches
  drop constraint if exists branches_branch_type_check,
  drop constraint if exists branches_status_check,
  drop constraint if exists branches_risk_level_check,
  drop constraint if exists branches_google_rating_check,
  drop constraint if exists branches_score_check;

alter table public.branches
  add constraint branches_branch_type_check
  check (branch_type in ('CENTER', 'FRANCHISE', 'COMPANY_OWNED', 'MOBILE')),
  add constraint branches_status_check
  check (status in ('CANDIDATE', 'ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED')),
  add constraint branches_risk_level_check
  check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  add constraint branches_google_rating_check
  check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  add constraint branches_score_check
  check (
    (nps_score is null or (nps_score >= -100 and nps_score <= 100))
    and (quality_score is null or (quality_score >= 0 and quality_score <= 100))
  );

alter table public.customers
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists owner_user_id uuid references public.app_users(id),
  add column if not exists customer_type text not null default 'INDIVIDUAL',
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists source text,
  add column if not exists company_name text,
  add column if not exists tax_number text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.customers
  drop constraint if exists customers_customer_type_check,
  drop constraint if exists customers_status_check;

alter table public.customers
  add constraint customers_customer_type_check
  check (customer_type in ('INDIVIDUAL', 'CORPORATE', 'GALLERY', 'FLEET', 'FRANCHISE_CANDIDATE')),
  add constraint customers_status_check
  check (status in ('ACTIVE', 'PASSIVE', 'BLOCKED', 'MERGED'));

alter table public.vehicles
  add column if not exists branch_id uuid references public.branches(id),
  add column if not exists owner_user_id uuid references public.app_users(id),
  add column if not exists color text,
  add column if not exists body_type text,
  add column if not exists first_registration_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.user_region_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  region text not null,
  is_active boolean not null default true,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, region)
);

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  lead_no text not null unique default (
    'LEAD-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  lead_type text not null,
  source text not null default 'MANUAL',
  stage text not null default 'NEW',
  status text not null default 'OPEN',
  priority text not null default 'NORMAL',
  score integer not null default 0 check (score between 0 and 100),
  branch_id uuid references public.branches(id),
  customer_id uuid references public.customers(id),
  owner_user_id uuid references public.app_users(id),
  full_name text not null,
  phone text not null,
  email text,
  company_name text,
  city text,
  district text,
  vehicle_interest text,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  expected_close_at date,
  next_action text,
  next_action_at timestamptz,
  lost_reason text,
  converted_customer_id uuid references public.customers(id),
  converted_branch_id uuid references public.branches(id),
  converted_at timestamptz,
  tags jsonb not null default '[]'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_leads_lead_type_check
    check (lead_type in ('SERVICE', 'FRANCHISE', 'CORPORATE', 'FLEET', 'GALLERY', 'COMPLAINT')),
  constraint crm_leads_stage_check
    check (stage in (
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'OFFER_SENT',
      'FOLLOW_UP',
      'NEGOTIATION',
      'WON',
      'LOST'
    )),
  constraint crm_leads_status_check
    check (status in ('OPEN', 'WON', 'LOST', 'CANCELLED')),
  constraint crm_leads_priority_check
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  constraint crm_leads_budget_check
    check (
      budget_min is null
      or budget_max is null
      or budget_min <= budget_max
    )
);

alter table public.appointments
  add column if not exists crm_lead_id uuid references public.crm_leads(id),
  add column if not exists appointment_type text not null default 'EXPERTISE',
  add column if not exists check_in_at timestamptz,
  add column if not exists cancelled_reason text,
  add column if not exists created_by uuid references public.app_users(id),
  add column if not exists updated_by uuid references public.app_users(id);

alter table public.appointments
  drop constraint if exists appointments_appointment_type_check;

alter table public.appointments
  add constraint appointments_appointment_type_check
  check (appointment_type in ('EXPERTISE', 'CONSULTATION', 'CORPORATE_VISIT', 'FRANCHISE_MEETING'));

alter table public.expertise_cases
  add column if not exists crm_lead_id uuid references public.crm_leads(id),
  add column if not exists portal_visible boolean not null default true,
  add column if not exists customer_rating integer,
  add column if not exists customer_feedback text;

alter table public.expertise_cases
  drop constraint if exists expertise_cases_customer_rating_check;

alter table public.expertise_cases
  add constraint expertise_cases_customer_rating_check
  check (customer_rating is null or (customer_rating >= 1 and customer_rating <= 5));

create table if not exists public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  branch_id uuid references public.branches(id),
  owner_user_id uuid references public.app_users(id),
  opportunity_type text not null,
  stage text not null default 'DISCOVERY',
  status text not null default 'OPEN',
  title text not null,
  amount numeric(14,2),
  currency text not null default 'TRY',
  probability integer not null default 0 check (probability between 0 and 100),
  expected_close_date date,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_opportunities_type_check
    check (opportunity_type in ('SERVICE_PACKAGE', 'FLEET_CONTRACT', 'GALLERY_PARTNERSHIP', 'FRANCHISE_DEAL')),
  constraint crm_opportunities_stage_check
    check (stage in ('DISCOVERY', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON', 'LOST')),
  constraint crm_opportunities_status_check
    check (status in ('OPEN', 'WON', 'LOST', 'CANCELLED'))
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  opportunity_id uuid references public.crm_opportunities(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  branch_id uuid references public.branches(id),
  owner_user_id uuid references public.app_users(id),
  activity_type text not null,
  channel text not null default 'NOTE',
  direction text not null default 'OUTBOUND',
  title text not null,
  body text,
  outcome text,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_activities_type_check
    check (activity_type in ('CALL', 'WHATSAPP', 'SMS', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'VISIT')),
  constraint crm_activities_channel_check
    check (channel in ('PHONE', 'WHATSAPP', 'SMS', 'EMAIL', 'IN_PERSON', 'SYSTEM', 'NOTE')),
  constraint crm_activities_direction_check
    check (direction in ('INBOUND', 'OUTBOUND', 'INTERNAL'))
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  task_no text not null unique default (
    'TASK-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  branch_id uuid references public.branches(id),
  lead_id uuid references public.crm_leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  opportunity_id uuid references public.crm_opportunities(id) on delete set null,
  expertise_case_id uuid references public.expertise_cases(id) on delete set null,
  assigned_user_id uuid references public.app_users(id),
  assigned_role text,
  title text not null,
  description text,
  priority text not null default 'NORMAL',
  status text not null default 'OPEN',
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tasks_priority_check
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  constraint crm_tasks_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'))
);

create table if not exists public.franchise_applications (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique default (
    'FR-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  lead_id uuid references public.crm_leads(id) on delete set null,
  applicant_customer_id uuid references public.customers(id) on delete set null,
  proposed_branch_id uuid references public.branches(id) on delete set null,
  owner_user_id uuid references public.app_users(id),
  city text not null,
  district text,
  investment_budget numeric(14,2),
  liquid_capital numeric(14,2),
  business_experience text,
  location_status text not null default 'SEARCHING',
  current_step text not null default 'PRE_SCREENING',
  decision_status text not null default 'IN_REVIEW',
  financial_score integer check (financial_score between 0 and 100),
  operational_score integer check (operational_score between 0 and 100),
  brand_fit_score integer check (brand_fit_score between 0 and 100),
  legal_risk_level text not null default 'LOW',
  rejected_reason text,
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint franchise_applications_location_status_check
    check (location_status in ('SEARCHING', 'PROPOSED', 'APPROVED', 'REJECTED', 'SIGNED')),
  constraint franchise_applications_current_step_check
    check (current_step in (
      'PRE_SCREENING',
      'FINANCE_REVIEW',
      'LOCATION_REVIEW',
      'LEGAL_REVIEW',
      'CONTRACT',
      'ONBOARDING',
      'OPENED',
      'REJECTED'
    )),
  constraint franchise_applications_decision_status_check
    check (decision_status in ('IN_REVIEW', 'APPROVED', 'REJECTED', 'WAITLIST', 'CANCELLED')),
  constraint franchise_applications_risk_check
    check (legal_risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

alter table public.crm_leads
  add column if not exists converted_franchise_application_id uuid references public.franchise_applications(id);

create table if not exists public.franchise_application_steps (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.franchise_applications(id) on delete cascade,
  step_key text not null,
  title text not null,
  status text not null default 'PENDING',
  owner_user_id uuid references public.app_users(id),
  due_at timestamptz,
  completed_at timestamptz,
  evidence jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, step_key),
  constraint franchise_application_steps_status_check
    check (status in ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'SKIPPED'))
);

create table if not exists public.branch_onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  application_id uuid references public.franchise_applications(id) on delete set null,
  checklist_type text not null default 'OPENING',
  status text not null default 'OPEN',
  target_opening_date date,
  completed_at timestamptz,
  owner_user_id uuid references public.app_users(id),
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_onboarding_checklists_type_check
    check (checklist_type in ('OPENING', 'AUDIT', 'RENEWAL', 'CORRECTIVE_ACTION')),
  constraint branch_onboarding_checklists_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'))
);

create table if not exists public.branch_onboarding_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.branch_onboarding_checklists(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  item_key text not null,
  title text not null,
  status text not null default 'PENDING',
  owner_user_id uuid references public.app_users(id),
  due_at timestamptz,
  completed_at timestamptz,
  evidence_url text,
  notes text,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(checklist_id, item_key),
  constraint branch_onboarding_items_status_check
    check (status in ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'WAIVED'))
);

create table if not exists public.branch_documents (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  document_type text not null,
  title text not null,
  status text not null default 'PENDING',
  file_url text,
  storage_path text,
  issued_at date,
  expires_at date,
  verified_by uuid references public.app_users(id),
  verified_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_documents_type_check
    check (document_type in (
      'FRANCHISE_CONTRACT',
      'TAX_CERTIFICATE',
      'TRADE_REGISTRY',
      'SIGNBOARD_PERMIT',
      'INSURANCE',
      'KVKK',
      'CALIBRATION',
      'OTHER'
    )),
  constraint branch_documents_status_check
    check (status in ('PENDING', 'UPLOADED', 'APPROVED', 'REJECTED', 'EXPIRED'))
);

create table if not exists public.dealer_contracts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  application_id uuid references public.franchise_applications(id) on delete set null,
  contract_no text not null unique,
  contract_type text not null default 'FRANCHISE',
  status text not null default 'DRAFT',
  signed_at timestamptz,
  starts_at date,
  ends_at date,
  royalty_rate numeric(6,4),
  advertising_fee_rate numeric(6,4),
  renewal_notice_at date,
  document_url text,
  storage_path text,
  legal_owner_user_id uuid references public.app_users(id),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_contracts_type_check
    check (contract_type in ('FRANCHISE', 'SERVICE_LEVEL', 'SUPPLIER', 'ADDENDUM')),
  constraint dealer_contracts_status_check
    check (status in ('DRAFT', 'IN_REVIEW', 'SIGNED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'))
);

create table if not exists public.branch_equipment_assets (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  asset_type text not null,
  asset_name text not null,
  serial_no text,
  vendor text,
  status text not null default 'ACTIVE',
  installed_at date,
  warranty_until date,
  calibration_due_at date,
  last_maintenance_at date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_equipment_assets_status_check
    check (status in ('ACTIVE', 'MAINTENANCE', 'CALIBRATION_DUE', 'BROKEN', 'RETIRED'))
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no text not null unique default (
    'FIN-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  expertise_case_id uuid references public.expertise_cases(id) on delete set null,
  contract_id uuid references public.dealer_contracts(id) on delete set null,
  transaction_type text not null,
  direction text not null,
  status text not null default 'DRAFT',
  amount numeric(14,2) not null check (amount >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  currency text not null default 'TRY',
  period_start date,
  period_end date,
  due_date date,
  paid_at timestamptz,
  invoice_no text,
  payment_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_type_check
    check (transaction_type in (
      'SERVICE_REVENUE',
      'ROYALTY',
      'AD_FUND',
      'SOFTWARE_LICENSE',
      'TRAINING',
      'EQUIPMENT',
      'REFUND',
      'EXPENSE',
      'OTHER'
    )),
  constraint finance_transactions_direction_check
    check (direction in ('INCOME', 'EXPENSE', 'TRANSFER')),
  constraint finance_transactions_status_check
    check (status in ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'))
);

create table if not exists public.quality_audits (
  id uuid primary key default gen_random_uuid(),
  audit_no text not null unique default (
    'QA-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  branch_id uuid not null references public.branches(id) on delete cascade,
  expertise_case_id uuid references public.expertise_cases(id) on delete set null,
  audit_type text not null,
  status text not null default 'OPEN',
  score integer check (score between 0 and 100),
  severity text not null default 'LOW',
  finding_summary text not null,
  root_cause text,
  action_plan text,
  owner_user_id uuid references public.app_users(id),
  due_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quality_audits_type_check
    check (audit_type in ('REPORT_REVIEW', 'MYSTERY_CUSTOMER', 'CAMERA', 'GOOGLE_REVIEW', 'PROCESS', 'COMPLAINT')),
  constraint quality_audits_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_BRANCH', 'CLOSED', 'CANCELLED')),
  constraint quality_audits_severity_check
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

create table if not exists public.quality_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.quality_audits(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  finding_type text not null,
  severity text not null default 'LOW',
  status text not null default 'OPEN',
  description text not null,
  corrective_action text,
  owner_user_id uuid references public.app_users(id),
  due_at timestamptz,
  closed_at timestamptz,
  evidence_url text,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quality_findings_severity_check
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint quality_findings_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'DONE', 'WAIVED'))
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default (
    'SUP-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  expertise_case_id uuid references public.expertise_cases(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,
  category text not null,
  severity text not null default 'MEDIUM',
  status text not null default 'OPEN',
  title text not null,
  description text,
  sla_due_at timestamptz,
  owner_user_id uuid references public.app_users(id),
  root_cause text,
  resolution text,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_category_check
    check (category in ('CUSTOMER', 'REPORT_DISPUTE', 'TECHNICAL', 'FINANCE', 'PORTAL', 'QUALITY', 'LEGAL', 'OTHER')),
  constraint support_tickets_severity_check
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint support_tickets_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_BRANCH', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED'))
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  message_type text not null default 'COMMENT',
  body text not null,
  is_internal boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_type_check
    check (message_type in ('COMMENT', 'STATUS_CHANGE', 'ATTACHMENT', 'SYSTEM'))
);

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  title text not null,
  category text not null,
  audience_roles jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  level integer not null default 1 check (level between 1 and 5),
  duration_minutes integer,
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  renewal_months integer,
  description text,
  content_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_courses_status_check
    check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  status text not null default 'ASSIGNED',
  progress integer not null default 0 check (progress between 0 and 100),
  exam_score integer check (exam_score between 0 and 100),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  assigned_by uuid references public.app_users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, user_id),
  constraint academy_enrollments_status_check
    check (status in ('ASSIGNED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'EXPIRED', 'CANCELLED'))
);

create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.academy_enrollments(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  certificate_no text not null unique default (
    'CERT-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  status text not null default 'ACTIVE',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_certificates_status_check
    check (status in ('ACTIVE', 'EXPIRED', 'REVOKED'))
);

create table if not exists public.dealer_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'ALL',
  target_branch_id uuid references public.branches(id) on delete cascade,
  status text not null default 'DRAFT',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.app_users(id),
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_announcements_audience_check
    check (audience in ('ALL', 'REGION', 'BRANCH', 'ROLE')),
  constraint dealer_announcements_status_check
    check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table if not exists public.dealer_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.dealer_announcements(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(announcement_id, user_id)
);

create table if not exists public.customer_consent_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  consent_type text not null,
  status text not null,
  channel text not null default 'IN_PERSON',
  consent_text_version text,
  evidence_url text,
  ip_address inet,
  user_agent text,
  captured_by uuid references public.app_users(id),
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint customer_consent_events_type_check
    check (consent_type in ('KVKK', 'SERVICE', 'MARKETING', 'WHATSAPP', 'SMS', 'EMAIL')),
  constraint customer_consent_events_status_check
    check (status in ('GRANTED', 'REVOKED')),
  constraint customer_consent_events_channel_check
    check (channel in ('IN_PERSON', 'WEB', 'MOBILE', 'CALL_CENTER', 'SMS', 'EMAIL', 'WHATSAPP'))
);

create table if not exists public.web_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  source_url text,
  branch_id uuid references public.branches(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  status text not null default 'NEW',
  full_name text,
  phone text,
  email text,
  city text,
  district text,
  payload jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_form_submissions_type_check
    check (form_type in ('APPOINTMENT', 'FRANCHISE', 'CONTACT', 'COMPLAINT', 'CORPORATE')),
  constraint web_form_submissions_status_check
    check (status in ('NEW', 'QUALIFIED', 'CONVERTED', 'SPAM', 'ARCHIVED'))
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete set null,
  actor_id uuid references public.app_users(id) on delete set null,
  action text not null,
  entity_name text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_users_branch_role on public.app_users(branch_id, role);
create index if not exists idx_branches_status_region on public.branches(status, region);
create index if not exists idx_customers_branch on public.customers(branch_id);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_vehicles_branch on public.vehicles(branch_id);
create index if not exists idx_vehicles_plate on public.vehicles(plate);
create index if not exists idx_user_region_assignments_region on public.user_region_assignments(region) where is_active = true;
create index if not exists idx_crm_leads_branch_stage on public.crm_leads(branch_id, stage);
create index if not exists idx_crm_leads_owner_next_action on public.crm_leads(owner_user_id, next_action_at);
create index if not exists idx_crm_leads_phone on public.crm_leads(phone);
create index if not exists idx_crm_opportunities_branch_stage on public.crm_opportunities(branch_id, stage);
create index if not exists idx_crm_activities_lead on public.crm_activities(lead_id);
create index if not exists idx_crm_activities_customer on public.crm_activities(customer_id);
create index if not exists idx_crm_tasks_assigned_status on public.crm_tasks(assigned_user_id, status);
create index if not exists idx_franchise_applications_status_city on public.franchise_applications(decision_status, city);
create index if not exists idx_franchise_steps_application on public.franchise_application_steps(application_id, status);
create index if not exists idx_branch_documents_branch_status on public.branch_documents(branch_id, status);
create index if not exists idx_dealer_contracts_branch_status on public.dealer_contracts(branch_id, status);
create index if not exists idx_equipment_branch_status on public.branch_equipment_assets(branch_id, status);
create index if not exists idx_finance_transactions_branch_period on public.finance_transactions(branch_id, period_start, period_end);
create index if not exists idx_finance_transactions_status_due on public.finance_transactions(status, due_date);
create index if not exists idx_quality_audits_branch_status on public.quality_audits(branch_id, status);
create index if not exists idx_quality_findings_branch_status on public.quality_findings(branch_id, status);
create index if not exists idx_support_tickets_branch_status on public.support_tickets(branch_id, status);
create index if not exists idx_support_tickets_owner_status on public.support_tickets(owner_user_id, status);
create index if not exists idx_support_messages_ticket on public.support_ticket_messages(ticket_id);
create index if not exists idx_academy_enrollments_user_status on public.academy_enrollments(user_id, status);
create index if not exists idx_academy_enrollments_branch_status on public.academy_enrollments(branch_id, status);
create index if not exists idx_announcements_status_published on public.dealer_announcements(status, published_at);
create index if not exists idx_consent_customer_type on public.customer_consent_events(customer_id, consent_type);
create index if not exists idx_web_forms_status_type on public.web_form_submissions(status, form_type);
create index if not exists idx_audit_events_entity on public.audit_events(entity_name, entity_id);
create index if not exists idx_audit_events_branch_created on public.audit_events(branch_id, created_at desc);

create or replace function app_private.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.app_users u
  where u.auth_user_id = auth.uid()
    and u.is_active = true
  limit 1;
$$;

create or replace function app_private.current_app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.app_users u
  where u.auth_user_id = auth.uid()
    and u.is_active = true
  limit 1;
$$;

create or replace function app_private.current_user_has_role(target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and u.role = any(target_roles)
  );
$$;

create or replace function app_private.current_user_is_hq()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_private.current_user_has_role(array[
    'CEO',
    'GENERAL_MANAGER',
    'OPERATIONS',
    'QUALITY_AUDITOR',
    'FINANCE',
    'LEGAL',
    'CRM_AGENT',
    'FRANCHISE_SALES',
    'MARKETING',
    'HR',
    'ACADEMY_MANAGER',
    'SUPPORT_AGENT'
  ]);
$$;

create or replace function app_private.current_user_can_access_branch(
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_branch_id is not null
    and exists (
      select 1
      from public.app_users u
      where u.auth_user_id = auth.uid()
        and u.is_active = true
        and (
          u.role in (
            'CEO',
            'GENERAL_MANAGER',
            'OPERATIONS',
            'QUALITY_AUDITOR',
            'FINANCE',
            'LEGAL',
            'CRM_AGENT',
            'FRANCHISE_SALES',
            'MARKETING',
            'HR',
            'ACADEMY_MANAGER',
            'SUPPORT_AGENT'
          )
          or u.branch_id = target_branch_id
          or (
            u.role = 'REGIONAL_MANAGER'
            and exists (
              select 1
              from public.branches b
              join public.user_region_assignments ura
                on ura.region = b.region
               and ura.user_id = u.id
               and ura.is_active = true
              where b.id = target_branch_id
            )
          )
        )
    );
$$;

create or replace function app_private.current_user_can_operate_branch(
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_branch_id is not null
    and exists (
      select 1
      from public.app_users u
      where u.auth_user_id = auth.uid()
        and u.is_active = true
        and (
          u.role in (
            'CEO',
            'GENERAL_MANAGER',
            'OPERATIONS',
            'QUALITY_AUDITOR',
            'CRM_AGENT',
            'FRANCHISE_SALES',
            'SUPPORT_AGENT'
          )
          or (
            u.branch_id = target_branch_id
            and u.role in (
              'BRANCH_MANAGER',
              'RECEPTION_STAFF',
              'DEALER_OWNER',
              'DEALER_STAFF'
            )
          )
          or (
            u.role = 'REGIONAL_MANAGER'
            and exists (
              select 1
              from public.branches b
              join public.user_region_assignments ura
                on ura.region = b.region
               and ura.user_id = u.id
               and ura.is_active = true
              where b.id = target_branch_id
            )
          )
        )
    );
$$;

create or replace function app_private.current_user_can_manage_branch(
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_branch_id is not null
    and exists (
      select 1
      from public.app_users u
      where u.auth_user_id = auth.uid()
        and u.is_active = true
        and (
          u.role in ('CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'QUALITY_AUDITOR')
          or (
            u.branch_id = target_branch_id
            and u.role in ('BRANCH_MANAGER', 'DEALER_OWNER')
          )
          or (
            u.role = 'REGIONAL_MANAGER'
            and exists (
              select 1
              from public.branches b
              join public.user_region_assignments ura
                on ura.region = b.region
               and ura.user_id = u.id
               and ura.is_active = true
              where b.id = target_branch_id
            )
          )
        )
    );
$$;

create or replace function app_private.current_user_can_access_customer(
  target_customer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_customer_id is not null
    and exists (
      select 1
      from public.customers c
      where c.id = target_customer_id
        and (
          app_private.current_user_is_hq()
          or c.owner_user_id = app_private.current_app_user_id()
          or app_private.current_user_can_access_branch(c.branch_id)
          or exists (
            select 1
            from public.expertise_cases ec
            where ec.customer_id = c.id
              and app_private.current_user_can_access_branch(ec.branch_id)
          )
        )
    );
$$;

create or replace function app_private.current_user_can_access_lead(
  target_lead_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_lead_id is not null
    and exists (
      select 1
      from public.crm_leads l
      where l.id = target_lead_id
        and (
          app_private.current_user_is_hq()
          or l.owner_user_id = app_private.current_app_user_id()
          or app_private.current_user_can_access_branch(l.branch_id)
        )
    );
$$;

create or replace function app_private.current_user_can_access_application(
  target_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_application_id is not null
    and exists (
      select 1
      from public.franchise_applications fa
      where fa.id = target_application_id
        and (
          app_private.current_user_is_hq()
          or fa.owner_user_id = app_private.current_app_user_id()
          or app_private.current_user_can_access_branch(fa.proposed_branch_id)
          or app_private.current_user_can_access_lead(fa.lead_id)
        )
    );
$$;

create or replace function app_private.audit_business_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  payload jsonb;
  target_branch_id uuid;
  target_entity_id uuid;
begin
  payload := coalesce(to_jsonb(new), to_jsonb(old));
  target_branch_id := nullif(payload ->> 'branch_id', '')::uuid;
  target_entity_id := nullif(payload ->> 'id', '')::uuid;

  insert into public.audit_events (
    branch_id,
    actor_id,
    action,
    entity_name,
    entity_id,
    old_value,
    new_value
  )
  values (
    target_branch_id,
    app_private.current_app_user_id(),
    tg_op,
    tg_table_name,
    target_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function app_private.current_app_user_id() from public, anon, authenticated;
revoke execute on function app_private.current_app_user_role() from public, anon, authenticated;
revoke execute on function app_private.current_user_has_role(text[]) from public, anon, authenticated;
revoke execute on function app_private.current_user_is_hq() from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_branch(uuid) from public, anon, authenticated;
revoke execute on function app_private.current_user_can_operate_branch(uuid) from public, anon, authenticated;
revoke execute on function app_private.current_user_can_manage_branch(uuid) from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_customer(uuid) from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_lead(uuid) from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_application(uuid) from public, anon, authenticated;
revoke execute on function app_private.audit_business_row_change() from public, anon, authenticated;

grant execute on function app_private.current_app_user_id() to authenticated;
grant execute on function app_private.current_app_user_role() to authenticated;
grant execute on function app_private.current_user_has_role(text[]) to authenticated;
grant execute on function app_private.current_user_is_hq() to authenticated;
grant execute on function app_private.current_user_can_access_branch(uuid) to authenticated;
grant execute on function app_private.current_user_can_operate_branch(uuid) to authenticated;
grant execute on function app_private.current_user_can_manage_branch(uuid) to authenticated;
grant execute on function app_private.current_user_can_access_customer(uuid) to authenticated;
grant execute on function app_private.current_user_can_access_lead(uuid) to authenticated;
grant execute on function app_private.current_user_can_access_application(uuid) to authenticated;

update public.customers c
set branch_id = source.branch_id
from (
  select distinct on (customer_id)
    customer_id,
    branch_id
  from public.expertise_cases
  where customer_id is not null
  order by customer_id, created_at desc
) source
where c.id = source.customer_id
  and c.branch_id is null;

update public.vehicles v
set branch_id = source.branch_id
from (
  select distinct on (vehicle_id)
    vehicle_id,
    branch_id
  from public.expertise_cases
  where vehicle_id is not null
  order by vehicle_id, created_at desc
) source
where v.id = source.vehicle_id
  and v.branch_id is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_region_assignments',
    'crm_leads',
    'crm_opportunities',
    'crm_activities',
    'crm_tasks',
    'franchise_applications',
    'franchise_application_steps',
    'branch_onboarding_checklists',
    'branch_onboarding_items',
    'branch_documents',
    'dealer_contracts',
    'branch_equipment_assets',
    'finance_transactions',
    'quality_audits',
    'quality_findings',
    'support_tickets',
    'support_ticket_messages',
    'academy_courses',
    'academy_enrollments',
    'academy_certificates',
    'dealer_announcements',
    'dealer_announcement_reads',
    'customer_consent_events',
    'web_form_submissions',
    'audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop trigger if exists trg_user_region_assignments_updated_at on public.user_region_assignments;
create trigger trg_user_region_assignments_updated_at before update on public.user_region_assignments for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_leads_updated_at on public.crm_leads;
create trigger trg_crm_leads_updated_at before update on public.crm_leads for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_opportunities_updated_at on public.crm_opportunities;
create trigger trg_crm_opportunities_updated_at before update on public.crm_opportunities for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_activities_updated_at on public.crm_activities;
create trigger trg_crm_activities_updated_at before update on public.crm_activities for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_tasks_updated_at on public.crm_tasks;
create trigger trg_crm_tasks_updated_at before update on public.crm_tasks for each row execute function public.set_updated_at();

drop trigger if exists trg_franchise_applications_updated_at on public.franchise_applications;
create trigger trg_franchise_applications_updated_at before update on public.franchise_applications for each row execute function public.set_updated_at();

drop trigger if exists trg_franchise_application_steps_updated_at on public.franchise_application_steps;
create trigger trg_franchise_application_steps_updated_at before update on public.franchise_application_steps for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_onboarding_checklists_updated_at on public.branch_onboarding_checklists;
create trigger trg_branch_onboarding_checklists_updated_at before update on public.branch_onboarding_checklists for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_onboarding_items_updated_at on public.branch_onboarding_items;
create trigger trg_branch_onboarding_items_updated_at before update on public.branch_onboarding_items for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_documents_updated_at on public.branch_documents;
create trigger trg_branch_documents_updated_at before update on public.branch_documents for each row execute function public.set_updated_at();

drop trigger if exists trg_dealer_contracts_updated_at on public.dealer_contracts;
create trigger trg_dealer_contracts_updated_at before update on public.dealer_contracts for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_equipment_assets_updated_at on public.branch_equipment_assets;
create trigger trg_branch_equipment_assets_updated_at before update on public.branch_equipment_assets for each row execute function public.set_updated_at();

drop trigger if exists trg_finance_transactions_updated_at on public.finance_transactions;
create trigger trg_finance_transactions_updated_at before update on public.finance_transactions for each row execute function public.set_updated_at();

drop trigger if exists trg_quality_audits_updated_at on public.quality_audits;
create trigger trg_quality_audits_updated_at before update on public.quality_audits for each row execute function public.set_updated_at();

drop trigger if exists trg_quality_findings_updated_at on public.quality_findings;
create trigger trg_quality_findings_updated_at before update on public.quality_findings for each row execute function public.set_updated_at();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

drop trigger if exists trg_academy_courses_updated_at on public.academy_courses;
create trigger trg_academy_courses_updated_at before update on public.academy_courses for each row execute function public.set_updated_at();

drop trigger if exists trg_academy_enrollments_updated_at on public.academy_enrollments;
create trigger trg_academy_enrollments_updated_at before update on public.academy_enrollments for each row execute function public.set_updated_at();

drop trigger if exists trg_academy_certificates_updated_at on public.academy_certificates;
create trigger trg_academy_certificates_updated_at before update on public.academy_certificates for each row execute function public.set_updated_at();

drop trigger if exists trg_dealer_announcements_updated_at on public.dealer_announcements;
create trigger trg_dealer_announcements_updated_at before update on public.dealer_announcements for each row execute function public.set_updated_at();

drop trigger if exists trg_web_form_submissions_updated_at on public.web_form_submissions;
create trigger trg_web_form_submissions_updated_at before update on public.web_form_submissions for each row execute function public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_leads',
    'crm_opportunities',
    'crm_activities',
    'crm_tasks',
    'franchise_applications',
    'franchise_application_steps',
    'branch_onboarding_checklists',
    'branch_onboarding_items',
    'branch_documents',
    'dealer_contracts',
    'branch_equipment_assets',
    'finance_transactions',
    'quality_audits',
    'quality_findings',
    'support_tickets',
    'support_ticket_messages',
    'academy_courses',
    'academy_enrollments',
    'academy_certificates',
    'dealer_announcements',
    'dealer_announcement_reads',
    'customer_consent_events',
    'web_form_submissions'
  ]
  loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function app_private.audit_business_row_change()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

grant select, insert, update, delete on table
  public.user_region_assignments,
  public.crm_leads,
  public.crm_opportunities,
  public.crm_activities,
  public.crm_tasks,
  public.franchise_applications,
  public.franchise_application_steps,
  public.branch_onboarding_checklists,
  public.branch_onboarding_items,
  public.branch_documents,
  public.dealer_contracts,
  public.branch_equipment_assets,
  public.finance_transactions,
  public.quality_audits,
  public.quality_findings,
  public.support_tickets,
  public.support_ticket_messages,
  public.academy_courses,
  public.academy_enrollments,
  public.academy_certificates,
  public.dealer_announcements,
  public.dealer_announcement_reads,
  public.customer_consent_events,
  public.web_form_submissions,
  public.audit_events
to authenticated;

revoke all on table
  public.user_region_assignments,
  public.crm_leads,
  public.crm_opportunities,
  public.crm_activities,
  public.crm_tasks,
  public.franchise_applications,
  public.franchise_application_steps,
  public.branch_onboarding_checklists,
  public.branch_onboarding_items,
  public.branch_documents,
  public.dealer_contracts,
  public.branch_equipment_assets,
  public.finance_transactions,
  public.quality_audits,
  public.quality_findings,
  public.support_tickets,
  public.support_ticket_messages,
  public.academy_courses,
  public.academy_enrollments,
  public.academy_certificates,
  public.dealer_announcements,
  public.dealer_announcement_reads,
  public.customer_consent_events,
  public.web_form_submissions,
  public.audit_events
from anon;

grant select, insert, update on table
  public.branches,
  public.app_users,
  public.customers,
  public.vehicles,
  public.appointments
to authenticated;

drop policy if exists branches_branch_insert on public.branches;
create policy branches_branch_insert
on public.branches
for insert
to authenticated
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'FRANCHISE_SALES']));

drop policy if exists branches_branch_update on public.branches;
create policy branches_branch_update
on public.branches
for update
to authenticated
using (app_private.current_user_can_manage_branch(id))
with check (app_private.current_user_can_manage_branch(id));

drop policy if exists app_users_self_or_hq on public.app_users;
drop policy if exists app_users_self_read on public.app_users;
drop policy if exists app_users_select_access on public.app_users;
create policy app_users_select_access
on public.app_users
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or app_private.current_user_is_hq()
  or app_private.current_user_can_manage_branch(branch_id)
);

drop policy if exists app_users_insert_hq on public.app_users;
create policy app_users_insert_hq
on public.app_users
for insert
to authenticated
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'HR']));

drop policy if exists app_users_update_hq on public.app_users;
create policy app_users_update_hq
on public.app_users
for update
to authenticated
using (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'HR'])
  or app_private.current_user_can_manage_branch(branch_id)
)
with check (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'HR'])
  or app_private.current_user_can_manage_branch(branch_id)
);

drop policy if exists user_region_assignments_select on public.user_region_assignments;
create policy user_region_assignments_select
on public.user_region_assignments
for select
to authenticated
using (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS'])
);

drop policy if exists user_region_assignments_manage on public.user_region_assignments;
create policy user_region_assignments_manage
on public.user_region_assignments
for all
to authenticated
using (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS']))
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS']));

drop policy if exists customers_case_access on public.customers;
drop policy if exists customers_select_access on public.customers;
create policy customers_select_access
on public.customers
for select
to authenticated
using (app_private.current_user_can_access_customer(id));

drop policy if exists customers_insert_access on public.customers;
create policy customers_insert_access
on public.customers
for insert
to authenticated
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
);

drop policy if exists customers_update_access on public.customers;
create policy customers_update_access
on public.customers
for update
to authenticated
using (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
)
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
);

drop policy if exists vehicles_case_access on public.vehicles;
drop policy if exists vehicles_select_access on public.vehicles;
create policy vehicles_select_access
on public.vehicles
for select
to authenticated
using (
  app_private.current_user_is_hq()
  or app_private.current_user_can_access_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
  or exists (
    select 1
    from public.expertise_cases ec
    where ec.vehicle_id = vehicles.id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists vehicles_insert_access on public.vehicles;
create policy vehicles_insert_access
on public.vehicles
for insert
to authenticated
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
);

drop policy if exists vehicles_update_access on public.vehicles;
create policy vehicles_update_access
on public.vehicles
for update
to authenticated
using (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
)
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
);

drop policy if exists appointments_branch_insert on public.appointments;
create policy appointments_branch_insert
on public.appointments
for insert
to authenticated
with check (app_private.current_user_can_operate_branch(branch_id));

drop policy if exists appointments_branch_update on public.appointments;
create policy appointments_branch_update
on public.appointments
for update
to authenticated
using (app_private.current_user_can_operate_branch(branch_id))
with check (app_private.current_user_can_operate_branch(branch_id));

drop policy if exists crm_leads_select on public.crm_leads;
create policy crm_leads_select
on public.crm_leads
for select
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
);

drop policy if exists crm_leads_insert on public.crm_leads;
create policy crm_leads_insert
on public.crm_leads
for insert
to authenticated
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
  or owner_user_id = app_private.current_app_user_id()
);

drop policy if exists crm_leads_update on public.crm_leads;
create policy crm_leads_update
on public.crm_leads
for update
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
)
with check (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
);

drop policy if exists crm_opportunities_access on public.crm_opportunities;
create policy crm_opportunities_access
on public.crm_opportunities
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
)
with check (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
);

drop policy if exists crm_activities_access on public.crm_activities;
create policy crm_activities_access
on public.crm_activities
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
  or app_private.current_user_can_access_customer(customer_id)
)
with check (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
  or app_private.current_user_can_access_customer(customer_id)
);

drop policy if exists crm_tasks_access on public.crm_tasks;
create policy crm_tasks_access
on public.crm_tasks
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or assigned_user_id = app_private.current_app_user_id()
  or created_by = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
  or app_private.current_user_can_access_customer(customer_id)
)
with check (
  app_private.current_user_is_hq()
  or assigned_user_id = app_private.current_app_user_id()
  or created_by = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_access_lead(lead_id)
  or app_private.current_user_can_access_customer(customer_id)
);

drop policy if exists franchise_applications_access on public.franchise_applications;
create policy franchise_applications_access
on public.franchise_applications
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(proposed_branch_id)
  or app_private.current_user_can_access_lead(lead_id)
)
with check (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_manage_branch(proposed_branch_id)
  or app_private.current_user_can_access_lead(lead_id)
);

drop policy if exists franchise_steps_access on public.franchise_application_steps;
create policy franchise_steps_access
on public.franchise_application_steps
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_application(application_id)
)
with check (
  app_private.current_user_is_hq()
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_application(application_id)
);

drop policy if exists branch_onboarding_checklists_access on public.branch_onboarding_checklists;
create policy branch_onboarding_checklists_access
on public.branch_onboarding_checklists
for all
to authenticated
using (
  app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_application(application_id)
)
with check (
  app_private.current_user_can_manage_branch(branch_id)
  or app_private.current_user_can_access_application(application_id)
);

drop policy if exists branch_onboarding_items_access on public.branch_onboarding_items;
create policy branch_onboarding_items_access
on public.branch_onboarding_items
for all
to authenticated
using (app_private.current_user_can_access_branch(branch_id))
with check (
  app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_manage_branch(branch_id)
);

drop policy if exists branch_documents_select on public.branch_documents;
create policy branch_documents_select
on public.branch_documents
for select
to authenticated
using (app_private.current_user_can_access_branch(branch_id));

drop policy if exists branch_documents_mutate on public.branch_documents;
create policy branch_documents_mutate
on public.branch_documents
for all
to authenticated
using (
  app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'LEGAL'])
)
with check (
  app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'LEGAL'])
);

drop policy if exists dealer_contracts_select on public.dealer_contracts;
create policy dealer_contracts_select
on public.dealer_contracts
for select
to authenticated
using (
  app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_application(application_id)
);

drop policy if exists dealer_contracts_mutate on public.dealer_contracts;
create policy dealer_contracts_mutate
on public.dealer_contracts
for all
to authenticated
using (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'LEGAL', 'FRANCHISE_SALES']))
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'LEGAL', 'FRANCHISE_SALES']));

drop policy if exists equipment_assets_access on public.branch_equipment_assets;
create policy equipment_assets_access
on public.branch_equipment_assets
for all
to authenticated
using (app_private.current_user_can_access_branch(branch_id))
with check (
  app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'QUALITY_AUDITOR'])
);

drop policy if exists finance_transactions_select on public.finance_transactions;
create policy finance_transactions_select
on public.finance_transactions
for select
to authenticated
using (
  app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'FINANCE', 'LEGAL'])
);

drop policy if exists finance_transactions_mutate on public.finance_transactions;
create policy finance_transactions_mutate
on public.finance_transactions
for all
to authenticated
using (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'FINANCE']))
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'FINANCE']));

drop policy if exists quality_audits_access on public.quality_audits;
create policy quality_audits_access
on public.quality_audits
for all
to authenticated
using (app_private.current_user_can_access_branch(branch_id))
with check (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'QUALITY_AUDITOR'])
  or app_private.current_user_can_manage_branch(branch_id)
);

drop policy if exists quality_findings_access on public.quality_findings;
create policy quality_findings_access
on public.quality_findings
for all
to authenticated
using (app_private.current_user_can_access_branch(branch_id))
with check (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'QUALITY_AUDITOR'])
  or app_private.current_user_can_manage_branch(branch_id)
);

drop policy if exists support_tickets_access on public.support_tickets;
create policy support_tickets_access
on public.support_tickets
for all
to authenticated
using (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'SUPPORT_AGENT', 'QUALITY_AUDITOR', 'LEGAL'])
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_customer(customer_id)
)
with check (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'SUPPORT_AGENT', 'QUALITY_AUDITOR', 'LEGAL'])
  or owner_user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_access_customer(customer_id)
);

drop policy if exists support_ticket_messages_access on public.support_ticket_messages;
create policy support_ticket_messages_access
on public.support_ticket_messages
for all
to authenticated
using (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'SUPPORT_AGENT', 'QUALITY_AUDITOR', 'LEGAL'])
  or app_private.current_user_can_access_branch(branch_id)
  or exists (
    select 1
    from public.support_tickets st
    where st.id = support_ticket_messages.ticket_id
      and (
        app_private.current_user_can_access_branch(st.branch_id)
        or st.owner_user_id = app_private.current_app_user_id()
      )
  )
)
with check (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'SUPPORT_AGENT', 'QUALITY_AUDITOR', 'LEGAL'])
  or app_private.current_user_can_operate_branch(branch_id)
  or exists (
    select 1
    from public.support_tickets st
    where st.id = support_ticket_messages.ticket_id
      and (
        app_private.current_user_can_operate_branch(st.branch_id)
        or st.owner_user_id = app_private.current_app_user_id()
      )
  )
);

drop policy if exists academy_courses_read on public.academy_courses;
create policy academy_courses_read
on public.academy_courses
for select
to authenticated
using (status = 'PUBLISHED' or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR']));

drop policy if exists academy_courses_manage on public.academy_courses;
create policy academy_courses_manage
on public.academy_courses
for all
to authenticated
using (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR']))
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR']));

drop policy if exists academy_enrollments_access on public.academy_enrollments;
create policy academy_enrollments_access
on public.academy_enrollments
for all
to authenticated
using (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR'])
)
with check (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_can_manage_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR'])
);

drop policy if exists academy_certificates_access on public.academy_certificates;
create policy academy_certificates_access
on public.academy_certificates
for all
to authenticated
using (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR'])
)
with check (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'ACADEMY_MANAGER', 'HR'])
);

drop policy if exists dealer_announcements_select on public.dealer_announcements;
create policy dealer_announcements_select
on public.dealer_announcements
for select
to authenticated
using (
  app_private.current_user_is_hq()
  or (
    status = 'PUBLISHED'
    and (expires_at is null or expires_at > now())
    and (
      audience = 'ALL'
      or app_private.current_user_can_access_branch(target_branch_id)
    )
  )
);

drop policy if exists dealer_announcements_manage on public.dealer_announcements;
create policy dealer_announcements_manage
on public.dealer_announcements
for all
to authenticated
using (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'MARKETING']))
with check (app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'MARKETING']));

drop policy if exists dealer_announcement_reads_access on public.dealer_announcement_reads;
create policy dealer_announcement_reads_access
on public.dealer_announcement_reads
for all
to authenticated
using (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_is_hq()
)
with check (
  user_id = app_private.current_app_user_id()
  or app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_is_hq()
);

drop policy if exists customer_consent_events_access on public.customer_consent_events;
create policy customer_consent_events_access
on public.customer_consent_events
for all
to authenticated
using (
  app_private.current_user_can_access_branch(branch_id)
  or app_private.current_user_can_access_customer(customer_id)
)
with check (
  app_private.current_user_can_operate_branch(branch_id)
  or app_private.current_user_can_access_customer(customer_id)
);

drop policy if exists web_form_submissions_manage on public.web_form_submissions;
create policy web_form_submissions_manage
on public.web_form_submissions
for all
to authenticated
using (
  app_private.current_user_is_hq()
  or app_private.current_user_can_access_branch(branch_id)
)
with check (
  app_private.current_user_is_hq()
  or app_private.current_user_can_operate_branch(branch_id)
);

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select
on public.audit_events
for select
to authenticated
using (
  app_private.current_user_has_role(array['CEO', 'GENERAL_MANAGER', 'OPERATIONS', 'QUALITY_AUDITOR', 'LEGAL'])
  or app_private.current_user_can_access_branch(branch_id)
  or actor_id = app_private.current_app_user_id()
);

create or replace view public.crm_pipeline_summary
with (security_invoker = true)
as
select
  l.branch_id,
  b.name as branch_name,
  l.lead_type,
  l.stage,
  l.status,
  count(*)::integer as lead_count,
  coalesce(sum(l.budget_max), 0)::numeric(14,2) as estimated_pipeline_value,
  min(l.next_action_at) as next_action_at
from public.crm_leads l
left join public.branches b on b.id = l.branch_id
group by l.branch_id, b.name, l.lead_type, l.stage, l.status;

create or replace view public.dealer_portal_branch_summary
with (security_invoker = true)
as
select
  b.id as branch_id,
  b.code,
  b.name,
  b.city,
  b.district,
  b.region,
  b.status,
  b.risk_level,
  b.portal_enabled,
  b.google_rating,
  b.google_review_count,
  b.nps_score,
  b.quality_score,
  count(distinct ec.id) filter (where ec.opened_at >= now() - interval '30 days')::integer as last_30_day_case_count,
  count(distinct st.id) filter (where st.status not in ('RESOLVED', 'CLOSED', 'CANCELLED'))::integer as open_ticket_count,
  count(distinct qa.id) filter (where qa.status not in ('CLOSED', 'CANCELLED'))::integer as open_quality_audit_count,
  coalesce(sum(ft.amount) filter (
    where ft.direction = 'INCOME'
      and ft.status in ('ISSUED', 'PARTIAL', 'OVERDUE')
  ), 0)::numeric(14,2) as open_receivable_amount
from public.branches b
left join public.expertise_cases ec on ec.branch_id = b.id
left join public.support_tickets st on st.branch_id = b.id
left join public.quality_audits qa on qa.branch_id = b.id
left join public.finance_transactions ft on ft.branch_id = b.id
group by
  b.id,
  b.code,
  b.name,
  b.city,
  b.district,
  b.region,
  b.status,
  b.risk_level,
  b.portal_enabled,
  b.google_rating,
  b.google_review_count,
  b.nps_score,
  b.quality_score;

grant select on public.crm_pipeline_summary to authenticated;
grant select on public.dealer_portal_branch_summary to authenticated;
revoke all on public.crm_pipeline_summary from anon;
revoke all on public.dealer_portal_branch_summary from anon;
