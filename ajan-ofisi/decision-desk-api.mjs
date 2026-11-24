export async function decisionRpc(name,args){
 if(!['office_decision_queue','task2_delivery_action'].includes(name))throw Error('Karar masası dışında işlem yok.');
 if(name==='task2_delivery_action'&&args.p_action!=='read')throw Error('Görev kaynağı yalnız okunur.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP merkez yönetici oturumu gerekli.');
 const response=await fetch(`https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 const value=await response.json();if(!response.ok)throw Error(value.message||'Karar bağlantısı doğrulanamadı.');return value;
}
