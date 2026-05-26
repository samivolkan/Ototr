-- Final report media must be a first-class live data gate.
-- Every newly created work order gets the vehicle-wide photo/video checklist so
-- mobile can show and upload the required report media instead of a generic
-- "media fields not prepared" blocker.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]
where id = 'report-media';

update public.inspection_evidence_assets
set
  local_path = '',
  remote_url = '',
  file_hash = '',
  sync_status = 'MISSING',
  uploaded_at = null,
  quality_status = 'UNCHECKED',
  updated_at = now()
where remote_url like 'remote/%'
  and sync_status = 'UPLOADED';

create or replace function app_private.ensure_final_media_assets(
  target_case_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  with specs(sort_order, media_key, title, evidence_type) as (
    values
      (10, 'front', 'Araç ön fotoğrafı', 'IMAGE'),
      (20, 'rear', 'Araç arka fotoğrafı', 'IMAGE'),
      (30, 'right', 'Araç sağ yan fotoğrafı', 'IMAGE'),
      (40, 'left', 'Araç sol yan fotoğrafı', 'IMAGE'),
      (50, 'roof', 'Araç üst / tavan fotoğrafı', 'IMAGE'),
      (60, 'interior', 'Araç iç mekan fotoğrafı', 'IMAGE'),
      (70, 'trunk', 'Bagaj fotoğrafı', 'IMAGE'),
      (80, 'engine-bay', 'Motor bölmesi fotoğrafı', 'IMAGE'),
      (90, 'walkaround-video', 'Araç çevre video kaydı', 'VIDEO')
  )
  insert into public.inspection_evidence_assets (
    expertise_case_id,
    field_key,
    report_field_key,
    evidence_type,
    title,
    sync_status,
    is_required,
    quality_status
  )
  select
    target_case_id,
    'final_media.' || media_key,
    'report.final_media.' || media_key,
    evidence_type,
    title,
    'MISSING',
    true,
    'UNCHECKED'
  from specs
  where not exists (
    select 1
    from public.inspection_evidence_assets existing
    where existing.expertise_case_id = target_case_id
      and existing.field_key = 'final_media.' || specs.media_key
  );
$$;

grant execute on function app_private.ensure_final_media_assets(uuid) to authenticated;

create or replace function public.enforce_inspection_child_task_owner_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_role text;
  target_task_id uuid;
  target_owner uuid;
  target_field_key text;
begin
  actor_id := public.current_app_user_id();
  actor_role := public.current_app_user_role();

  if actor_role = 'BRANCH_MANAGER' then
    raise exception 'Mudur teknik kanit veya veri degistiremez.';
  end if;

  if tg_op = 'DELETE' then
    target_task_id := old.task_id;
    target_field_key := old.field_key;
  else
    target_task_id := new.task_id;
    target_field_key := new.field_key;
  end if;

  if target_task_id is null and target_field_key like 'final_media.%' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select owner_user_id into target_owner
  from public.inspection_tasks
  where id = target_task_id;

  if target_owner is null then
    raise exception 'Baslik sahiplenilmeden kanit/veri degistirilemez.';
  end if;

  if target_owner <> actor_id then
    raise exception 'Sadece gorev sahibi bu baslikta kanit/veri degistirebilir.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app_private.ensure_final_media_assets_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  perform app_private.ensure_final_media_assets(new.id);
  return new;
end;
$$;

drop trigger if exists trg_ensure_final_media_assets on public.expertise_cases;
create trigger trg_ensure_final_media_assets
after insert on public.expertise_cases
for each row execute function app_private.ensure_final_media_assets_trigger();
