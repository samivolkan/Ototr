import {Router} from 'express';import {z} from 'zod';import {db,type Store,type Review} from '../db/index.js';import {requireAuth,wrap,canStore,storeFor,canReview} from '../auth/middleware.js';
export const storesRouter=Router();storesRouter.use(requireAuth());
storesRouter.get('/',wrap((req,res)=>res.json((db.prepare('SELECT * FROM stores').all() as Store[]).filter(s=>canStore(req.user!,s)))));
storesRouter.get('/:id',wrap((req,res)=>{const s=storeFor(req.user!,req.params.id);res.json({...s,recentReviews:(db.prepare('SELECT * FROM reviews WHERE store_id=? LIMIT 20').all(s.id) as Review[]).filter(r=>canReview(req.user!,r))});}));
storesRouter.patch('/:id',requireAuth(['admin','region_manager']),wrap((req,res)=>{const s=storeFor(req.user!,req.params.id);const b=z.object({target:z.number().int().min(1).max(10000),sla_hours:z.number().int().min(1).max(720)}).parse(req.body);db.prepare('UPDATE stores SET target=?,sla_hours=? WHERE id=?').run(b.target,b.sla_hours,s.id);res.json({ok:true});}));

