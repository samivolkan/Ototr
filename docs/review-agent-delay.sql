-- Explicit Sami decision: two hours after draft readiness, existing safe-auto policy retained.
alter table public.google_review_work_items add column draft_ready_at timestamptz, add column auto_send_after timestamptz;
create function app_private.stamp_review_ready() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='reply' and new.status='approval_pending' and length(trim(new.reply_text))>0 then
  if tg_op='INSERT' then
   new.draft_ready_at:=clock_timestamp();new.auto_send_after:=new.draft_ready_at+interval '2 hours';
  elsif old.status is distinct from 'approval_pending' or new.reply_text is distinct from old.reply_text or new.version is distinct from old.version then
   new.draft_ready_at:=clock_timestamp();new.auto_send_after:=new.draft_ready_at+interval '2 hours';
  else new.draft_ready_at:=old.draft_ready_at;new.auto_send_after:=old.auto_send_after;
  end if;
 elsif tg_op='UPDATE' then new.draft_ready_at:=old.draft_ready_at;new.auto_send_after:=old.auto_send_after;
 else new.draft_ready_at:=null;new.auto_send_after:=null;
 end if;
 return new;
end $$;
-- Existing unpublished drafts receive the complete new review window.
update public.google_review_work_items set draft_ready_at=clock_timestamp(),auto_send_after=clock_timestamp()+interval '2 hours' where kind='reply' and status='approval_pending';
create trigger stamp_review_ready before insert or update on public.google_review_work_items for each row execute function app_private.stamp_review_ready();
revoke all on function app_private.stamp_review_ready() from public,anon,authenticated;
create table public.google_review_agent_profile(id text primary key check(id='REV-01'),profile jsonb not null,version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid references auth.users(id));
alter table public.google_review_agent_profile enable row level security;
revoke all on public.google_review_agent_profile from public,anon,authenticated;
grant select,update on public.google_review_agent_profile to service_role;
insert into public.google_review_agent_profile(id,profile) values('REV-01','{"mission":"Google yorumlarını takip etmek ve marka üslubunda yanıt taslağı sürecini yönetmek.","scope":"Nilüfer şubesi; yeni yorum, taslak, iki saatlik bekleme ve doğrulanmış yayın takibi.","tone":"Doğal, nazik ve kısa Türkçe. Tarafsız Rapor, Gerçek Güvence. Kişisel bilgi tekrarlanmaz.","escalation":"Düşük yıldız, hukuk, güvenlik, kişisel veri ve ciddi teknik iddialar insan incelemesine yönlendirilir.","acceptance":"Google sonucu doğrulanmadan yayımlandı denmez; mevcut yanıt değiştirilmez; başarısızlık ve belirsizlik ayrı izlenir."}');
create function public.google_review_office_summary() returns jsonb language sql security invoker set search_path='' as $$
 with items as(select *,draft_source='openai' and coalesce((review_snapshot->>'rating') in ('4','5'),false) and review_snapshot->'ai_analysis'->>'requires_human_review'='false' and coalesce(review_snapshot->'ai_analysis'->>'generation_id','')<>'' and not coalesce((review_snapshot->>'legal_hold')::boolean,false) and not (review_snapshot ? 'rejection') and not coalesce((review_snapshot->>'reply_conflict')::boolean,false) as safe from public.google_review_work_items where branch_id='branch-google-nilufer' and connection_id='ototr-primary' and kind='reply')
 select jsonb_build_object('preparing',count(*) filter(where status='preparing'),'waiting',count(*) filter(where status='approval_pending' and safe and auto_send_after>now()),'due',count(*) filter(where status='approval_pending' and safe and auto_send_after<=now()),'human',count(*) filter(where status='approval_pending' and not coalesce(safe,false)),'published',count(*) filter(where status='published'),'failed',count(*) filter(where status in ('draft_failed','publish_failed')),'unknown',count(*) filter(where status in ('publishing','publish_unknown')),'next_due',min(auto_send_after) filter(where status='approval_pending' and safe),'automatic_send_after_minutes',120) from items;
$$;
revoke all on function public.google_review_office_summary() from public,anon,authenticated;
grant execute on function public.google_review_office_summary() to service_role;
update public.google_review_automation set interval_minutes=5,next_run_at=now()+interval '5 minutes' where branch_id='branch-google-nilufer';
select cron.alter_job(jobid,schedule:='*/5 * * * *') from cron.job where jobname='ototr-nilufer-review-automation';
