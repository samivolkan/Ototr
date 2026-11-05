import {browserRuntimeConfig,createFranchiseLiveClient} from '../gm-franchise/franchise-live-client.mjs';

const required=name=>{const value=process.env[name];if(!value)throw new Error(`${name} gerekli`);return value};
const config=browserRuntimeConfig(),releaseCandidate=required('FRANCHISE_UAT_RELEASE_CANDIDATE');
async function signIn(prefix){
  const response=await fetch(`${config.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email:required(`${prefix}_EMAIL`),password:required(`${prefix}_PASSWORD`)})});
  const session=await response.json().catch(()=>null);if(!response.ok||!session?.access_token)throw new Error(`${prefix} sentetik oturumu acilamadi (${response.status}: ${session?.error_code||session?.message||'bilinmeyen hata'})`);return session;
}
const client=session=>createFranchiseLiveClient({config,getSession:async()=>session});
const logout=async session=>(await fetch(`${config.url}/auth/v1/logout`,{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`}})).ok;
const ownerSession=await signIn('FRANCHISE_UAT_OWNER'),reviewerSession=await signIn('FRANCHISE_UAT_REVIEWER'),signerSession=await signIn('FRANCHISE_UAT_SIGNER');
const owner=client(ownerSession),reviewer=client(reviewerSession),signer=client(signerSession);
let resultId='',signoffId='';
try{
  resultId=String(await owner.submitUatResult({p_release_candidate:releaseCandidate,p_scenario_code:'UAT-07',p_evidence_sha256:'a'.repeat(64),p_result_summary:'Sentetik on zorunlu kadro UAT sonucu basarili.'}));
  let selfReviewDenied=false;try{await owner.reviewUatResult({p_result_id:resultId,p_decision:'approved',p_checker_note:'Kendi sonucunu onaylama denemesi.'})}catch{selfReviewDenied=true}if(!selfReviewDenied)throw new Error('Oz onay reddedilmedi');
  await reviewer.reviewUatResult({p_result_id:resultId,p_decision:'approved',p_checker_note:'Bagimsiz sentetik inceleme basariyla tamamlandi.'});
  let executorSignoffDenied=false;try{await owner.signUatRelease({p_release_candidate:releaseCandidate,p_signoff_role:'İK Yöneticisi',p_evidence_sha256:'b'.repeat(64),p_decision:'approved',p_note:'Ayni kisi imza denemesi.'})}catch{executorSignoffDenied=true}if(!executorSignoffDenied)throw new Error('Executor imzasi reddedilmedi');
  signoffId=String(await signer.signUatRelease({p_release_candidate:releaseCandidate,p_signoff_role:'İK Yöneticisi',p_evidence_sha256:'c'.repeat(64),p_decision:'approved',p_note:'Bagimsiz IK Yonetimi sentetik kabul imzasi.'}));
  const workspace=await reviewer.loadUat(releaseCandidate),row=workspace.results.find(x=>x.id===resultId),signature=workspace.signoffs.find(x=>x.id===signoffId);
  if(row?.status!=='approved'||signature?.decision!=='approved')throw new Error('Hosted UAT geri okuma dogrulanamadi');
  const sessionsRevoked=(await Promise.all([logout(ownerSession),logout(reviewerSession),logout(signerSession)])).every(Boolean);
  console.log(JSON.stringify({submitted:true,selfReviewDenied,independentReview:true,executorSignoffDenied,independentSignoff:true,readback:true,sessionsRevoked,resultId,signoffId}));
}catch(error){await Promise.allSettled([logout(ownerSession),logout(reviewerSession),logout(signerSession)]);throw error}
