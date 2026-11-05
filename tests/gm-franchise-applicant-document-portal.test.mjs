import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261105270000_franchise_applicant_document_portal.sql',import.meta.url),'utf8');
const catalogIntegrity=await readFile(new URL('../supabase/migrations/20261105300000_applicant_document_catalog_integrity.sql',import.meta.url),'utf8');
test('applicant document registration is private, invoker wrapped and owner scoped',()=>{
 assert.match(sql,/function app_private\.register_applicant_franchise_document/);assert.match(sql,/function public\.register_applicant_franchise_document[\s\S]*security invoker/i);
 assert.match(sql,/v_role<>'applicant'/);assert.match(sql,/c\.applicant_user_id=v_actor/);assert.match(sql,/owner_id=v_actor::text/);
 assert.match(sql,/revoke execute on function public\.register_applicant_franchise_document[\s\S]*from public,anon/i);
});
test('applicant registration binds catalog code, category and SHA-256 integrity',()=>{
 assert.match(catalogIntegrity,/r\.document_code=p_document_code and r\.category=p_category/);
 assert.match(catalogIntegrity,/p_evidence_sha256 !~ '\^\[a-f0-9\]\{64\}\$'/);
 assert.match(catalogIntegrity,/insert into public\.franchise_documents\(franchise_case_id,storage_path,document_code/);
});
test('document path, type, size and storage metadata fail closed',()=>{
 assert.match(sql,/p_category not in \('identity','financial','location','other'\)/);assert.match(sql,/application\/pdf/);assert.match(sql,/20971520/);
 assert.match(sql,/p_storage_path !~/);assert.match(sql,/v_object\.metadata->>'size'/);assert.match(sql,/v_object\.metadata->>'mimetype'/);
});
test('orphan cleanup is narrow and cannot delete a registered document',()=>{
 assert.match(sql,/policy franchise_storage_applicant_orphan_cleanup/);assert.match(sql,/created_at>now\(\)-interval '15 minutes'/);
 assert.match(sql,/not exists\(select 1 from public\.franchise_documents d where d\.storage_path=name\)/);
});
