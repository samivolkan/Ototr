import {createApplicantPortalClient,runtimeConfig} from '../franchise-aday-portali/applicant-portal-client.mjs';

const required=name=>{const value=process.env[name];if(!value)throw new Error(`${name} gerekli`);return value};
const email=required('FRANCHISE_E2E_EMAIL');
const password=required('FRANCHISE_E2E_PASSWORD');
const caseId=required('FRANCHISE_E2E_CASE_ID');
const itemId=required('FRANCHISE_E2E_ITEM_ID');
const documentObjectId=required('FRANCHISE_E2E_OBJECT_ID');
const mode=process.argv[2]||'run';
const config=runtimeConfig();

const authResponse=await fetch(`${config.url}/auth/v1/token?grant_type=password`,{
  method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})
});
const session=await authResponse.json().catch(()=>null);
if(!authResponse.ok||!session?.access_token||!session?.user?.id)throw new Error('Sentetik aday oturumu açılamadı');
const getSession=async()=>session;
const client=createApplicantPortalClient({config,getSession,uuid:()=>documentObjectId});
const objectPath=`${caseId}/applicant/${session.user.id}/${documentObjectId}.pdf`;

if(mode==='cleanup'){
  const encoded=objectPath.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(`${config.url}/storage/v1/object/franchise-private/${encoded}`,{
    method:'DELETE',headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`}
  });
  if(!response.ok)throw new Error('Sentetik Storage nesnesi temizlenemedi');
  console.log(JSON.stringify({storageCleanup:true}));
  process.exit(0);
}

const before=await client.load();
if(before.cases.length!==1||before.cases[0].id!==caseId)throw new Error('Aday yalnız kendi sentetik dosyasını göremedi');
if(before.work.length!==1||before.work[0].item_id!==itemId)throw new Error('Atanmış belge görevi görünmedi');
if(before.documents.length!==0)throw new Error('Test öncesi belge listesi boş değil');

const pdf=new Blob(['%PDF-1.4\n% OTOTR SYNTHETIC HOSTED ACCEPTANCE ONLY\n%%EOF\n'],{type:'application/pdf'});
const documentId=await client.uploadDocument({caseId,documentCode:'financial_statement',category:'financial',file:pdf});
if(!/^[0-9a-f-]{36}$/i.test(String(documentId)))throw new Error('Belge kayıt RPC geçerli kimlik döndürmedi');

const uploaded=await client.load();
if(uploaded.documents.length!==1||uploaded.documents[0].id!==documentId)throw new Error('Yüklenen belge aday görünümünde doğrulanamadı');
await client.complete(itemId,'submitted',documentId);
const completed=await client.load();
if(completed.work[0]?.item_status!=='submitted'||completed.work[0]?.action_reference!==documentId)throw new Error('Belge görevi güvenli referansla tamamlanmadı');

console.log(JSON.stringify({auth:true,ownCaseOnly:true,portalWork:true,privateUpload:true,documentRpc:true,portalRead:true,itemCompletion:true,documentId,objectPath}));
