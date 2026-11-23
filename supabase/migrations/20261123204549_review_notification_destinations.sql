alter table public.google_review_notifications add column review_id text, add column goal_month text;
create or replace function public.observe_review_office(p_branch_id text,p_review_ids text[],p_reply_ids text[],p_month text,p_target integer,p_total integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prev app_private.review_office_observations; recipient uuid; new_reviews integer; new_replies integer; goal text; rev bigint; inserted_count integer:=0; review_key text;
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
 for review_key in (select distinct unnest(p_review_ids) except select unnest(prev.seen_reviews)) loop
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key,review_id) values('ototr-primary',p_branch_id,recipient,'new_review','Yeni yorum geldi','Google yorumu alındı. Yorumu açmak için tıklayın.','office:new:'||rev||':'||review_key,review_key) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end loop;
 for review_key in (select distinct unnest(p_reply_ids) except select unnest(prev.seen_replies)) loop
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key,review_id) values('ototr-primary',p_branch_id,recipient,'reply_published','Yorum yanıtı yayımlandı','Yanıt Google üzerinde doğrulandı. Yorumu açmak için tıklayın.','office:reply:'||rev||':'||review_key,review_key) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end loop;
 if goal is not null and prev.goal_state is not null and prev.goal_month=p_month and goal<>prev.goal_state then
 insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,source_key,goal_month) values('ototr-primary',p_branch_id,recipient,'goal_'||goal,case goal when 'below' then 'Yorum hedefinin altına düşüldü' when 'met' then 'Yorum hedefine ulaşıldı' else 'Yorum hedefinin üstüne çıkıldı' end,p_month||': '||p_total||' / '||p_target||' toplam yorum.','office:goal:'||rev,p_month) on conflict do nothing;
 inserted_count:=inserted_count+1;
 end if;
 update app_private.review_office_observations set seen_reviews=array(select distinct unnest(prev.seen_reviews||p_review_ids)),seen_replies=array(select distinct unnest(prev.seen_replies||p_reply_ids)),goal_month=p_month,goal_state=goal,revision=rev,updated_at=now() where branch_id=p_branch_id;
 return jsonb_build_object('baseline',false,'created',inserted_count);
end $$;
revoke all on function public.observe_review_office(text,text[],text[],text,integer,integer) from public,anon,authenticated;
grant execute on function public.observe_review_office(text,text[],text[],text,integer,integer) to service_role;
