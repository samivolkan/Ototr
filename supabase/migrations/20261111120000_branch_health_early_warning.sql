begin;

create table if not exists app_private.branch_health_snapshots (
  id bigint generated always as identity primary key,
  branch_id uuid not null references public.branches(id) on delete restrict,
  snapshot_date date not null,
  operations_score numeric(5,2), customer_score numeric(5,2), reputation_score numeric(5,2),
  quality_score numeric(5,2), finance_score numeric(5,2), people_score numeric(5,2),
  legal_score numeric(5,2), growth_score numeric(5,2),
  health_score numeric(5,2) not null check (health_score between 0 and 100),
  data_coverage numeric(5,2) not null check (data_coverage between 0 and 100),
  feature_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(branch_id,snapshot_date)
);

create table if not exists app_private.branch_health_predictions (
  id bigint generated always as identity primary key,
  branch_id uuid not null references public.branches(id) on delete restrict,
  prediction_date date not null,
  horizon_days smallint not null default 30 check (horizon_days=30),
  risk_probability numeric(7,6) not null check (risk_probability between 0 and 1),
  risk_level text not null check (risk_level in ('Düşük','İzlem','Yüksek','Kritik')),
  model_name text not null,
  model_version text not null,
  explanation jsonb not null default '[]'::jsonb,
  source text not null default 'bigquery_ml' check (source in ('bigquery_ml','rules_preview')),
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(branch_id,prediction_date,model_version)
);

alter table app_private.branch_health_snapshots enable row level security;
alter table app_private.branch_health_predictions enable row level security;
revoke all on app_private.branch_health_snapshots, app_private.branch_health_predictions from anon, authenticated;

create index if not exists branch_health_snapshots_branch_date_idx on app_private.branch_health_snapshots(branch_id,snapshot_date desc);
create index if not exists branch_health_predictions_branch_date_idx on app_private.branch_health_predictions(branch_id,prediction_date desc);

create or replace function public.erp_branch_health_latest(p_branch_id uuid default null)
returns table(branch_id uuid, snapshot_date date, health_score numeric, data_coverage numeric,
  operations_score numeric, customer_score numeric, reputation_score numeric, quality_score numeric,
  finance_score numeric, people_score numeric, legal_score numeric, growth_score numeric,
  risk_probability numeric, risk_level text, model_version text, prediction_source text,
  explanation jsonb, generated_at timestamptz)
language sql security definer set search_path=public,app_private,pg_temp as $$
  with me as (
    select au.branch_id, au.role
    from public.app_users au where au.auth_user_id=auth.uid() and au.is_active=true limit 1
  ), allowed as (
    select b.id
    from public.branches b, me
    where (p_branch_id is null or b.id=p_branch_id)
      and (me.role in ('CEO','GENERAL_MANAGER') or b.id=me.branch_id)
  ), snap as (
    select distinct on (s.branch_id) s.* from app_private.branch_health_snapshots s
    join allowed a on a.id=s.branch_id order by s.branch_id,s.snapshot_date desc
  ), pred as (
    select distinct on (p.branch_id) p.* from app_private.branch_health_predictions p
    join allowed a on a.id=p.branch_id where p.expires_at>now()
    order by p.branch_id,p.prediction_date desc,p.generated_at desc
  )
  select s.branch_id,s.snapshot_date,s.health_score,s.data_coverage,s.operations_score,s.customer_score,
    s.reputation_score,s.quality_score,s.finance_score,s.people_score,s.legal_score,s.growth_score,
    p.risk_probability,p.risk_level,p.model_version,p.source,p.explanation,p.generated_at
  from snap s left join pred p using(branch_id);
$$;
revoke all on function public.erp_branch_health_latest(uuid) from public,anon;
grant execute on function public.erp_branch_health_latest(uuid) to authenticated;

commit;
