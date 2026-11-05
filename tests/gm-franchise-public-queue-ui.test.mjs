import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');
test('live public intake queue is visible only to Franchise maker roles',()=>{
 assert.match(html,/\["web-kuyruk","ADY","Web başvuru kuyruğu"/);
 for(const role of ['gm:','fd:','fu:'])assert.match(html,new RegExp(role+'[^\\n]*web-kuyruk'));
 for(const role of ['hk:','fn:','ik:','ak:'])assert.doesNotMatch(html,new RegExp(role+'[^\\n]*web-kuyruk'));
});
test('queue UI is session-backed, consent gated and does not render raw public PII',()=>{
 assert.match(html,/import \{franchiseLiveClient\} from "\.\/franchise-live-client\.mjs"/);
 assert.match(html,/İzin tamamlanmadan kilitli/);assert.match(html,/Ham ad-soyad, telefon ve belge içeriği bu ekranda gösterilmez/);
 assert.match(html,/item\?\.status!=="ready_for_canonicalization"/);assert.match(html,/franchiseLiveClient\.listQueue\(\)/);assert.match(html,/franchiseLiveClient\.canonicalize\(/);
});
test('canonicalization sends normalized references and no source full name, phone or payload',()=>{
 for(const key of ['p_source_application_id','p_applicant_user_id','p_candidate_name','p_contact_reference','p_identity_verification_ref','p_financial_document_ref'])assert.match(html,new RegExp(key));
 assert.doesNotMatch(html,/p_(?:full_name|phone|payload|request_meta)/);
});
