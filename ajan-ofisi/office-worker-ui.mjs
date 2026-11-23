import{workerRequest,workerLabel}from'./office-worker.mjs';
const root=document.querySelector('#workerPanel');let data=null,busy=false,error=null;
const format=t=>t?new Date(t).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Henüz yok';
function render(){root.querySelector('[data-worker-state]').textContent=error||workerLabel(data);
 root.querySelector('[data-worker-evidence]').textContent=data?`Son başarılı çalışma: ${format(data.last_success_at)} · Başarılı kontrol: ${data.run_count} · Durma zamanı: ${format(data.expires_at||data.next_stop)}`:'Durum okunuyor…';
 root.querySelector('[data-worker-start]').disabled=busy||!!error||!data||data.enabled;
 root.querySelector('[data-worker-stop]').disabled=busy||!!error||!data?.enabled;
}
async function request(action){if(busy||document.hidden)return;busy=true;render();try{data=await workerRequest(action);error=null;}catch{error='İşlem doğrulanamadı. Durumu yenileyin; çalışıyor varsayılmadı.';}finally{busy=false;render();}}
root.querySelector('[data-worker-start]').onclick=()=>request('start');root.querySelector('[data-worker-stop]').onclick=()=>request('stop');root.querySelector('[data-worker-refresh]').onclick=()=>request('status');
render();let attempts=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++attempts>=20){clearInterval(boot);request('status');}},500);setInterval(()=>request('status'),15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)request('status');});
