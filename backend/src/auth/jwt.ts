import 'dotenv/config';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const secret=process.env.JWT_SECRET;
if(!secret || secret.length<32 || /change-me|development-only/i.test(secret)) throw new Error('A strong JWT_SECRET is required');
export const hashPassword=(password:string)=>bcrypt.hashSync(password,12);
export const verifyPassword=(password:string,hash:string)=>bcrypt.compareSync(password,hash);
export const signToken=(id:string)=>jwt.sign({},secret,{subject:id,algorithm:'HS256',issuer:'ototr-local-backend',audience:'ototr-local-ui',expiresIn:'12h'});
export function tokenSubject(token:string){const p=jwt.verify(token,secret!,{algorithms:['HS256'],issuer:'ototr-local-backend',audience:'ototr-local-ui'});if(typeof p==='string'||!p.sub)throw new Error('Invalid token');return p.sub;}

