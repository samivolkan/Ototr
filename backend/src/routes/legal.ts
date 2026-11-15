import {Router} from 'express';import {caseRouter} from './cases.js';import {requireAuth} from '../auth/middleware.js';
export const legalRouter=Router();legalRouter.use('/cases',caseRouter('legal'));legalRouter.get('/kvkk',requireAuth(['admin','legal']),(_req,res)=>res.json({autoDelete:false,retentionPolicy:'pending_approval'}));

