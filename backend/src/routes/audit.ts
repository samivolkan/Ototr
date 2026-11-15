import {Router} from 'express';import {db} from '../db/index.js';import {requireAuth} from '../auth/middleware.js';export const auditRouter=Router();auditRouter.get('/',requireAuth(['admin']),(_req,res)=>res.json(db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all()));

