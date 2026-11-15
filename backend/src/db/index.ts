import 'dotenv/config';
import Database from 'better-sqlite3';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
const file=process.env.DB_PATH || './data/demo.sqlite';
mkdirSync(dirname(file),{recursive:true});
export const db=new Database(file);
db.pragma('journal_mode=WAL'); db.pragma('foreign_keys=ON'); db.pragma('busy_timeout=5000');
db.exec('CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY)');
if(!db.prepare('SELECT version FROM migrations WHERE version=1').get()) db.transaction(()=>{
 db.exec(readFileSync(join(import.meta.dirname,'schema.sql'),'utf8'));
 db.prepare('INSERT INTO migrations VALUES(1)').run();
})();
export function audit(user:string,store:string|null,entity:string,id:string,action:string){
 db.prepare('INSERT INTO audit_log(ts,user_name,store_id,entity,entity_id,action) VALUES(?,?,?,?,?,?)').run(new Date().toISOString(),user,store,entity,id,action);
}
export interface Store {id:string;name:string;city:string;region:string;mode:'demo'|'live';sla_hours:number;lifecycle:string}
export interface Review {id:string;store_id:string;author:string;stars:number;text:string;mode:'demo'|'live';risk:number;status:string;routed_to:string|null;hold:number;sla_hours:number;created_at:string}
export interface User {id:string;email:string;password_hash:string;name:string;role:string;store_id:string|null;region:string|null;active:number}
export interface Draft {id:string;review_id:string;text:string;version:number;source:string}

