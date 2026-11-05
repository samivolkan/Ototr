const DEFAULT_API='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications';
const CONSENT_VERSION='FR-KVKK-2026-11';
const form=document.getElementById('franchise-form'),button=document.getElementById('submit'),status=document.getElementById('status');
const clean=(value,max=500)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
function endpoint(){return String(globalThis.OTOTR_FRANCHISE_PUBLIC_CONFIG?.apiUrl||DEFAULT_API)}
export function formPayload(data){
  return{source:'github_staging_franchise_form',fullName:clean(data.get('fullName'),120),phone:clean(data.get('phone'),40),province:clean(data.get('province'),80),district:clean(data.get('district'),80),applicationType:clean(data.get('applicationType'),160),budget:clean(data.get('budget'),80),equityBand:clean(data.get('equityBand'),80),managementExperienceYears:Number.parseInt(String(data.get('managementExperienceYears')||'0'),10),companyStatus:clean(data.get('companyStatus'),80),partnershipStructure:clean(data.get('partnershipStructure'),80),hasLocation:clean(data.get('hasLocation'),80),region:clean(data.get('region'),80),note:clean(data.get('note'),1500),companyWebsite:clean(data.get('companyWebsite'),120),kvkkConsent:data.get('kvkkConsent')==='on',processingConsent:data.get('processingConsent')==='on',contactConsent:data.get('contactConsent')==='on',consentVersion:CONSENT_VERSION};
}
function show(message,tone=''){status.className=`status note ${tone}`;status.textContent=message}
if(form)form.addEventListener('submit',async(event)=>{
  event.preventDefault();if(!form.reportValidity())return;
  const payload=formPayload(new FormData(form));
  if(!payload.kvkkConsent||!payload.processingConsent){show('Aydınlatma teyidi ve veri işleme kararı olmadan başvuru alınamaz.','error');return}
  button.disabled=true;show('Sentetik başvuru güvenli kuyruğa gönderiliyor…');
  try{const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await response.json().catch(()=>null);if(!response.ok||!body?.ok)throw new Error(body?.error||'Başvuru kaydedilemedi.');form.reset();show(`Başvuru alındı. Referans: ${body.referenceNo}`,'safe')}
  catch(error){show(error.message||'Başvuru kaydedilemedi. Lütfen daha sonra tekrar deneyin.','error')}
  finally{button.disabled=false}
});
