import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createHandler } from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_ANON_KEY')!;
const client=(token:string)=>createClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler({
  origins:(Deno.env.get('ISLER_ALLOWED_ORIGINS')||'https://samivolkan.github.io').split(',').map(x=>x.trim()),
  smtpConfigured:['SMTP_HOST','SMTP_USER','SMTP_PASS','SMTP_FROM'].every(k=>Boolean(Deno.env.get(k))),
  authenticate:async(token:string)=>{const {data,error}=await client(token).auth.getUser(token.slice(7));return !error&&Boolean(data.user)},
  rpc:(token:string,args:Record<string,unknown>)=>client(token).rpc('isler24_api',args)
}));
