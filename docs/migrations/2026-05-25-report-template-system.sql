-- Dynamic OTOTR report template and report answer layer.
-- Keeps existing expertise_cases as the work order root.

create extension if not exists pgcrypto;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'report-media',
  'report-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.expertise_cases
  add column if not exists template_id text;

create table if not exists public.report_templates (
  id text primary key,
  name text not null,
  version text not null,
  source_report_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_report_id, version)
);

create table if not exists public.report_template_groups (
  id text primary key,
  template_id text not null references public.report_templates(id) on delete cascade,
  title text not null,
  code text not null,
  sort_order int not null,
  point_info text not null default '',
  assigned_role text not null default '',
  created_at timestamptz not null default now(),
  unique (template_id, code)
);

create table if not exists public.report_template_items (
  id text primary key,
  template_id text not null references public.report_templates(id) on delete cascade,
  group_id text not null references public.report_template_groups(id) on delete cascade,
  nokta_id int not null,
  title text not null,
  modal_title text not null default '',
  sort_order int not null,
  form_url text not null default '',
  item_type text not null default 'note',
  has_options boolean not null default false,
  has_inputs boolean not null default false,
  has_description boolean not null default false,
  has_images boolean not null default false,
  max_images int not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, nokta_id)
);

create table if not exists public.report_template_item_options (
  id text primary key,
  template_id text not null references public.report_templates(id) on delete cascade,
  item_id text not null references public.report_template_items(id) on delete cascade,
  secenek_id int,
  label text not null,
  sort_order int not null,
  input_name text not null default '',
  class_name text not null default '',
  color_type text not null default 'neutral'
    check (color_type in ('green', 'red', 'orange', 'gray', 'neutral')),
  score_type text not null default 'neutral'
    check (score_type in ('positive', 'negative', 'warning', 'neutral')),
  is_default boolean not null default false,
  disabled boolean not null default false,
  unique (template_id, item_id, secenek_id)
);

create table if not exists public.report_template_item_inputs (
  id text primary key,
  template_id text not null references public.report_templates(id) on delete cascade,
  item_id text not null references public.report_template_items(id) on delete cascade,
  type text not null default 'text',
  name text not null default '',
  label text not null default '',
  placeholder text not null default '',
  value text not null default '',
  sort_order int not null default 0,
  is_required boolean not null default false
);

create table if not exists public.report_template_item_media_fields (
  id text primary key,
  template_id text not null references public.report_templates(id) on delete cascade,
  item_id text not null references public.report_template_items(id) on delete cascade,
  label text not null default '',
  sort_order int not null default 0,
  is_required boolean not null default false
);

create table if not exists public.work_order_report_answers (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references public.expertise_cases(id) on delete cascade,
  template_id text not null references public.report_templates(id),
  group_id text not null references public.report_template_groups(id),
  item_id text not null references public.report_template_items(id),
  nokta_id int not null,
  answered_by_user_id uuid references public.app_users(id),
  answered_by_role text not null default '',
  selected_option_ids text[] not null default '{}',
  selected_option_labels text[] not null default '{}',
  input_values jsonb not null default '{}'::jsonb,
  description text not null default '',
  image_urls text[] not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'COMPLETED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  locked_by_user_id uuid references public.app_users(id),
  locked_at timestamptz,
  lock_status text not null default 'UNLOCKED'
    check (lock_status in ('UNLOCKED', 'LOCKED')),
  unique (expertise_case_id, item_id)
);

create table if not exists public.work_order_report_files (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.work_order_report_answers(id) on delete cascade,
  expertise_case_id uuid not null references public.expertise_cases(id) on delete cascade,
  item_id text not null references public.report_template_items(id),
  field_key text not null default '',
  local_path text not null default '',
  remote_url text not null default '',
  hash text not null default '',
  captured_at timestamptz,
  uploaded_at timestamptz,
  uploaded_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.work_order_group_status (
  expertise_case_id uuid not null references public.expertise_cases(id) on delete cascade,
  group_id text not null references public.report_template_groups(id) on delete cascade,
  total_items int not null default 0,
  answered_items int not null default 0,
  completed_items int not null default 0,
  progress_percent int not null default 0,
  assigned_role text not null default '',
  assigned_user_id uuid references public.app_users(id),
  status text not null default 'WAITING'
    check (status in ('WAITING', 'IN_PROGRESS', 'COMPLETED')),
  updated_at timestamptz not null default now(),
  primary key (expertise_case_id, group_id)
);

create table if not exists public.final_reports (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references public.expertise_cases(id) on delete cascade,
  template_id text not null references public.report_templates(id),
  revision_no int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'LOCKED')),
  created_by uuid references public.app_users(id),
  locked_by uuid references public.app_users(id),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (expertise_case_id, revision_no)
);

