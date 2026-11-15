import {Router} from 'express';import {db,type Review} from '../db/index.js';import {requireAuth,wrap,canReview} from '../auth/middleware.js';
export const approvalsRouter=Router();approvalsRouter.get('/',requireAuth(),wrap((req,res)=>res.json((db.prepare("SELECT * FROM reviews WHERE status='approval_pending'").all() as Review[]).filter(r=>canReview(req.user!,r)))));
approvalsRouter.post('/delegate',requireAuth(),(_req,res)=>res.status(501).json({error:'Çok aşamalı delegasyon henüz uygulanmadı'}));

