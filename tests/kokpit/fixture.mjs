import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
export const actors={admin:'10000000-0000-0000-0000-000000000001',worker:'10000000-0000-0000-0000-000000000002',viewer:'10000000-0000-0000-0000-000000000003',other:'10000000-0000-0000-0000-000000000004',inactive:'10000000-0000-0000-0000-000000000005'};
export const sample=()=>({title:'Deneme işi',desc:'Açıklama',who:'Çalışan',helpers:['Yönetici'],start:'2026-01-01',due:'2026-01-31',pri:'orta',status:'yapilacak',proj:'Satış',tags:['test'],subs:[{t:'Kontrol et',d:false}],rec:'',time:0,ts:0});
export async function fixture(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.app_users(id uuid primary key,auth_user_id uuid,branch_id uuid,full_name text,email text,role text,is_active boolean);
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  let i=0;for(const [name,id] of Object.entries(actors)){
    i++;const branch=name==='other'?'20000000-0000-0000-0000-000000000002':'20000000-0000-0000-0000-000000000001';
    await db.query('insert into auth.users values($1,$2)',[id,name+'@example.invalid']);
    await db.query('insert into app_users values($1,$1,$2,$3,$4,$5,$6)',[id,branch,{admin:'Yönetici',worker:'Çalışan',viewer:'İzleyici'}[name]||name,name+'@example.invalid',name==='admin'?'BRANCH_MANAGER':name==='viewer'?'AUDITOR':'INSPECTION_TECHNICIAN',name!=='inactive']);
  }
  await db.exec(await fs.readFile(new URL('../../supabase/migrations/20261018204541_kokpit_isler.sql',import.meta.url),'utf8'));
  async function call(actor,method,resource='isler',id=null,payload={}){
    return db.transaction(async tx=>{
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actors[actor]||'']);
      await tx.exec('set local role authenticated');
      const {rows}=await tx.query('select public.kokpit_api($1,$2,$3,$4) as data',[method,resource,id,JSON.stringify(payload)]);
      return rows[0].data;
    });
  }
  return {db,call};
}