create or replace function app_private.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

create index if not exists idx_report_template_items_group
  on public.report_template_items(group_id, sort_order);

create index if not exists idx_report_answers_case_group
  on public.work_order_report_answers(expertise_case_id, group_id);

create index if not exists idx_report_answers_locked
  on public.work_order_report_answers(locked_by_user_id)
  where locked_by_user_id is not null;

create trigger report_templates_updated_at
  before update on public.report_templates
  for each row execute function public.set_updated_at();

create trigger work_order_report_answers_updated_at
  before update on public.work_order_report_answers
  for each row execute function public.set_updated_at();

alter table public.report_templates enable row level security;
alter table public.report_template_groups enable row level security;
alter table public.report_template_items enable row level security;
alter table public.report_template_item_options enable row level security;
alter table public.report_template_item_inputs enable row level security;
alter table public.report_template_item_media_fields enable row level security;
alter table public.work_order_report_answers enable row level security;
alter table public.work_order_report_files enable row level security;
alter table public.work_order_group_status enable row level security;
alter table public.final_reports enable row level security;

grant select on public.report_templates to authenticated;
grant select on public.report_template_groups to authenticated;
grant select on public.report_template_items to authenticated;
grant select on public.report_template_item_options to authenticated;
grant select on public.report_template_item_inputs to authenticated;
grant select on public.report_template_item_media_fields to authenticated;
grant select, insert, update on public.work_order_report_answers to authenticated;
grant select, insert, update on public.work_order_report_files to authenticated;
grant select, insert, update on public.work_order_group_status to authenticated;
grant select, insert, update on public.final_reports to authenticated;

drop policy if exists report_templates_read on public.report_templates;
create policy report_templates_read
on public.report_templates
for select
to authenticated
using (is_active = true);

drop policy if exists report_template_groups_read on public.report_template_groups;
create policy report_template_groups_read
on public.report_template_groups
for select
to authenticated
using (
  exists (
    select 1 from public.report_templates rt
    where rt.id = report_template_groups.template_id
      and rt.is_active = true
  )
);

drop policy if exists report_template_items_read on public.report_template_items;
create policy report_template_items_read
on public.report_template_items
for select
to authenticated
using (
  exists (
    select 1 from public.report_templates rt
    where rt.id = report_template_items.template_id
      and rt.is_active = true
  )
);

drop policy if exists report_template_options_read on public.report_template_item_options;
create policy report_template_options_read
on public.report_template_item_options
for select
to authenticated
using (
  exists (
    select 1 from public.report_templates rt
    where rt.id = report_template_item_options.template_id
      and rt.is_active = true
  )
);

drop policy if exists report_template_inputs_read on public.report_template_item_inputs;
create policy report_template_inputs_read
on public.report_template_item_inputs
for select
to authenticated
using (
  exists (
    select 1 from public.report_templates rt
    where rt.id = report_template_item_inputs.template_id
      and rt.is_active = true
  )
);

drop policy if exists report_template_media_read on public.report_template_item_media_fields;
create policy report_template_media_read
on public.report_template_item_media_fields
for select
to authenticated
using (
  exists (
    select 1 from public.report_templates rt
    where rt.id = report_template_item_media_fields.template_id
      and rt.is_active = true
  )
);

