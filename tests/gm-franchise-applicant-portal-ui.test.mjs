import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const html=await readFile(new URL('../franchise-aday-portali/index.html',import.meta.url),'utf8'),js=await readFile(new URL('../franchise-aday-portali/applicant-portal.mjs',import.meta.url),'utf8');
test('applicant portal exposes all decided applicant capabilities without public PII',()=>{
 for(const label of ['Başvuru işleri','Özel belge alanı','Başvuru dosyası','Kimlik doğrulama','Finansal belge'])assert.match(html,new RegExp(label));
 for(const type of ['status','document_request','appointment','message','contract','payment_plan','training'])assert.match(js,new RegExp(type));
 assert.doesNotMatch(html,/T\.C\. kimlik numarası|IBAN|banka hesabı/i);
});
test('portal renders remote values through HTML escaping and begins disconnected until session load',()=>{
 assert.match(js,/const \$=id=>document\.getElementById\(id\),H=value=>/);assert.match(js,/H\(x\.title\)/);assert.match(js,/H\(x\.reference_code\)/);
 assert.match(html,/Mevcut ERP\/Supabase aday oturumunuz kontrol ediliyor/);assert.match(js,/\$\('content'\)\.hidden=true/);
});
