export const LIVE_CONSENT_VERSION='FR-KVKK-2026-11';
const ENDPOINT=/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/public-api\/franchise-applications$/i;
const clean=(value,max=500)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const checked=value=>value===true||value==='true'||value==='on'||value==='1';

export function validateLiveFranchiseConfig(config={}){
  const apiUrl=clean(config.apiUrl,500),consentVersion=clean(config.consentVersion||LIVE_CONSENT_VERSION,80),deploymentIdentity=clean(config.deploymentIdentity,80),rollbackReference=clean(config.rollbackReference,200);
  if(!ENDPOINT.test(apiUrl))throw new Error('Güvenli Franchise Edge endpoint yapılandırılmadı.');
  if(!/^FR-KVKK-[0-9]{4}-[0-9]{2}$/.test(consentVersion))throw new Error('Geçerli KVKK metin sürümü yapılandırılmadı.');
  if(!/^[a-f0-9]{40}$/.test(deploymentIdentity))throw new Error('Canlı kaynak commit kimliği yapılandırılmadı.');
  if(!/^revert:[a-f0-9]{40}$/.test(rollbackReference))throw new Error('Rollback referansı yapılandırılmadı.');
  return Object.freeze({apiUrl,consentVersion,deploymentIdentity,rollbackReference});
}

export function liveFranchisePayload(data,{consentVersion=LIVE_CONSENT_VERSION,utm={}}={}){
  const get=name=>data instanceof FormData?data.get(name):data?.[name];
  return Object.freeze({
    source:'ototr.com/franchise',
    fullName:clean(get('name'),120),
    phone:clean(get('phone'),40),
    email:clean(get('email'),160),
    province:clean(get('city'),80),
    district:clean(get('district'),80),
    applicationType:clean(get('applicant_type'),160),
    budget:clean(get('budget'),80),
    equityBand:clean(get('equity_band'),80),
    managementExperienceYears:Number.parseInt(String(get('management_experience_years')||'0'),10)||0,
    sectorExperience:clean(get('experience'),80),
    companyStatus:clean(get('company'),80),
    partnershipStructure:clean(get('partnership_structure'),80),
    hasLocation:clean(get('location_status'),80),
    region:clean([get('city'),get('district')].filter(Boolean).join(' / '),80),
    squareMeters:clean(get('area'),40),
    note:clean([get('message'),get('timeline')&&`Planlanan başlangıç: ${get('timeline')}`].filter(Boolean).join(' · '),1500),
    companyWebsite:clean(get('website'),120),
    kvkkConsent:checked(get('kvkkConsent')),
    processingConsent:checked(get('processingConsent')),
    contactConsent:checked(get('contactConsent')),
    consentVersion:clean(consentVersion,80),
    utm:utm&&typeof utm==='object'?utm:{}
  });
}

export async function submitLiveFranchiseApplication({form,config,fetchImpl=fetch,utm={}}={}){
  if(!(form instanceof HTMLFormElement))throw new Error('Franchise formu bulunamadı.');
  const safeConfig=validateLiveFranchiseConfig(config),payload=liveFranchisePayload(new FormData(form),{consentVersion:safeConfig.consentVersion,utm});
  if(!payload.kvkkConsent||!payload.processingConsent)throw new Error('Aydınlatma teyidi ve veri işleme izni zorunludur.');
  const response=await fetchImpl(safeConfig.apiUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),credentials:'omit'});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true)throw new Error(result?.error||'Franchise başvurusu kaydedilemedi.');
  if(!/^WEB-FR-[A-F0-9]{8}$/.test(result.referenceNo||''))throw new Error('Başvuru referansı doğrulanamadı.');
  return Object.freeze({referenceNo:result.referenceNo});
}
