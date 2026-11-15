import {Router} from 'express';import {db} from '../db/index.js';import {requireAuth,wrap,canReview} from '../auth/middleware.js';import {computeSlaStatus} from '../services/sla.js';import {detectSentimentDrops} from '../services/sentiment.js';
export const systemRouter=Router();systemRouter.get('/health-details',requireAuth(['admin']),(_req,res)=>res.json({database:'ok',stats:{reviews:db.prepare('SELECT count(*) count FROM reviews').get(),stores:db.prepare('SELECT count(*) count FROM stores').get()},integrations:{gbp:false,openai:false,notifications:false},mode:'isolated_local_demo'}));
systemRouter.get('/sla-status',requireAuth(),wrap((req,res)=>res.json(computeSlaStatus().filter(s=>canReview(req.user!,s.review)).map(({review,...s})=>s))));
systemRouter.get('/sentiment-alerts',requireAuth(['admin']),(_req,res)=>res.json(detectSentimentDrops()));

