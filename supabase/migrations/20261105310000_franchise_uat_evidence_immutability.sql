alter table public.franchise_uat_results
  add constraint franchise_uat_review_note_check check (
    (status='submitted' and checker_id is null and checker_role is null and checker_note is null and reviewed_at is null)
    or (status in ('approved','rejected') and checker_id is not null and checker_role is not null
        and length(trim(checker_note)) between 10 and 2000 and reviewed_at is not null)
    or status='superseded'
  );

create or replace function public.franchise_uat_result_review_guard()
returns trigger
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
  if new.release_candidate<>old.release_candidate
    or new.scenario_code<>old.scenario_code
    or new.revision<>old.revision
    or new.executor_id<>old.executor_id
    or new.executor_role<>old.executor_role
    or new.evidence_sha256<>old.evidence_sha256
    or new.result_summary<>old.result_summary
    or new.submitted_at<>old.submitted_at then
    raise exception 'UAT senaryosu, çalıştıran kişi ve kanıt inceleme sırasında değiştirilemez';
  end if;
  if old.status<>'submitted' or new.status not in ('approved','rejected') then
    raise exception 'Yalnız gönderilmiş UAT sonucu bir kez incelenebilir';
  end if;
  if new.checker_id is null or new.checker_id=old.executor_id
    or new.checker_role is null or length(trim(coalesce(new.checker_note,''))) not between 10 and 2000
    or new.reviewed_at is null then
    raise exception 'Bağımsız inceleyici ve 10-2000 karakter inceleme notu zorunludur';
  end if;
  return new;
end;
$$;

drop trigger if exists franchise_uat_result_review_guard_trigger on public.franchise_uat_results;
create trigger franchise_uat_result_review_guard_trigger
before update on public.franchise_uat_results
for each row execute function public.franchise_uat_result_review_guard();

revoke all on function public.franchise_uat_result_review_guard() from public,anon,authenticated;
