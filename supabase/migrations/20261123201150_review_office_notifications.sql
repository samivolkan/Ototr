-- Private observation state contains Google IDs, never comment/customer text.
create table app_private.review_office_observations (
 branch_id text primary key, seen_reviews text[] not null, seen_replies text[] not null,
 goal_month text, goal_state text, revision bigint not null default 1, updated_at timestamptz not null default now()
);
alter table app_private.review_office_observations enable row level security;
revoke all on app_private.review_office_observations from public,anon,authenticated;
grant select,insert,update on app_private.review_office_observations to service_role;
alter table public.google_review_notifications drop constraint google_review_notifications_event_check;
alter table public.google_review_notifications add constraint google_review_notifications_event_check check(event in ('sla_overdue','critical_review','legal_hold','new_review','reply_published','goal_below','goal_met','goal_above'));
create function public.observe_review_office(p_branch_id text,p_review_ids text[],p_reply_ids text[],p_month text,p_target integer,p_total integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prev app_private.review_office_observations; recipient uuid; new_reviews integer; new_replies integer; goal text; rev bigint; inserted_count integer:=0;
begin
 if p_branch_id is null or p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_review_ids is null or p_reply_ids is null or p_total is null or p_total<0 or cardinality(p_review_ids)>100000 then raise exception 'Geçersiz gözlem'; end if;
 select connected_by into recipient from public.google_business_connections where id='ototr-primary';
 if recipient is null then raise exception 'Bildirim alıcısı bulunamadı'; end if;
 perform pg_advisory_xact_lock(hashtextextended('review-office:'||p_branch_id,0));
 goal:=case when p_target is null or p_target<=0 then null when p_total<p_target then 'below' when p_total=p_target then 'met' else 'above' end;
 select * into prev from app_private.review_office_observations where branch_id=p_branch_id for update;
 if not found then
 insert into app_private.review_office_observations(branch_id,seen_reviews,seen_replies,goal_month,goal_state) values(p_branch_id,p_review_ids,p_reply_ids,p_month,goal);
 return jsonb_build_object('baseline',true,'created',0);
 end if;
 rev:=prev.revision+1;
 select count(*) into new_reviews from (select distinct unnest(p_review_ids) id except select unnest(prev.seen_reviews)) t;
 select count(*) into new_replies from (select distinct unnest(p_reply_ids) id except select unnest(prev.seen_replies)) t;
 if new_reviews>0 then
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key) values('ototr-primary',p_branch_id,recipient,'new_review','Yeni yorum geldi',new_reviews||' yeni Google yorumu alındı. Yorum Ekibi ekranından inceleyebilirsiniz.','office:new:'||rev) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end if;
 if new_replies>0 then
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key) values('ototr-primary',p_branch_id,recipient,'reply_published','Yorum yanıtı yayımlandı',new_replies||' yorumun yanıtı Google üzerinde doğrulandı.','office:reply:'||rev) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end if;
 if goal is not null and prev.goal_state is not null and prev.goal_month=p_month and goal<>prev.goal_state then
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key) values('ototr-primary',p_branch_id,recipient,'goal_'||goal,case goal when 'below' then 'Yorum hedefinin altına düşüldü' when 'met' then 'Yorum hedefine ulaşıldı' else 'Yorum hedefinin üstüne çıkıldı' end,p_month||': '||p_total||' / '||p_target||' toplam yorum.','office:goal:'||rev) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end if;
 update app_private.review_office_observations set seen_reviews=array(select distinct unnest(prev.seen_reviews||p_review_ids)),seen_replies=array(select distinct unnest(prev.seen_replies||p_reply_ids)),goal_month=p_month,goal_state=goal,revision=rev,updated_at=now() where branch_id=p_branch_id;
 return jsonb_build_object('baseline',false,'created',inserted_count);
end $$;
revoke all on function public.observe_review_office(text,text[],text[],text,integer,integer) from public,anon,authenticated;
grant execute on function public.observe_review_office(text,text[],text[],text,integer,integer) to service_role;
