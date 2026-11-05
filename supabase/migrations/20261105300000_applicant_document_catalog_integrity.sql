drop function if exists public.register_applicant_franchise_document(uuid,text,text,text,bigint);
drop function if exists app_private.register_applicant_franchise_document(uuid,text,text,text,bigint);

create function app_private.register_applicant_franchise_document(
  p_case_id uuid,p_storage_path text,p_document_code text,p_category text,
  p_mime_type text,p_size_bytes bigint,p_evidence_sha256 text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_role text:=public.franchise_claim_role(); v_id uuid;
  v_object storage.objects%rowtype; v_branch_type text;
begin
  if v_actor is null or v_role<>'applicant' then raise exception 'Kimliği doğrulanmış aday rolü zorunludur'; end if;
  select c.branch_type into v_branch_type from public.franchise_cases c where c.id=p_case_id and c.applicant_user_id=v_actor;
  if v_branch_type is null then raise exception 'Aday yalnız kendi franchise dosyasına belge ekleyebilir'; end if;
  if not exists(select 1 from public.franchise_document_requirements r where r.branch_type=v_branch_type and r.document_code=p_document_code and r.category=p_category and r.is_active)
    then raise exception 'Belge kodu ve kategorisi zorunlu belge kataloğuyla eşleşmiyor'; end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp') then raise exception 'Belge dosya tipi desteklenmiyor'; end if;
  if p_size_bytes not between 1 and 20971520 then raise exception 'Belge boyutu 20 MB sınırını aşıyor'; end if;
  if p_evidence_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Belge SHA-256 özeti geçersiz'; end if;
  if p_storage_path !~ ('^'||p_case_id::text||'/applicant/'||v_actor::text||'/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$') then raise exception 'Belge yolu aday kapsamıyla uyumsuz'; end if;
  select * into v_object from storage.objects where bucket_id='franchise-private' and name=p_storage_path and owner_id=v_actor::text;
  if not found then raise exception 'Özel Storage nesnesi bulunamadı veya kullanıcıya ait değil'; end if;
  if coalesce((v_object.metadata->>'size')::bigint,0)<>p_size_bytes or coalesce(v_object.metadata->>'mimetype','')<>p_mime_type then raise exception 'Storage belge metadatası eşleşmiyor'; end if;
  select id into v_id from public.franchise_documents where storage_path=p_storage_path;
  if v_id is not null then return v_id; end if;
  insert into public.franchise_documents(franchise_case_id,storage_path,document_code,category,classification,uploaded_by,mime_type,size_bytes,evidence_sha256)
  values(p_case_id,p_storage_path,p_document_code,p_category,case when p_category in ('identity','financial','legal') then 'restricted' else 'confidential' end,v_actor,p_mime_type,p_size_bytes,p_evidence_sha256)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function app_private.register_applicant_franchise_document(uuid,text,text,text,text,bigint,text) from public,anon;
grant execute on function app_private.register_applicant_franchise_document(uuid,text,text,text,text,bigint,text) to authenticated;

create function public.register_applicant_franchise_document(
  p_case_id uuid,p_storage_path text,p_document_code text,p_category text,
  p_mime_type text,p_size_bytes bigint,p_evidence_sha256 text
) returns uuid language sql security invoker set search_path=''
as $$ select app_private.register_applicant_franchise_document(p_case_id,p_storage_path,p_document_code,p_category,p_mime_type,p_size_bytes,p_evidence_sha256); $$;
revoke execute on function public.register_applicant_franchise_document(uuid,text,text,text,text,bigint,text) from public,anon;
grant execute on function public.register_applicant_franchise_document(uuid,text,text,text,text,bigint,text) to authenticated;
