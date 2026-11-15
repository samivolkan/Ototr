import 'dotenv/config';import express from 'express';import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';import {ZodError} from 'zod';
import {db} from './db/index.js';import {HttpError} from './auth/middleware.js';import {startCronJobs} from './cron/index.js';
import {authRouter} from './routes/auth.js';import {reviewsRouter} from './routes/reviews.js';import {storesRouter} from './routes/stores.js';import {legalRouter} from './routes/legal.js';import {complaintsRouter} from './routes/complaints.js';import {approvalsRouter} from './routes/approvals.js';import {usersRouter} from './routes/users.js';import {templatesRouter} from './routes/templates.js';import {auditRouter} from './routes/audit.js';import {systemRouter} from './routes/system.js';import {webhooksRouter} from './routes/webhooks.js';
const app=express();app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:(process.env.CORS_ORIGIN||'http://localhost:5173').split(',')}));app.use(express.json({limit:'64kb'}));
app.use('/api/auth/login',rateLimit({windowMs:60000,limit:15,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(_req,res)=>{try{db.prepare('SELECT 1').get();res.json({status:'ok',version:'2.0.0-local',timestamp:new Date().toISOString()});}catch{res.status(503).json({status:'unavailable'});}});
for(const [path,router] of Object.entries({auth:authRouter,reviews:reviewsRouter,stores:storesRouter,legal:legalRouter,complaints:complaintsRouter,approvals:approvalsRouter,users:usersRouter,templates:templatesRouter,audit:auditRouter,system:systemRouter,webhooks:webhooksRouter}))app.use('/api/'+path,router);
app.use((_req,res)=>res.status(404).json({error:'Endpoint yok'}));
app.use((e:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(e instanceof HttpError?e.status:e instanceof ZodError?400:500).json({error:e instanceof HttpError?e.message:e instanceof ZodError?'Geçersiz veri':'İşlem tamamlanamadı'});});
const stop=startCronJobs();const server=app.listen(Number(process.env.PORT||4000),'0.0.0.0',()=>console.log('OTOTR local backend ready'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stop();server.close(()=>{db.close();process.exit(0);});});

