begin;

create table public.franchise_due_diligence_reviews (
 id uuid primary key default gen_random_uuid(), franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
 checklist_version text not null, risk_level text not null check(risk_level in ('low','medium','high')),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected')),
 evidence_sha256 text not null check(evidence_sha256 ~ '^[a-f0-9]{64}$'), maker_id uuid not null references auth.users(id),
 checker_id uuid references auth.users(id), reviewed_at timestamptz, review_note text, created_at timestamptz not null default now(),
 unique(franchise_case_id), check(checker_id is null or checker_id<>maker_id)
);

create table public.franchise_territory_protections (
 id uuid primary key default gen_random_uuid(), franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
 protection_type text not null check(protection_type in ('polygon','district','radius')),
 city text not null, district text, radius_km numeric(6,2), center_latitude numeric(9,6), center_longitude numeric(9,6), polygon_geojson jsonb,
 status text not null default 'submitted' check(status in ('submitted','approved','rejected')),
 maker_id uuid not null references auth.users(id), checker_id uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(franchise_case_id), check(checker_id is null or checker_id<>maker_id),
 check((protection_type='district' and district is not null and radius_km is null and polygon_geojson is null)
    or (protection_type='radius' and radius_km>0 and center_latitude between -90 and 90 and center_longitude between -180 and 180 and polygon_geojson is null)
    or (protection_type='polygon' and polygon_geojson->>'type'='Polygon' and jsonb_array_length(polygon_geojson->'coordinates')>0 and radius_km is null))
);

