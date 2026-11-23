export async function demoRequest(name,payload={}){
 if(!['submit_franchise_office_demo','list_franchise_office_demo_tasks'].includes(name))throw Error('Demo işlem kapsamı dışında.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP merkez yönetici oturumu gerekli. Önce ERP hesabınızla giriş yapın.');
 const r=await fetch(`https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 const value=await r.json();if(!r.ok)throw Error(value.message||'Demo sunucu bağlantısı doğrulanamadı.');return value;
}
