import{submitLiveFranchiseApplication}from'./live-franchise-adapter.mjs';

// Salt-okunur canlı denetim bu işaretle Franchise formunun legacy PHP hattından ayrıldığını doğrular.
export const OTOTR_FRANCHISE_EDGE_HANDOFF=true;
const form=document.querySelector('[data-live-franchise-form]');
const status=form?.querySelector('[data-franchise-status]');
const button=form?.querySelector('button[type="submit"],button:not([type])');
const config=globalThis.OTOTR_FRANCHISE_PUBLIC_CONFIG||{};

function show(message,tone=''){
  if(!status)return;
  status.textContent=message;
  status.dataset.tone=tone;
}

if(form)form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const oldText=button?.textContent;
  if(button){button.disabled=true;button.textContent='Gönderiliyor…'}
  show('Başvurunuz güvenli Franchise kuyruğuna iletiliyor.');
  try{
    const result=await submitLiveFranchiseApplication({form,config,utm:globalThis.ototrSource||{}});
    form.reset();
    show(`Başvurunuz alındı. Takip numarası: ${result.referenceNo}`,'success');
  }catch(error){
    show(error?.message||'Başvuru gönderilemedi. Lütfen daha sonra tekrar deneyin.','error');
  }finally{
    if(button){button.disabled=false;button.textContent=oldText}
  }
});
