import {Router} from 'express';import {z} from 'zod';import {db,type Store} from '../db/index.js';import {requireAuth,wrap,canStore,HttpError} from '../auth/middleware.js';
interface Case {id:string;store_id:string;kind:string}
export function caseRouter(kind:string){const router=Router();router.use(requireAuth(['admin','region_manager',kind]));const allowed=(u:Parameters<typeof canStore>[0],c:Case)=>c.kind===kind&&(u.role===kind||canStore(u,db.prepare('SELECT * FROM stores WHERE id=?').get(c.store_id) as Store));
router.get('/',wrap((req,res)=>res.json((db.prepare('SELECT * FROM cases WHERE kind=?').all(kind) as Case[]).filter(c=>allowed(req.user!,c)))));
router.patch('/:id',wrap((req,res)=>{const c=db.prepare('SELECT * FROM cases WHERE id=?').get(req.params.id) as Case|undefined;if(!c||!allowed(req.user!,c))throw new HttpError(404,'Dosya yok');const b=z.object({status:z.enum(['open','review','closed']),notes:z.string().max(10000)}).parse(req.body);db.prepare('UPDATE cases SET status=?,notes=? WHERE id=?').run(b.status,b.notes,c.id);res.json({ok:true});}));return router;}

