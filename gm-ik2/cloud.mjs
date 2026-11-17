// This adapter is dormant until a real account is explicitly provisioned.
// It never treats the browser's demo role selector as an authorization claim.
export class CloudWorkspace {
 constructor({url,key,getToken,fetchImpl=fetch}){const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Sunucu adresi HTTPS olmalıdır.');if(!key?.startsWith('sb_publishable_'))throw Error('Yayınlanabilir anahtar gerekir.');this.url=parsed.origin;this.key=key;this.getToken=getToken;this.fetch=fetchImpl;}
 async request(path,options={}){const token=await this.getToken();if(!token)throw Error('ERP oturumu bulunamadı.');const response=await this.fetch(this.url+'/rest/v1/'+path,{...options,headers:{apikey:this.key,authorization:'Bearer '+token,'content-type':'application/json',prefer:'return=representation',...options.headers},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok){if([401,403].includes(response.status))throw Error('Sunucu İK2 erişimi atanmadı veya oturum sona erdi.');if(response.status===409)throw Error('Sunucu kaydı başka bir işlemle değişti. Önce yeniden yükleyin.');throw Error('Sunucu işlemi tamamlanamadı ('+response.status+').');}return response.json();}
 id(id){if(!/^[-a-z0-9_]{1,80}$/.test(id))throw Error('Çalışma alanı adı geçersiz.');return encodeURIComponent(id);}
 context(){return this.request('rpc/ik2_context',{method:'POST',body:'{}'});}
 async load(id){const rows=await this.request('ik2_workspaces?id=eq.'+this.id(id)+'&select=id,document,revision,updated_at');return rows[0]||null;}
 async save(id,document,expectedRevision){if(document.mode!=='synthetic-demo')throw Error('Yalnızca demo çalışma alanı desteklenir.');const serialized=JSON.stringify(document);if(new TextEncoder().encode(serialized).length>4900000)throw Error('Sunucu kaydı 4,9 MB sınırını aşıyor.');const exists=expectedRevision!==null;if(exists&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))throw Error('Sunucu sürümü geçersiz.');const path='ik2_workspaces'+(exists?'?id=eq.'+this.id(id)+'&revision=eq.'+expectedRevision:'');this.id(id);const rows=await this.request(path,{method:exists?'PATCH':'POST',body:JSON.stringify({...(exists?{}:{id}),document,revision:exists?expectedRevision+1:1})});if(rows.length!==1)throw Error('Sunucu sürümü değişti veya erişim kapandı. Yeniden yükleyin.');return rows[0];}
 history(id){return this.request('ik2_workspace_events?workspace_id=eq.'+this.id(id)+'&select=id,revision,occurred_at&order=revision.desc&limit=20');}
}

export async function browserCloud(){
 const {r:supabase}=await import('../saha-satis/assets/feedbackLoader-puddZXLE.js');
 return new CloudWorkspace({url:'https://bsjkohwbtrfwrqcyhsfz.supabase.co',key:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',getToken:async()=>{const {data,error}=await supabase.auth.getSession();if(error)throw Error('ERP oturumu okunamadı.');return data.session?.access_token;}});
}
