import {db} from '../db/index.js';
import {randomUUID} from 'node:crypto';
export function enqueue(reviewId:string,event:string){db.prepare("INSERT OR IGNORE INTO outbox(id,review_id,event,status) SELECT ?,id,?,CASE WHEN mode='demo' THEN 'simulated' ELSE 'pending' END FROM reviews WHERE id=?").run(randomUUID(),event,reviewId);}