create table public.franchise_contracts (
 id uuid primary key default gen_random_uuid(), franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
 contract_no text not null unique, template_version text not null, signature_method text not null check(signature_method in ('wet','esign')),
 signature_provider text, provider_request_reference text, provider_status text check(provider_status in ('not_requested','pending','completed','failed','cancelled')),
 signed_at timestamptz, evidence_sha256 text check(evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'draft' check(status in ('draft','signature_pending','submitted','approved','rejected')),
 maker_id uuid not null references auth.users(id), checker_id uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(franchise_case_id), check(checker_id is null or checker_id<>maker_id),
 check((signature_method='wet' and signature_provider is null and provider_request_reference is null)
    or signature_method='esign'),
 check(status not in ('submitted','approved') or (signed_at is not null and evidence_sha256 is not null and (signature_method='wet' or provider_status='completed')))
);

create table public.franchise_site_visits (
 id uuid primary key default gen_random_uuid(), franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
 visited_at timestamptz not null, latitude numeric(9,6) not null check(latitude between -90 and 90), longitude numeric(9,6) not null check(longitude between -180 and 180),
 photo_count smallint not null check(photo_count>=4), measurements jsonb not null,
 evidence_sha256 text not null check(evidence_sha256 ~ '^[a-f0-9]{64}$'), status text not null default 'submitted' check(status in ('submitted','approved','rejected')),
 inspector_id uuid not null references auth.users(id), checker_id uuid references auth.users(id), reviewed_at timestamptz, review_note text, created_at timestamptz not null default now(),
 unique(franchise_case_id), check(checker_id is null or checker_id<>inspector_id),
 check(jsonb_typeof(measurements)='object' and measurements ?& array['gross_area_m2','work_bay_count','ceiling_height_m'])
);

alter table public.franchise_due_diligence_reviews enable row level security;
alter table public.franchise_territory_protections enable row level security;
alter table public.franchise_contracts enable row level security;
alter table public.franchise_site_visits enable row level security;
revoke all on public.franchise_due_diligence_reviews,public.franchise_territory_protections,public.franchise_contracts,public.franchise_site_visits from anon,authenticated;
grant select,insert,update on public.franchise_due_diligence_reviews,public.franchise_territory_protections,public.franchise_contracts,public.franchise_site_visits to authenticated;

create policy franchise_due_diligence_access on public.franchise_due_diligence_reviews for all to authenticated
using(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal'))
with check(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal'));
create policy franchise_territory_access on public.franchise_territory_protections for all to authenticated
using(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal','architecture'))
with check(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal','architecture'));
create policy franchise_contract_access on public.franchise_contracts for all to authenticated
using(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal'))
with check(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','legal'));
create policy franchise_site_visit_access on public.franchise_site_visits for all to authenticated
using(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','operations','architecture','inspector'))
with check(public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','operations','architecture','inspector'));

create or replace function public.franchise_legal_record_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_maker uuid; v_role text:=public.franchise_claim_role(); v_old jsonb:=to_jsonb(old); v_new jsonb:=to_jsonb(new);
begin
 v_maker:=coalesce((v_old->>'maker_id')::uuid,(v_old->>'inspector_id')::uuid);
 if v_old-array['status','checker_id','reviewed_at','review_note'] <> v_new-array['status','checker_id','reviewed_at','review_note'] then raise exception 'Hukuk/lokasyon kaydının kanıt ve kapsam alanları değiştirilemez'; end if;
 if old.status<>'submitted' or new.status not in ('approved','rejected') then raise exception 'Yalnız gönderilmiş kayıt bir kez incelenebilir'; end if;
 if auth.uid() is null or new.checker_id<>auth.uid() or auth.uid()=v_maker or new.reviewed_at is null then raise exception 'Bağımsız kontrolör bilgisi geçersiz'; end if;
 if tg_table_name='franchise_site_visits' and v_role not in ('gm','operations','architecture') then raise exception 'Saha ziyareti onay yetkisi yok'; end if;
 if tg_table_name<>'franchise_site_visits' and v_role not in ('gm','franchise_director','legal') then raise exception 'Hukuk kaydı onay yetkisi yok'; end if;
 return new;
end $$;
create trigger franchise_due_diligence_guard_trigger before update on public.franchise_due_diligence_reviews for each row execute function public.franchise_legal_record_guard();
create trigger franchise_territory_guard_trigger before update on public.franchise_territory_protections for each row execute function public.franchise_legal_record_guard();
create trigger franchise_contract_guard_trigger before update on public.franchise_contracts for each row execute function public.franchise_legal_record_guard();
create trigger franchise_site_visit_guard_trigger before update on public.franchise_site_visits for each row execute function public.franchise_legal_record_guard();

create or replace function public.franchise_legal_location_ready(p_case_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.franchise_due_diligence_reviews where franchise_case_id=p_case_id and status='approved')
 and exists(select 1 from public.franchise_territory_protections where franchise_case_id=p_case_id and status='approved')
 and exists(select 1 from public.franchise_contracts where franchise_case_id=p_case_id and status='approved' and signed_at is not null and evidence_sha256 is not null and (signature_method='wet' or provider_status='completed'))
 and exists(select 1 from public.franchise_site_visits where franchise_case_id=p_case_id and status='approved' and photo_count>=4)
$$;

create or replace function public.review_franchise_legal_record(p_record_type text,p_record_id uuid,p_approve boolean,p_note text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_maker uuid; v_status text;
begin
 if public.franchise_claim_role() not in ('gm','franchise_director','legal','operations','architecture') then raise exception 'Hukuk/lokasyon inceleme yetkisi yok'; end if;
 if p_record_type='due_diligence' then select maker_id,status into v_maker,v_status from public.franchise_due_diligence_reviews where id=p_record_id for update;
 elsif p_record_type='territory' then select maker_id,status into v_maker,v_status from public.franchise_territory_protections where id=p_record_id for update;
 elsif p_record_type='contract' then select maker_id,status into v_maker,v_status from public.franchise_contracts where id=p_record_id for update;
 elsif p_record_type='site_visit' then select inspector_id,status into v_maker,v_status from public.franchise_site_visits where id=p_record_id for update;
 else raise exception 'Bilinmeyen hukuk/lokasyon kayıt tipi'; end if;
 if v_status is null or v_status<>'submitted' then raise exception 'İnceleme bekleyen kayıt bulunamadı'; end if;
 if v_maker=auth.uid() then raise exception 'Kaydı oluşturan kendi kaydını onaylayamaz'; end if;
 if p_record_type in ('due_diligence','territory','contract') and public.franchise_claim_role() not in ('gm','franchise_director','legal') then raise exception 'Hukuk kaydı onay yetkisi yok'; end if;
 if p_record_type='site_visit' and public.franchise_claim_role() not in ('gm','operations','architecture') then raise exception 'Saha ziyareti onay yetkisi yok'; end if;
 if p_record_type='due_diligence' then update public.franchise_due_diligence_reviews set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=left(p_note,2000) where id=p_record_id;
 elsif p_record_type='territory' then update public.franchise_territory_protections set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now() where id=p_record_id;
 elsif p_record_type='contract' then update public.franchise_contracts set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now() where id=p_record_id;
 else update public.franchise_site_visits set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=left(p_note,2000) where id=p_record_id; end if;
 return p_approve;
end $$;

create or replace function public.franchise_branch_legal_location_gate()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin if not public.franchise_legal_location_ready(new.franchise_case_id) then raise exception 'Due diligence, sözleşme, bölge koruma veya saha ziyareti kapısı eksik'; end if; return new; end $$;
create trigger franchise_branch_legal_location_gate_trigger before insert on public.franchise_branches for each row execute function public.franchise_branch_legal_location_gate();

revoke all on function public.franchise_legal_record_guard(),public.franchise_legal_location_ready(uuid),public.review_franchise_legal_record(text,uuid,boolean,text),public.franchise_branch_legal_location_gate() from public,anon;
grant execute on function public.franchise_legal_location_ready(uuid),public.review_franchise_legal_record(text,uuid,boolean,text) to authenticated;
commit;
