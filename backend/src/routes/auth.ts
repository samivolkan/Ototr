import {Router} from 'express';
import {z} from 'zod';
import {db,type User} from '../db/index.js';
import {signToken,verifyPassword} from '../auth/jwt.js';
import {requireAuth,wrap} from '../auth/middleware.js';
export const authRouter=Router();
authRouter.post('/login',wrap((req,res)=>{const b=z.object({email:z.string().email(),password:z.string().min(1).max(200)}).parse(req.body);const u=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(b.email) as User|undefined;if(!u||!verifyPassword(b.password,u.password_hash))return res.status(401).json({error:'Hatalı giriş'});const {password_hash,...user}=u;res.json({token:signToken(u.id),user});}));
authRouter.get('/me',requireAuth(),wrap((req,res)=>{const {password_hash,...user}=req.user!;res.json({user});}));

