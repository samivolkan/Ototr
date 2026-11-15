import {Router} from 'express';import {requireAuth} from '../auth/middleware.js';export const webhooksRouter=Router();webhooksRouter.use(requireAuth(['admin']));webhooksRouter.all('/',(_req,res)=>res.status(501).json({error:'Dış webhook gönderimi bu yerel sürümde kapalı'}));