drop policy if exists report_answers_case_access on public.work_order_report_answers;
create policy report_answers_case_access
on public.work_order_report_answers
for all
to authenticated
using (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_report_answers.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_report_answers.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_files_case_access on public.work_order_report_files;
create policy report_files_case_access
on public.work_order_report_files
for all
to authenticated
using (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_report_files.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_report_files.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_group_status_case_access on public.work_order_group_status;
create policy report_group_status_case_access
on public.work_order_group_status
for all
to authenticated
using (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_group_status.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = work_order_group_status.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists final_reports_case_access on public.final_reports;
create policy final_reports_case_access
on public.final_reports
for all
to authenticated
using (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = final_reports.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1 from public.expertise_cases ec
    where ec.id = final_reports.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_media_read on storage.objects;
create policy report_media_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'report-media'
  and split_part(name, '/', 1) = 'work-orders'
  and app_private.try_uuid(split_part(name, '/', 2)) is not null
  and exists (
    select 1 from public.expertise_cases ec
    where ec.id = app_private.try_uuid(split_part(name, '/', 2))
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_media_write on storage.objects;
create policy report_media_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-media'
  and split_part(name, '/', 1) = 'work-orders'
  and app_private.try_uuid(split_part(name, '/', 2)) is not null
  and exists (
    select 1 from public.expertise_cases ec
    where ec.id = app_private.try_uuid(split_part(name, '/', 2))
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_media_update on storage.objects;
create policy report_media_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'report-media'
  and split_part(name, '/', 1) = 'work-orders'
  and app_private.try_uuid(split_part(name, '/', 2)) is not null
  and exists (
    select 1 from public.expertise_cases ec
    where ec.id = app_private.try_uuid(split_part(name, '/', 2))
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  bucket_id = 'report-media'
  and split_part(name, '/', 1) = 'work-orders'
  and app_private.try_uuid(split_part(name, '/', 2)) is not null
  and exists (
    select 1 from public.expertise_cases ec
    where ec.id = app_private.try_uuid(split_part(name, '/', 2))
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

create or replace function public.recalculate_work_order_group_status(
  target_case_id uuid,
  target_group_id text
)
returns public.work_order_group_status
language plpgsql
security definer
set search_path = public
as $$
declare
  target_template_id text;
  target_role text;
  total_count int;
  answered_count int;
  completed_count int;
  next_status text;
  next_row public.work_order_group_status;
begin
  select ec.template_id into target_template_id
  from public.expertise_cases ec
  where ec.id = target_case_id;

  if target_template_id is null then
    select template_id into target_template_id
    from public.report_template_groups
    where id = target_group_id
    limit 1;
  end if;

  select assigned_role into target_role
  from public.report_template_groups
  where id = target_group_id;

  select count(*) into total_count
  from public.report_template_items
  where group_id = target_group_id;

  select count(*) into answered_count
  from public.work_order_report_answers
  where expertise_case_id = target_case_id
    and group_id = target_group_id;

  select count(*) into completed_count
  from public.work_order_report_answers
  where expertise_case_id = target_case_id
    and group_id = target_group_id
    and status = 'COMPLETED';

  next_status := case
    when completed_count = 0 then 'WAITING'
    when completed_count = total_count then 'COMPLETED'
    else 'IN_PROGRESS'
  end;

  insert into public.work_order_group_status (
    expertise_case_id,
    group_id,
    total_items,
    answered_items,
    completed_items,
    progress_percent,
    assigned_role,
    status,
    updated_at
  )
  values (
    target_case_id,
    target_group_id,
    total_count,
    answered_count,
    completed_count,
    case when total_count = 0 then 0 else round((completed_count::numeric / total_count::numeric) * 100)::int end,
    coalesce(target_role, ''),
    next_status,
    now()
  )
  on conflict (expertise_case_id, group_id) do update set
    total_items = excluded.total_items,
    answered_items = excluded.answered_items,
    completed_items = excluded.completed_items,
    progress_percent = excluded.progress_percent,
    assigned_role = excluded.assigned_role,
    status = excluded.status,
    updated_at = now()
  returning * into next_row;

  return next_row;
end;
$$;

create or replace function public.lock_work_order_report_item(
  target_case_id uuid,
  target_item_id text
)
returns public.work_order_report_answers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_role text;
  item_row public.report_template_items;
  answer_row public.work_order_report_answers;
begin
  actor_id := public.current_app_user_id();
  actor_role := coalesce(public.current_app_user_role(), '');

  if actor_id is null then
    raise exception 'Aktif kullanıcı bulunamadı.';
  end if;

  if not exists (
    select 1 from public.expertise_cases ec
    where ec.id = target_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  ) then
    raise exception 'Bu iş emrine erişim yok.';
  end if;

  select * into item_row
  from public.report_template_items
  where id = target_item_id;

  if item_row.id is null then
    raise exception 'Rapor maddesi bulunamadı.';
  end if;

  insert into public.work_order_report_answers (
    expertise_case_id,
    template_id,
    group_id,
    item_id,
    nokta_id,
    answered_by_user_id,
    answered_by_role,
    locked_by_user_id,
    locked_at,
    lock_status
  )
  values (
    target_case_id,
    item_row.template_id,
    item_row.group_id,
    item_row.id,
    item_row.nokta_id,
    actor_id,
    actor_role,
    actor_id,
    now(),
    'LOCKED'
  )
  on conflict (expertise_case_id, item_id) do nothing;

  select * into answer_row
  from public.work_order_report_answers
  where expertise_case_id = target_case_id
    and item_id = target_item_id
  for update;

  if answer_row.locked_by_user_id is not null
     and answer_row.locked_by_user_id <> actor_id
     and answer_row.locked_at > now() - interval '30 minutes' then
    raise exception 'Bu madde başka bir usta üzerinde.';
  end if;

  update public.work_order_report_answers
  set locked_by_user_id = actor_id,
      locked_at = now(),
      lock_status = 'LOCKED',
      answered_by_user_id = actor_id,
      answered_by_role = actor_role
  where id = answer_row.id
  returning * into answer_row;

  return answer_row;
end;
$$;

create or replace function public.unlock_work_order_report_item(
  target_case_id uuid,
  target_item_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  actor_id := public.current_app_user_id();

  update public.work_order_report_answers
  set locked_by_user_id = null,
      locked_at = null,
      lock_status = 'UNLOCKED'
  where expertise_case_id = target_case_id
    and item_id = target_item_id
    and (locked_by_user_id = actor_id or public.current_app_user_role() in ('BRANCH_MANAGER', 'CEO', 'GENERAL_MANAGER', 'QUALITY_AUDITOR'));
end;
$$;

create or replace function public.save_work_order_report_answer(
  target_case_id uuid,
  target_template_id text,
  target_group_id text,
  target_item_id text,
  target_nokta_id int,
  selected_option_ids text[],
  selected_option_labels text[],
  input_values jsonb,
  description_text text,
  image_urls text[],
  answer_status text
)
returns public.work_order_report_answers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_role text;
  previous_answer public.work_order_report_answers;
  next_answer public.work_order_report_answers;
begin
  actor_id := public.current_app_user_id();
  actor_role := coalesce(public.current_app_user_role(), '');

  if actor_id is null then
    raise exception 'Aktif kullanıcı bulunamadı.';
  end if;

  if answer_status not in ('DRAFT', 'COMPLETED') then
    raise exception 'Geçersiz cevap durumu.';
  end if;

  select * into previous_answer
  from public.work_order_report_answers
  where expertise_case_id = target_case_id
    and item_id = target_item_id
  for update;

  if previous_answer.id is not null
     and previous_answer.locked_by_user_id is not null
     and previous_answer.locked_by_user_id <> actor_id
     and previous_answer.locked_at > now() - interval '30 minutes' then
    raise exception 'Bu madde başka bir usta üzerinde.';
  end if;

  insert into public.work_order_report_answers (
    expertise_case_id,
    template_id,
    group_id,
    item_id,
    nokta_id,
    answered_by_user_id,
    answered_by_role,
    selected_option_ids,
    selected_option_labels,
    input_values,
    description,
    image_urls,
    status,
    started_at,
    completed_at,
    updated_at,
    locked_by_user_id,
    locked_at,
    lock_status
  )
  values (
    target_case_id,
    target_template_id,
    target_group_id,
    target_item_id,
    target_nokta_id,
    actor_id,
    actor_role,
    coalesce(selected_option_ids, '{}'),
    coalesce(selected_option_labels, '{}'),
    coalesce(input_values, '{}'::jsonb),
    coalesce(description_text, ''),
    coalesce(image_urls, '{}'),
    answer_status,
    now(),
    case when answer_status = 'COMPLETED' then now() else null end,
    now(),
    actor_id,
    now(),
    'LOCKED'
  )
  on conflict (expertise_case_id, item_id) do update set
    answered_by_user_id = excluded.answered_by_user_id,
    answered_by_role = excluded.answered_by_role,
    selected_option_ids = excluded.selected_option_ids,
    selected_option_labels = excluded.selected_option_labels,
    input_values = excluded.input_values,
    description = excluded.description,
    image_urls = excluded.image_urls,
    status = excluded.status,
    completed_at = case when excluded.status = 'COMPLETED' then now() else work_order_report_answers.completed_at end,
    updated_at = now(),
    locked_by_user_id = actor_id,
    locked_at = now(),
    lock_status = 'LOCKED'
  returning * into next_answer;

  perform public.recalculate_work_order_group_status(target_case_id, target_group_id);

  return next_answer;
end;
$$;

revoke execute on function public.recalculate_work_order_group_status(uuid, text) from public, anon;
revoke execute on function public.lock_work_order_report_item(uuid, text) from public, anon;
revoke execute on function public.unlock_work_order_report_item(uuid, text) from public, anon;
revoke execute on function public.save_work_order_report_answer(uuid, text, text, text, int, text[], text[], jsonb, text, text[], text) from public, anon;

grant execute on function public.recalculate_work_order_group_status(uuid, text) to authenticated;
grant execute on function public.lock_work_order_report_item(uuid, text) to authenticated;
grant execute on function public.unlock_work_order_report_item(uuid, text) to authenticated;
grant execute on function public.save_work_order_report_answer(uuid, text, text, text, int, text[], text[], jsonb, text, text[], text) to authenticated;
