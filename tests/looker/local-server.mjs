import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const host='127.0.0.1';
const port=43821;
const origin=`http://${host}:${port}`;

const users={
  CEO:{id:'test-ceo',role:'CEO',firstName:'Test',lastName:'CEO'},
  REGION_MANAGER:{id:'test-region',role:'REGION_MANAGER',firstName:'Bölge',lastName:'Müdürü',regionId:'marmara',regionName:'Marmara'},
  BRANCH_MANAGER:{id:'test-branch',role:'BRANCH_MANAGER',firstName:'Şube',lastName:'Müdürü',branchId:'bursa-nilufer',branchName:'Bursa Nilüfer'}
};
const permissions={
  CEO:['ceo','region','branch','finance','reviews','franchise','hr','quality','legal'],
  REGION_MANAGER:['region','branch','reviews','hr','quality'],
  BRANCH_MANAGER:['branch','reviews','hr','quality']
};

function cookieMap(req){
  return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(v=>v.length===2));
}
function json(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
function scopeLabel(user){
  if(user.role==='CEO') return 'Genel merkez';
  if(user.role==='REGION_MANAGER') return `Bölge · ${user.regionName}`;
  return `Şube · ${user.branchName}`;
}
function contentType(file){
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8'})[path.extname(file).toLowerCase()]||'application/octet-stream';
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,origin);
    if(url.pathname==='/__test__/health') return json(res,200,{ok:true,environment:'looker-local'});
    if(url.pathname==='/__test__/session'){
      const role=url.searchParams.get('role');
      if(!users[role]) return json(res,400,{message:'Bilinmeyen test rolü.'});
      res.setHeader('Set-Cookie',`ototr_test_role=${encodeURIComponent(role)}; Path=/; SameSite=Lax`);
      return json(res,200,{user:users[role]});
    }
    if(url.pathname==='/api/looker/embed-url' && req.method==='POST'){
      const chunks=[]; for await(const chunk of req) chunks.push(chunk);
      let body={}; try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{}
      const role=cookieMap(req).ototr_test_role||'CEO';
      const user=users[role];
      if(!permissions[role].includes(body.dashboard)) return json(res,403,{message:'Bu pano için yetkiniz yok.'});
      const nonce=crypto.randomUUID();
      return json(res,200,{url:`${origin}/__test__/mock-dashboard?dashboard=${encodeURIComponent(body.dashboard)}&role=${encodeURIComponent(role)}&nonce=${nonce}`,scopeLabel:scopeLabel(user)});
    }
    if(url.pathname==='/__test__/mock-dashboard'){
      const dashboard=String(url.searchParams.get('dashboard')||'');
      const role=String(url.searchParams.get('role')||'');
      const user=users[role];
      if(!user || !permissions[role].includes(dashboard)){res.writeHead(403);return res.end('Forbidden');}
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><style>body{font:16px system-ui;margin:0;background:#f5f7fb;color:#12203a}.mock{padding:32px}.badge{display:inline-block;background:#eaf7f0;color:#12653b;padding:7px 10px;border-radius:999px;font-weight:800}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}.card{background:#fff;border:1px solid #dce4ef;border-radius:14px;padding:20px}.card b{display:block;font-size:26px;margin-top:8px}</style><main class="mock"><span class="badge">MOCK LOOKER · TEST ORTAMI</span><h1>${dashboard.toUpperCase()} Panosu</h1><p data-test-scope>${scopeLabel(user)}</p><div class="cards"><div class="card">Bugünkü ağ cirosu<b>₺1,07M</b></div><div class="card">Aktif şube<b>10/10</b></div><div class="card">Risk sinyali<b>3</b></div></div></main></html>`);
    }
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!relative||relative.endsWith('/')) relative+='index.html';
    const target=path.resolve(root,relative);
    if(!target.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
    const data=await fs.readFile(target);
    res.writeHead(200,{'Content-Type':contentType(target),'Cache-Control':'no-store'});
    res.end(data);
  }catch(error){
    res.writeHead(error?.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});
    res.end(error?.code==='ENOENT'?'Not found':'Test server error');
  }
});

server.listen(port,host,()=>console.log(`OTOTR Looker test ortamı: ${origin}/index.html#looker`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit()));
