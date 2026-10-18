export function createHandler({authenticate, rpc, origins, smtpConfigured=false}) {
  return async req => {
    const origin=req.headers.get('origin');
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(origin && !origins.includes(origin)) return reply({error:'Bu alan adına izin verilmiyor'},403);
    if(origin) headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods']='GET, POST, PUT, DELETE, OPTIONS';
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
    const token=req.headers.get('authorization')||'';
    if(!/^Bearer \S+$/.test(token)) return reply({error:'Oturum geçersiz. Yeniden giriş yapın.'},401);
    try{if(!await authenticate(token))return reply({error:'Oturum geçersiz. Yeniden giriş yapın.'},401)}
    catch{return reply({error:'Oturum servisine ulaşılamadı. Tekrar deneyin.'},503)}
    const match=new URL(req.url).pathname.match(/\/api\/(isler|settings|me|users|import)(?:\/(\d+))?\/?$/);
    if(!match) return reply({error:'Uç nokta bulunamadı'},404);
    const [,resource,id]=match;
    if(id && (!Number.isSafeInteger(Number(id)) || Number(id)<1)) return reply({error:'Geçersiz iş numarası'},400);
    if(!['GET','POST','PUT','DELETE'].includes(req.method)
      || (resource==='isler' && ((['PUT','DELETE'].includes(req.method) && !id) || (req.method==='POST' && id)))
      || (resource!=='isler' && id)) return reply({error:'Geçersiz işlem'},405);
    let payload={};
    if(req.method!=='GET'){
      if(!req.headers.get('content-type')?.startsWith('application/json')) return reply({error:'JSON gerekli'},415);
      try {
        // Count streamed bytes, not the untrusted Content-Length header.
        const reader=req.body?.getReader(); let size=0; const chunks=[];
        if(reader) while(true){const {value,done}=await reader.read(); if(done)break; size+=value.byteLength; if(size>(resource==='import'?1048576:65536)){await reader.cancel();return reply({error:'İstek çok büyük'},413)} chunks.push(value)}
        const all=new Uint8Array(size); let offset=0; for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
        payload=JSON.parse(new TextDecoder().decode(all));
      }catch{return reply({error:'Geçersiz JSON'},400)}
    }
    try {
      const {data,error}=await rpc(token,{method:req.method,resource,task_id:id?Number(id):null,payload});
      if(error){
        const status=({'28000':401,'42501':403,'P0002':404,'40001':409,'22023':400,'22007':400,'22008':400,'22P02':400,'22003':400})[error.code]||500;
        return reply({error:status===500?'İşlem kaydedilemedi. Tekrar deneyin.':error.message},status);
      }
      return reply(resource==='me'?{...data,smtpConfigured}:data,req.method==='POST'?201:200);
    }catch{return reply({error:'Sunucuya ulaşılamadı. Tekrar deneyin.'},503)}
  };
}
