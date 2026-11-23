import {demoApplication,validDemoApplication,mirrorDemoRecord} from './franchise-web-demo-model.mjs';
import {demoRequest} from './franchise-web-demo-api.mjs';
const form=document.querySelector('#franchiseApplicationForm');
if(form){
 const panel=document.createElement('div');panel.className='field full';panel.style.cssText='padding:18px;border:1px solid #c5d5bf;border-radius:12px;background:#f2f7ee;color:#244c35';
 panel.innerHTML='<strong>Web → ERP → Ajan Ofisi · güvenli demo</strong><p>Yalnız mevcut ERP merkez yöneticisi, sabit kurgusal adayla sunucu bağlantısını deneyebilir. Gerçek başvuru veya iletişim izni değildir.</p><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="officeDemoEnabled" style="width:auto"> Bu gönderim sentetik Ajan Ofisi demosudur</label><button type="button" id="fillOfficeDemo" class="btn">Kurgusal aday bilgilerini doldur</button><p id="officeDemoStatus" role="status"></p>';
 form.prepend(panel);
 document.querySelector('#fillOfficeDemo').onclick=()=>{document.querySelector('#officeDemoEnabled').checked=true;for(const [k,v]of Object.entries(demoApplication)){const f=form.elements.namedItem(k);if(f){f.value=v;f.dispatchEvent(new Event('change',{bubbles:true}));}}document.querySelector('#officeDemoStatus').textContent='Sabit demo bilgileri dolduruldu. Gönder düğmesi sunucuda bir başvuru ve bir FRA-01 görevi oluşturur.';};
 let busy=false;
 form.addEventListener('submit',async e=>{
  if(!document.querySelector('#officeDemoEnabled').checked)return;
  e.preventDefault();e.stopImmediatePropagation();if(busy)return;
  const status=document.querySelector('#officeDemoStatus'),payload=Object.fromEntries(new FormData(form));
  if(!validDemoApplication(payload)){status.textContent='Yalnız sabit kurgusal aday kabul edilir. “Kurgusal aday bilgilerini doldur” düğmesini kullanın.';return;}
  busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;status.textContent='Web başvurusu sunucuya gönderiliyor…';
  try{
   let requestKey=sessionStorage.getItem('ototr.franchise.demo.request.v1');if(!requestKey){requestKey=crypto.randomUUID();sessionStorage.setItem('ototr.franchise.demo.request.v1',requestKey);}
   const r=await demoRequest('submit_franchise_office_demo',{p_request_key:requestKey,p_application:payload});
   let mirror=true;try{let old=[];try{old=JSON.parse(localStorage.getItem('ototrPublicFranchiseApplications')||'[]');}catch{}localStorage.setItem('ototrPublicFranchiseApplications',JSON.stringify(mirrorDemoRecord(old,payload,r)));}catch{mirror=false;}
   status.textContent=`Sunucu doğruladı: ${r.replayed?'mevcut demo kaydı bulundu':'demo başvuru kaydedildi'}. Başvuru ${r.application_id} · Görev ${r.task_id} · FRA-01. İlk temas hazırlığı hazır, yönetici incelemesi bekliyor.${mirror?' ERP yerel görünümüne de eklendi.':' ERP yerel görünümü güncellenemedi; sunucu kaydı Ajan Ofisi’nde mevcut.'}`;
   const link=document.createElement('a');link.href='ajan-ofisi/franchise-specialist.html#web-demo-tasks';link.className='btn primary';link.textContent='FRA-01 üzerindeki görevi gör →';status.append(document.createElement('br'),link);
   const success=document.querySelector('#franchiseSuccess');success.style.display='block';success.textContent=`DEMO · ERP başvuru kaydı ${r.application_id} → FRA-01 görevi oluşturuldu. Gerçek iletişim yok.`;
  }catch(error){status.textContent=`Gönderim doğrulanamadı: ${error.message}. Aynı sekmede tekrar gönderim aynı istek kimliğini kullanır; mükerrer görev açılmaz.`;}
  finally{busy=false;submit.disabled=false;}
 },true);
}
