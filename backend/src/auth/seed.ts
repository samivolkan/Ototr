import {db} from '../db/index.js';
import {hashPassword} from './jwt.js';
if(process.env.SEED_DEMO!=='true'||!/demo/.test(process.env.DB_PATH||''))throw new Error('Seed requires explicit demo database');
const password=process.env.DEMO_PASSWORD;
if(!password||password.length<12)throw new Error('DEMO_PASSWORD must contain at least 12 characters');
db.transaction(()=>{
 const stores=[['demo-nilufer','Nilüfer','Bursa'],['demo-gebze','Gebze','Kocaeli'],['demo-inegol','İnegöl','Bursa']];
 for(const [id,name,city] of stores)db.prepare("INSERT OR IGNORE INTO stores(id,name,city,region,mode) VALUES(?,?,?,'Marmara','demo')").run(id,name,city);
 const users=[['admin','admin'],['marmara','region_manager'],['nilufer','store_manager'],['legal','legal'],['complaint','complaint']];
 for(const [id,role] of users)db.prepare('INSERT OR IGNORE INTO users(id,email,password_hash,name,role,store_id,region) VALUES(?,?,?,?,?,?,?)').run(id,id+'@ototr.com',hashPassword(password!),id,role,role==='store_manager'?'demo-nilufer':null,role==='region_manager'?'Marmara':null);
 for(let i=0;i<7;i++){const id='demo-review-'+i;db.prepare("INSERT OR IGNORE INTO reviews(id,store_id,author,stars,text,mode,risk,created_at) VALUES(?,?,?,?,?,'demo',?,?)").run(id,stores[i%3][0],'Demo müşteri '+i,i%5+1,'Sentetik test yorumu',i%5<2?70:10,new Date().toISOString());db.prepare('INSERT OR IGNORE INTO drafts(id,review_id,text) VALUES(?,?,?)').run('draft-'+id,id,'Geri bildiriminiz için teşekkür ederiz.');}
})();
console.log('Demo seed complete: 3 stores, 5 users, 7 reviews');

