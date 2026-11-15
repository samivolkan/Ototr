import type {Request,Response,NextFunction} from 'express';
import {db,type User,type Review,type Store} from '../db/index.js';
import {tokenSubject} from './jwt.js';
export interface AuthedRequest extends Request {user?:User}
export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export function requireAuth(roles?:string[]){return(req:AuthedRequest,res:Response,next:NextFunction)=>{
 try{const h=req.headers.authorization;if(!h?.startsWith('Bearer '))throw new Error();
 const u=db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(tokenSubject(h.slice(7))) as User|undefined;
 if(!u)throw new Error(); req.user=u;
 }catch{res.status(401).json({error:'Oturum gerekli'});return;}
 if(roles&&!roles.includes(req.user.role)){res.status(403).json({error:'Yetkisiz'});return;}next();
}}
export function canStore(u:User,s:Store){return u.role==='admin'||u.role==='region_manager'&&!!u.region&&s.region===u.region||u.role==='store_manager'&&!!u.store_id&&u.store_id===s.id;}
export function canReview(u:User,r:Review){const s=db.prepare('SELECT * FROM stores WHERE id=?').get(r.store_id) as Store;return canStore(u,s)||u.role==='legal'&&r.routed_to==='legal'||u.role==='complaint'&&r.routed_to==='complaint';}
export function reviewFor(u:User,id:string){const r=db.prepare('SELECT * FROM reviews WHERE id=?').get(id) as Review|undefined;if(!r||!canReview(u,r))throw new HttpError(404,'Yorum bulunamadı');return r;}
export function storeFor(u:User,id:string){const s=db.prepare('SELECT * FROM stores WHERE id=?').get(id) as Store|undefined;if(!s||!canStore(u,s))throw new HttpError(404,'Şube bulunamadı');return s;}
export const wrap=(fn:(req:AuthedRequest,res:Response)=>unknown)=> (req:AuthedRequest,res:Response,next:NextFunction)=>{Promise.resolve().then(()=>fn(req,res)).catch(next)};

