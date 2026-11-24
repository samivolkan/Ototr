import{readOperationalSource}from'./operations-api.mjs?v=routing-1';
import{routingReadiness,routingLabels,departmentLabels}from'./routing-readiness.mjs';
const status=document.querySelector('#routingStatus'),list=document.querySelector('#routingDetails');
let busy=false;
export async function refreshRouting(){
 if(busy||document.hidden)return;busy=true;
 try{
  const result=routingReadiness(await readOperationalSource('routing'));
  status.textContent=`${result.total} kaynak departmanın ${result.verified} tanesinde sorumlu ve görev yöneticisi yetkisi eşleşiyor. Bu sayı çalışan ajan sayısı değildir.`;
  list.replaceChildren();
  for(const d of result.departments){
   const item=document.createElement('p');
   item.textContent=`${departmentLabels[d.department]}: ${routingLabels[d.status]}. Uygun ERP hesabı: ${d.eligible_accounts}; görev yazma yetkisi bulunan: ${d.writable_accounts}.`;
   list.append(item);
  }
 }catch{status.textContent='Departman sorumlulukları doğrulanamadı; otomatik yönlendirme hazır sayılmaz.';list.replaceChildren();}
 finally{busy=false;}
}
