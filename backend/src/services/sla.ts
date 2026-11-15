import {db,type Review} from '../db/index.js';
export function computeSlaStatus(){return (db.prepare("SELECT * FROM reviews WHERE status!='published'").all() as Review[]).map(r=>({review:r,reviewId:r.id,storeId:r.store_id,elapsedHours:Math.max(0,(Date.now()-Date.parse(r.created_at))/3600000),slaHours:r.sla_hours,overdue:Date.now()-Date.parse(r.created_at)>r.sla_hours*3600000}));}

