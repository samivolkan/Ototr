begin;

create or replace function app_private.register_applicant_franchise_document(
  p_case_id uuid,p_storage_path text,p_category text,p_mime_type text,p_size_bytes bigint
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_role text:=public.franchise_claim_role(); v_id uuid; v_object storage.objects%rowtype;
begin
  if v_actor is null or v_role<>'applicant' then raise exception 'Kimliği doğrulanmış aday rolü zorunludur'; end if;
  if not exists(select 1 from public.franchise_cases c where c.id=p_case_id and c.applicant_user_id=v_actor) then raise exception 'Aday yalnız kendi franchise dosyasına belge ekleyebilir'; end if;
  if p_category not in ('identity','financial','location','other') then raise exception 'Aday belge kategorisi geçersiz'; end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp') then raise exception 'Belge dosya tipi desteklenmiyor'; end if;
  if p_size_bytes not between 1 and 20971520 then raise exception 'Belge boyutu 20 MB sınırını aşıyor'; end if;
  if p_storage_path !~ ('^'||p_case_id::text||'/applicant/'||v_actor::text||'/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$') then raise exception 'Belge yolu aday kapsamıyla uyumsuz'; end if;
  select * into v_object from storage.objects where bucket_id='franchise-private' and name=p_storage_path and owner_id=v_actor::text;
  if not found then raise exception 'Özel Storage nesnesi bulunamadı veya kullanıcıya ait değil'; end if;
  if coalesce((v_object.metadata->>'size')::bigint,0)<>p_size_bytes or coalesce(v_object.metadata->>'mimetype','')<>p_mime_type then raise exception 'Storage belge metadatası eşleşmiyor'; end if;
  select id into v_id from public.franchise_documents where storage_path=p_storage_path;
  if v_id is not null then return v_id; end if;
  insert into public.franchise_documents(franchise_case_id,storage_path,category,classification,uploaded_by,mime_type,size_bytes)
  values(p_case_id,p_storage_path,p_category,case when p_category in ('identity','financial') then 'restricted' else 'confidential' end,v_actor,p_mime_type,p_size_bytes)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function app_private.register_applicant_franchise_document(uuid,text,text,text,bigint) from public,anon;
grant execute on function app_private.register_applicant_franchise_document(uuid,text,text,text,bigint) to authenticated;

create or replace function public.register_applicant_franchise_document(
  p_case_id uuid,p_storage_path text,p_category text,p_mime_type text,p_size_bytes bigint
) returns uuid language sql security invoker set search_path=''
as $$ select app_private.register_applicant_franchise_document(p_case_id,p_storage_path,p_category,p_mime_type,p_size_bytes); $$;
revoke execute on function public.register_applicant_franchise_document(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.register_applicant_franchise_document(uuid,text,text,text,bigint) to authenticated;

drop policy if exists franchise_storage_applicant_orphan_cleanup on storage.objects;
create policy franchise_storage_applicant_orphan_cleanup on storage.objects for delete to authenticated using (
  bucket_id='franchise-private'
  and owner_id=(select auth.uid())::text
  and created_at>now()-interval '15 minutes'
  and (storage.foldername(name))[2]='applicant'
  and (storage.foldername(name))[3]=(select auth.uid())::text
  and exists(select 1 from public.franchise_cases c where c.id::text=(storage.foldername(name))[1] and c.applicant_user_id=(select auth.uid()))
  and not exists(select 1 from public.franchise_documents d where d.storage_path=name)
);

commit;
