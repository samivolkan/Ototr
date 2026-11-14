const STORAGE_KEY='ototr.franchise.demo-intake.v1';

const safeText=(value,max=160)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);

export function demoIntakeMode(locationLike=globalThis.location){
  return new URLSearchParams(locationLike?.search||'').get('demo')==='1';
}

export function readDemoIntake(storage=globalThis.localStorage){
  try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}
}

export function enqueueDemoIntake(payload,storage=globalThis.localStorage,now=new Date()){
  if(!payload?.kvkkConsent||!payload?.processingConsent)throw new Error('Zorunlu izinler olmadan demo başvurusu oluşturulamaz.');
  const referenceNo=`DEMO-WEB-${now.getTime().toString(36).toUpperCase()}`;
  const item={source_application_id:referenceNo,source:'Web formu · tarayıcı içi demo',province:safeText(payload.province,80),district:safeText(payload.district,80),submitted_at:now.toISOString(),status:'ready_for_canonicalization',budget_band:safeText(payload.budget,40),equity_band:safeText(payload.equityBand,40),management_experience_years:Number(payload.managementExperienceYears)||0,sector_experience:safeText(payload.sectorExperience,40),company_status:safeText(payload.companyStatus,40),location_status:safeText(payload.hasLocation,40),partnership_structure:safeText(payload.partnershipStructure,40),application_type:safeText(payload.applicationType,120),commercial_consent:Boolean(payload.contactConsent),consent_version:safeText(payload.consentVersion,80)};
  const queue=[item,...readDemoIntake(storage).filter(x=>x.source_application_id!==referenceNo)].slice(0,20);storage?.setItem(STORAGE_KEY,JSON.stringify(queue));return item;
}

export function removeDemoIntake(referenceNo,storage=globalThis.localStorage){
  const queue=readDemoIntake(storage).filter(item=>item.source_application_id!==referenceNo);storage?.setItem(STORAGE_KEY,JSON.stringify(queue));return queue;
}
