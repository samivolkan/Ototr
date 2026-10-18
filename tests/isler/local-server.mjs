import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixture,sample,actors} from './fixture.mjs';
import {createHandler} from '../../supabase/functions/isler-api/handler.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const {db,call}=await fixture();
await call('worker','POST','isler',null,{...sample(),due:new Date().toISOString().slice(0,10),title:'Yerel kontrol işi'});
const port=43824,origin='http://127.0.0.1:'+port;
const handler=createHandler({origins:[origin],authenticate:async token=>Boolean(actors[token.slice(7)]),
  rpc:async(token,args)=>{try{return {data:await call(token.slice(7),args.method,args.resource,args.task_id,args.payload)}}catch(error){return {error}}}});
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,origin);
    if(url.pathname==='/task-merkezi-v2/js/runtime-config.js'){
      res.setHeader('Content-Type','text/javascript');res.end(`window.OTOTR_SUPABASE_CONFIG={url:'${origin}',publishableKey:'local-public',islerApi:'${origin}/api'};`);return;
    }
    if(url.pathname.startsWith('/auth/v1/')){
      const actor=(req.headers.authorization||'').slice(7);
      if(url.pathname.endsWith('/logout')){res.writeHead(204);res.end();return}
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      let body={};try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{}
      const name=url.pathname.endsWith('/token')?String(body.email||'').split('@')[0]:actor;
      if(!actors[name] || (url.pathname.endsWith('/token')&&body.password!=='local-test-only')){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials'}));return}
      const user={id:actors[name],email:name+'@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(url.pathname.endsWith('/user')?user:{access_token:name,refresh_token:name,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user}));return;
    }
    if(url.pathname.startsWith('/api/')){
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const response=await handler(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');if(!relative||relative.endsWith('/'))relative+='index.html';
    const target=path.resolve(root,relative);
    if(!target.startsWith(root)){res.writeHead(403);res.end();return}
    const data=await fs.readFile(target);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(target)]||'application/octet-stream');res.end(data);
  }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(port,'127.0.0.1',()=>console.log(origin+'/isler/ (isolated local test database)'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit()}));
