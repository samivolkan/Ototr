import {projectWorkOrder} from '../ajan-ofisi/branch-operations-adapter.mjs';
// Explicit same-origin viewer connection; reuse the existing authenticated dealer reader/realtime.
let refreshing=false,lastAttempt=0;
addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==window.opener||e.data?.type!=='ototr-operation-read'||!new URLSearchParams(location.search).has('operationSource'))return;
 const reply=data=>e.source.postMessage({type:'ototr-operation-snapshot',requestId:e.data.requestId,...data},location.origin);
 try{
  if(!window.opener||!window.opener.location.pathname.endsWith('/ajan-ofisi/branch-operations.html'))return;
  const session=await dealerSupabaseActiveSession();
  if(!session?.access_token)throw Error('Bayi portalında oturum açılması gerekiyor.');
  if(!window.OTOTR_INSPECTION_SCHEMA)throw Error('Paket şeması henüz yüklenmedi. Bayi portalını açın.');
  if(!refreshing&&Date.now()-lastAttempt>30000){refreshing=true;lastAttempt=Date.now();try{await dealerSyncSupabaseWorkOrders({silent:true,noRender:true});}finally{refreshing=false;}}
  if(refreshing)throw Error('ERP güncelleniyor; tekrar kontrol ediliyor.');
  const sync=dealerSupabaseSyncState();if(sync.lastError)throw Error('ERP kaynağı güncellenemedi.');
  const store=JSON.parse(localStorage.getItem(DEALER_LIVE_KEY)||'null');
  if(store?.source!=='supabase'||!store.liveSyncedAt||Date.now()-Date.parse(store.liveSyncedAt)>90000)throw Error('Güncel yetkili ERP kaydı bekleniyor.');
  const orders=(store.workOrders||[]).filter(w=>w.supabaseId&&!dealerWorkOrderArchived(w));
  // Read current answers, not the portal's merged local cache: deleted/reset answers must lower progress.
  const ids=orders.map(w=>encodeURIComponent(w.supabaseId));
  const answers=ids.length?await dealerSupabaseRequest('/rest/v1/work_order_report_answers?select=expertise_case_id,nokta_id,selected_option_ids,description,image_urls,status,updated_at&expertise_case_id=in.('+ids.join(',')+')&order=updated_at.desc'):[];
  const value=(wo,item)=>{const row=answers.find(a=>a.expertise_case_id===wo.supabaseId&&Number(a.nokta_id)===dealerReportPointNoktaId(item));if(!row)return {};return {optionId:row.selected_option_ids?.[0]||'',note:row.description||'',photoCount:row.image_urls?.length||0};};
  const ctx={schema:dealerInspectionSchema(),packageCode:dealerReportPackageCode,groups:dealerReportSchemaGroups,answered:dealerReportPointAnswered,value,shortRequired:DEALER_FAST_WORKORDER_REQUIRED_NAMES,required:dealerStoredWorkOrderRequiredNames,fieldLabels:DEALER_WORKORDER_REQUIRED_LABELS,fieldComplete:dealerStoredWorkOrderFieldComplete,completion:dealerCompletion,printGate:dealerReportPrintGate};
  const cases=orders.map(w=>projectWorkOrder(w,ctx));
  reply({ok:true,source:'erp',observedAt:store.liveSyncedAt,cases});
 }catch{reply({ok:false,error:'Yetkili, güncel ERP kaydı okunamadı. Kaynak sekmesinde bayi portalı oturumunu ve bağlantıyı kontrol edin.'});}
});
