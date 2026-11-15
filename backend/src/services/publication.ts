import {createHash,randomUUID} from 'node:crypto';
import {db,audit,type Draft} from '../db/index.js';
import {reviewFor,HttpError,type AuthedRequest} from '../auth/middleware.js';
import {replyToGbpReview} from './gbp.js';
export async function approve(req:AuthedRequest,id:string,draftId:string,version:number){
 const r=reviewFor(req.user!,id);
 if(!['admin','region_manager','store_manager'].includes(req.user!.role))throw new HttpError(403,'Yayın yetkisi yok');
 const d=db.prepare('SELECT * FROM drafts WHERE id=? AND review_id=?').get(draftId,id) as Draft|undefined;
 if(!d)throw new HttpError(404,'Taslak bulunamadı');
 if(d.version!==version)throw new HttpError(409,'Taslak değişmiş; yeniden inceleyin');
 if(r.hold||r.routed_to==='legal')throw new HttpError(409,'Hukuki inceleme gerekli');
 if(r.mode!=='demo')return replyToGbpReview();
 const hash=createHash('sha256').update(d.text).digest('hex');
 return db.transaction(()=>{
 const previous=db.prepare('SELECT status FROM publications WHERE draft_id=? AND version=?').get(d.id,d.version);
 if(previous)return {ok:true,simulated:true,duplicate:true,gbpPosted:false};
 db.prepare('INSERT INTO publications VALUES(?,?,?,?,?,?)').run(randomUUID(),r.id,d.id,d.version,hash,'simulated');
 db.prepare('UPDATE drafts SET approved_by=?,approved_hash=? WHERE id=? AND version=?').run(req.user!.id,hash,d.id,d.version);
 db.prepare("UPDATE reviews SET status='approved' WHERE id=?").run(r.id);
 audit(req.user!.email,r.store_id,'review',r.id,'demo_approved');
 return {ok:true,simulated:true,gbpPosted:false};
 })();
}

