import{franchiseOfficeRequest}from'./franchise-desk-model.mjs';
import{demoRequest}from'./franchise-web-demo-api.mjs?v=2';
export async function readOperationalSource(id){
 if(id==='franchise')return franchiseOfficeRequest('franchise_office_summary');
 if(id==='demo')return demoRequest('list_franchise_office_demo_tasks');
 if(!['reviews','work','task2','delivery','handoff','routing'].includes(id))throw Error('Tanımsız kaynak. Yazma ve gönderim kapalı.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu gerekli.');
 if(['work','task2','delivery','handoff','routing'].includes(id)){
  const response=await fetch(`https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/rpc/${id==='routing'?'office_routing_readiness':id==='handoff'?'office_task2_handoff_summary':id==='delivery'?'office_task2_delivery_summary':id==='task2'?'office_task2_health_summary':'office_work_health_summary'}`,{method:'POST',headers:{apikey:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('İş kapsamı doğrulanamadı.');return response.json();
 }
 const response=await fetch('https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'office_review_status',branch_id:'branch-google-nilufer'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Yorum bağlantısı doğrulanamadı.');return (await response.json()).summary;
}
