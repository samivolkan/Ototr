const API='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/website-api';
const normalize=s=>s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
document.querySelector('#branchSearch')?.addEventListener('input',e=>{let n=0;document.querySelectorAll('[data-search]').forEach(el=>{el.hidden=!normalize(el.dataset.search).includes(normalize(e.target.value));if(!el.hidden)n++;});document.querySelector('#noBranches').hidden=n>0;});
for(const form of document.querySelectorAll('.lead-form')){
 const first=form.querySelector('[data-step="1"]'),second=form.querySelector('[data-step="2"]');
 function showStep(n){if(first)first.hidden=n!==1;second.hidden=n!==2;form.querySelector('fieldset:not([hidden]) input,fieldset:not([hidden]) select')?.focus();}
 form.querySelector('.next-step')?.addEventListener('click',()=>{for(const el of first.querySelectorAll('select')){if(!el.reportValidity())return;}showStep(2);});
 form.querySelector('.previous-step')?.addEventListener('click',()=>showStep(1));
 let requestId=crypto.randomUUID(),pending=null,submitting=false;
 const error=form.querySelector('.form-error'),success=form.querySelector('.form-success');
 form.addEventListener('input',()=>{if(!pending)requestId=crypto.randomUUID();});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(submitting)return;
  error.hidden=true;success.hidden=true;
  if(!pending){const values=Object.fromEntries(new FormData(form));pending={...values,requestId,kvkkConsent:values.kvkkConsent==='on',processingConsent:values.processingConsent==='on',test:String(values.fullName).startsWith('TEST ')};}
  const button=form.querySelector('[type="submit"]'),label=button.textContent;
  submitting=true;button.disabled=true;button.textContent='Kaydediliyor…';
  form.querySelectorAll('input,select,textarea,.previous-step').forEach(el=>el.disabled=true);
  try{
   const response=await fetch(API+'/'+form.dataset.kind,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(pending),signal:AbortSignal.timeout(20000)});
   const data=await response.json();
   if(!response.ok){if(response.status>=400&&response.status<500){pending=null;form.querySelectorAll('input,select,textarea,.previous-step').forEach(el=>el.disabled=false);}throw Error(data.error||'Talep kaydedilemedi.');}
   const pattern=form.dataset.kind==='appointment'?/^WEB-CRM-[A-F0-9]{8}$/:/^WEB-FR-[A-F0-9]{8}$/;
   if(data.ok!==true||!pattern.test(data.referenceNo||''))throw Error('Sunucu kaydı doğrulanamadı. Aynı talebi yeniden deneyin.');
   success.textContent=`${form.dataset.kind==='appointment'?'Randevu talebiniz':'Franchise başvurunuz'} kaydedildi. Kayıt numarası: ${data.referenceNo}. ${form.dataset.kind==='appointment'?'Tarih ve saat şube teyidiyle kesinleşir.':'Franchise ekibi başvurunuzu değerlendirecek.'}`;
   success.hidden=false;form.querySelectorAll('fieldset').forEach(el=>el.hidden=true);pending=null;success.scrollIntoView({block:'center'});
  }catch(err){error.textContent=(err.name==='TimeoutError'||err.name==='TypeError'?'Bağlantı sonucu doğrulanamadı. Bilgileriniz korunuyor; aynı talebi yeniden deneyin.':err.message);error.hidden=false;error.scrollIntoView({block:'center'});}
  finally{submitting=false;button.disabled=false;button.textContent=pending?'Aynı talebi tekrar dene':label;}
 });
}
