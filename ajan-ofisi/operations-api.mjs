import{franchiseOfficeRequest}from'./franchise-desk-model.mjs';
import{demoRequest}from'./franchise-web-demo-api.mjs?v=2';
export async function readOperationalSource(id){
 if(id==='franchise')return franchiseOfficeRequest('franchise_office_summary');
 if(id==='demo')return demoRequest('list_franchise_office_demo_tasks');
 if(id!=='reviews')throw Error('Tanımsız kaynak. Yazma ve gönderim kapalı.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu gerekli.');
 const response=await fetch('https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'office_review_status',branch_id:'branch-google-nilufer'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Yorum bağlantısı doğrulanamadı.');return (await response.json()).summary;
}
