export const REVIEW_BRANCH = 'branch-google-nilufer';
export const RESOURCE_TABLE = 'google_review_management_resources';
const NOTIFICATIONS = 'google_review_notifications';
const WORK = 'google_review_work_items';
const kinds = ['templates','experiments','escalation_rules','notification_rules','store_groups','branch_settings','delegations','legal_cases','complaints','compensations','retention_policy','user_permissions','ai_config'];
const singletonKinds = new Set(['branch_settings','retention_policy','ai_config']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const events = ['sla_overdue','critical_review','legal_hold'];
export class ReviewManagementError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Context = { db: any; user: { id: string }; connection: { id: string; connected_by?: string }; body: any; role?: string; canAdmin?: boolean; canManageGrants?: boolean };
function fail(message: string, status = 400): never { throw new ReviewManagementError(message,status); }
function checked(result: any) { if (result.error) fail(result.error.code === '40001' || result.error.code === '23505' ? 'Kayıt başka oturumda değişti. Yenileyin.' : result.error.code === 'P0002' ? 'Kayıt bulunamadı.' : 'Yönetim verisi okunamadı veya kaydedilemedi.', result.error.code === '40001' || result.error.code === '23505' ? 409 : result.error.code === 'P0002' ? 404 : 503); return result.data; }
function object(value: any) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Geçerli veri nesnesi gerekli.'); return value; }
function text(value: any, name: string, max = 200, optional = false) { if (optional && value === undefined) return ''; if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max || /[\u0000]/.test(value)) fail(`${name} geçersiz (en fazla ${max} karakter).`); return value.trim(); }
function enumeration(value: any, choices: string[], name: string) { if (!choices.includes(value)) fail(`${name} geçersiz.`); return value; }
function integer(value: any, min: number, max: number, name: string) { if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${name}: ${min}–${max} arası tam sayı gerekli.`); return value; }
function boolean(value: any, name: string) { if (typeof value !== 'boolean') fail(`${name} doğru/yanlış olmalı.`); return value; }
function uuid(value: any, name: string) { if (typeof value !== 'string' || !uuidPattern.test(value)) fail(`${name} kimliği geçersiz.`); return value.toLowerCase(); }
function timestamp(value: any, name: string) { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail(`${name} geçersiz.`); return new Date(value).toISOString(); }
function fields(data: any, allowed: string[]) { if (Object.keys(data).some(key=>!allowed.includes(key))) fail('Desteklenmeyen veri alanı.'); }
const branchPattern = /^branch-(?:google|custom)-[A-Za-z0-9-]+$/;
function contextBranch(ctx: Context) { const value = String(ctx.body?.branch_id || REVIEW_BRANCH); if (!branchPattern.test(value)) fail('Geçerli şube kapsamı gerekli.'); return value; }
function scope(ctx: Context) { if (!ctx.user?.id || !ctx.connection?.id) fail('ERP oturumu gerekli.',401); if (!['viewer','operator','legal','admin'].includes(ctx.role||'')) fail('Yorum yönetimi yetkisi gerekli.',403); const branch = contextBranch(ctx); if (branch !== REVIEW_BRANCH && !branch.startsWith('branch-custom-')) fail('Bu işlem yalnızca canlı Bursa şubesi içindir; demo şube canlı yönetim kapsamına alınamaz.'); }
function base(ctx: Context, table = RESOURCE_TABLE) { return ctx.db.from(table).select('*').eq('connection_id',ctx.connection.id).eq('branch_id',contextBranch(ctx)); }
async function rows(ctx: Context, table = RESOURCE_TABLE, extra: (q:any)=>any = q=>q) {
 const all:any[]=[];
 for(let offset=0;offset<20000;offset+=500){const data=checked(await extra(base(ctx,table)).order('id').range(offset,offset+499))||[];all.push(...data);if(data.length<500)return all;}
 fail('Kayıt sayısı tek liste sınırını aşıyor. Daraltılmış liste gerekli.',413);
}
async function activeUser(ctx: Context, id: string) { const user=checked(await ctx.db.from('app_users').select('auth_user_id,role,is_active').eq('auth_user_id',id).eq('is_active',true).maybeSingle()); if(!user)fail('Etkin ERP kullanıcısı bulunamadı.',404); return user; }
async function work(ctx: Context, id: string) { const item=checked(await base(ctx,WORK).eq('id',id).maybeSingle()); if(!item)fail('Şube görev kaydı bulunamadı.',404); return item; }
async function audit(ctx: Context, action:string, entity:string,id:string,detail:string,after:any={}) { checked(await ctx.db.from('google_review_audit_log').insert({connection_id:ctx.connection.id,actor_id:ctx.user.id,actor_role:ctx.role||'OPERATOR',action,entity_type:entity,entity_id:id,detail,before_state:{},after_state:after})); }
export async function loadReviewAccess(input:{db:any;userId:string;connection:any;allowlist:string[];branchId?:string}) {
 const branchId = input.branchId && branchPattern.test(input.branchId) ? input.branchId : REVIEW_BRANCH;
 if(input.connection?.connected_by===input.userId)return{allowed:true,role:'admin',source:'owner',is_owner:true,can_approve:true,delegated_scopes:[]};
 if(input.allowlist.includes(input.userId))return{allowed:true,role:'admin',source:'server',is_owner:true,can_approve:true,delegated_scopes:[]};
 const grant=checked(await input.db.from(RESOURCE_TABLE).select('data').eq('connection_id',input.connection.id).eq('branch_id',branchId).eq('kind','user_permissions').eq('key',input.userId).eq('archived',false).maybeSingle());
 const user=checked(await input.db.from('app_users').select('is_active').eq('auth_user_id',input.userId).eq('is_active',true).maybeSingle());
 if(!user)return null;
 const role=grant?.data?.active&&['viewer','operator','legal','admin'].includes(grant.data.role)?grant.data.role:null;
 const delegationRows=checked(await input.db.from(RESOURCE_TABLE).select('data').eq('connection_id',input.connection.id).eq('branch_id',branchId).eq('kind','delegations').eq('archived',false))||[];
 const scopes:string[]=[];
 for(const row of delegationRows){const d=row.data;if(!d?.active||d.to_user_id!==input.userId||Date.parse(d.starts_at)>Date.now()||Date.parse(d.ends_at)<=Date.now())continue;
  let fromRole:string|null=null;
  if(input.connection.connected_by===d.from_user_id||input.allowlist.includes(d.from_user_id))fromRole='admin';
  else {const fromUser=checked(await input.db.from('app_users').select('is_active').eq('auth_user_id',d.from_user_id).eq('is_active',true).maybeSingle());if(!fromUser)continue;const fromGrant=checked(await input.db.from(RESOURCE_TABLE).select('data').eq('connection_id',input.connection.id).eq('branch_id',branchId).eq('kind','user_permissions').eq('key',d.from_user_id).eq('archived',false).maybeSingle());if(fromGrant?.data?.active)fromRole=fromGrant.data.role;}
  if(d.scope==='approvals'&&fromRole==='admin')scopes.push('approvals');
  if(d.scope==='tasks'&&['operator','legal','admin'].includes(fromRole||''))scopes.push('tasks');
 }
 if(!role&&!scopes.length)return null;
 return{allowed:true,role:role||'operator',source:role?'grant':'delegation',is_owner:false,can_approve:role==='admin'||scopes.includes('approvals'),delegated_scopes:[...new Set(scopes)]};
}
export async function assertReviewLifecycle(input:{db:any;connection:any;branchId?:string}) {
 const branchId = input.branchId && branchPattern.test(input.branchId) ? input.branchId : REVIEW_BRANCH;
 const row=checked(await input.db.from(RESOURCE_TABLE).select('data').eq('connection_id',input.connection.id).eq('branch_id',branchId).eq('kind','branch_settings').eq('key','default').eq('archived',false).maybeSingle());
 const lifecycle=row?.data?.lifecycle||'active';if(!['active','live'].includes(lifecycle))fail(lifecycle==='paused'?'Şube duraklatıldı. Yeni taslak ve yayın kapalı.':lifecycle==='onboarding'||lifecycle==='live_candidate'?'Şube onboarding doğrulaması tamamlanmadı. Önce Google konumunu doğrulayıp şubeyi aktifleştirin.':'Şube arşivlendi. Yeni taslak ve yayın kapalı.',409);return row?.data||null;
}
export function validateResource(kind:string,input:any, branchId = REVIEW_BRANCH) {
 const d=object(input); let data:any;
 if(kind==='templates'){fields(d,['name','category','body','body_b','scope']);data={name:text(d.name,'Ad'),category:text(d.category,'Kategori',100),body:text(d.body,'Şablon',4000),body_b:text(d.body_b,'B şablonu',4000,true),scope:enumeration(d.scope,['branch'],'Kapsam')};}
 else if(kind==='experiments'){fields(d,['name','template_id','variant_a','variant_b','status','traffic_percent']);data={name:text(d.name,'Ad'),variant_a:text(d.variant_a,'A varyantı',4000),variant_b:text(d.variant_b,'B varyantı',4000),status:enumeration(d.status,['draft','running','paused','completed'],'Durum'),traffic_percent:integer(d.traffic_percent,1,100,'Trafik')};if(d.template_id)data.template_id=uuid(d.template_id,'Şablon');if(data.variant_a===data.variant_b)fail('A ve B varyantları farklı olmalı.');}
 else if(kind==='escalation_rules'){fields(d,['name','event','after_hours','to_role','enabled']);data={name:text(d.name,'Ad'),event:enumeration(d.event,events,'Olay'),after_hours:integer(d.after_hours,0,168,'Gecikme'),to_role:text(d.to_role,'ERP rolü',80),enabled:boolean(d.enabled,'Etkin')};}
 else if(kind==='notification_rules'){fields(d,['user_id','event','enabled','channels']);if(!Array.isArray(d.channels)||d.channels.length!==1||d.channels[0]!=='in_app')fail('Desteklenen kanal: uygulama içi.');data={user_id:uuid(d.user_id,'Kullanıcı'),event:enumeration(d.event,events,'Olay'),enabled:boolean(d.enabled,'Etkin'),channels:['in_app']};}
 else if(kind==='store_groups'){fields(d,['name','branch_ids']);if(!Array.isArray(d.branch_ids)||d.branch_ids.length!==1||d.branch_ids[0]!==branchId)fail('Şube grubu yalnızca seçilen şubeyi içerebilir.');data={name:text(d.name,'Ad'),branch_ids:[branchId]};}
 else if(kind==='branch_settings'){fields(d,['lifecycle','tone','sla_hours']);data={lifecycle:enumeration(d.lifecycle,['onboarding','demo','live_candidate','active','live','paused','archived'],'Yaşam döngüsü'),tone:enumeration(d.tone,['inherit','samimi','profesyonel','empatik','temkinli'],'Ton'),sla_hours:integer(d.sla_hours,1,168,'SLA')};}
 else if(kind==='delegations'){fields(d,['from_user_id','to_user_id','starts_at','ends_at','scope','active']);data={from_user_id:uuid(d.from_user_id,'Devreden'),to_user_id:uuid(d.to_user_id,'Devralan'),starts_at:timestamp(d.starts_at,'Başlangıç'),ends_at:timestamp(d.ends_at,'Bitiş'),scope:enumeration(d.scope,['approvals','tasks'],'Kapsam'),active:boolean(d.active,'Etkin')};if(data.from_user_id===data.to_user_id||Date.parse(data.ends_at)<=Date.parse(data.starts_at)||Date.parse(data.ends_at)-Date.parse(data.starts_at)>366*86400000)fail('Farklı kullanıcılar ve en fazla 366 günlük geçerli zaman aralığı gerekli.');}
 else if(['legal_cases','complaints'].includes(kind)){fields(d,['work_item_id','category','assignee_id','notes','stage',...(kind==='complaints'?['severity']:[])]);data={work_item_id:uuid(d.work_item_id,'Görev'),category:text(d.category,'Kategori'),notes:text(d.notes,'Not',2000,true),stage:enumeration(d.stage,kind==='legal_cases'?['open','review','responded','closed']:['received','assigned','in_progress','resolved'],'Aşama')};if(d.assignee_id)data.assignee_id=uuid(d.assignee_id,'Sorumlu');if(kind==='complaints')data.severity=enumeration(d.severity,['normal','high','critical'],'Önem');}
 else if(kind==='compensations'){fields(d,['work_item_id','amount','currency','reason','status','reference']);if(typeof d.amount!=='number'||!Number.isFinite(d.amount)||d.amount<0||d.amount>100000000||Number(d.amount.toFixed(2))!==d.amount)fail('Tutar 0–100000000 arasında ve en fazla iki ondalık olmalı.');data={work_item_id:uuid(d.work_item_id,'Görev'),amount:d.amount,currency:enumeration(d.currency,['TRY'],'Para birimi'),reason:text(d.reason,'Gerekçe',2000),status:enumeration(d.status,['proposed','approved','rejected','recorded'],'Durum'),reference:text(d.reference,'Referans',200,true)};if(data.status==='recorded'&&!data.reference)fail('Kaydedilen ödeme için mevcut işlem referansı gerekli.');}
 else if(kind==='retention_policy'){fields(d,['review_days','closed_task_days','audit_days']);data={review_days:integer(d.review_days,1,3650,'Yorum gün'),closed_task_days:integer(d.closed_task_days,1,3650,'Kapalı görev gün'),audit_days:integer(d.audit_days,1,3650,'Denetim gün')};}
 else if(kind==='user_permissions'){fields(d,['user_id','role','active']);data={user_id:uuid(d.user_id,'Kullanıcı'),role:enumeration(d.role,['viewer','operator','legal','admin'],'Yorum rolü'),active:boolean(d.active,'Etkin')};}
 else if(kind==='ai_config'){fields(d,['persona','banned_words','knowledge_lock']);if(!Array.isArray(d.banned_words)||d.banned_words.length>100)fail('Yasaklı sözcük listesi en fazla 100 öğe içermeli.');data={persona:text(d.persona,'Kişilik',4000),banned_words:[...new Set(d.banned_words.map((s:any)=>text(s,'Sözcük',100)))],knowledge_lock:text(d.knowledge_lock,'Bilgi sınırı',6000)};}
 else fail('Desteklenmeyen kaynak türü.');
 return data;
}
function resourcePermission(ctx:Context,kind:string,data:any) {
 if(ctx.role==='viewer')fail('Bu işlem için düzenleme yetkisi gerekli.',403);
 if(kind==='user_permissions'&&!ctx.canManageGrants)fail('Kullanıcı yetkisini yalnızca bağlantı sahibi veya sunucu yöneticisi değiştirebilir.',403);
 if(['templates','experiments','escalation_rules','store_groups','branch_settings','retention_policy','ai_config'].includes(kind)&&!ctx.canAdmin)fail('Bu ayarı değiştirmek için yönetici yetkisi gerekli.',403);
 if(kind==='legal_cases'&&!ctx.canAdmin&&ctx.role!=='legal')fail('Hukuk rolü gerekli.',403);
 if(kind==='notification_rules'&&!ctx.canAdmin&&data.user_id!==ctx.user.id)fail('Yalnızca kendi bildirim kuralınızı değiştirebilirsiniz.',403);
 if(kind==='delegations'&&!ctx.canAdmin&&data.from_user_id!==ctx.user.id)fail('Yalnızca kendi yetkinizi devredebilirsiniz.',403);
 if(kind==='compensations'&&!ctx.canAdmin&&data.status!=='proposed')fail('Telafi kararını yönetici kaydetmeli.',403);
}
async function saveResource(ctx:Context) {
 const b=ctx.body,branchId=contextBranch(ctx),kind=enumeration(b.resource,kinds,'Kaynak'),data=validateResource(kind,b.data,branchId);resourcePermission(ctx,kind,data);
 const version=integer(b.expected_version,0,2147483646,'Sürüm');const id=version||b.id?uuid(b.id,'Kayıt'):crypto.randomUUID();
 let existing:any=null;if(version){existing=checked(await base(ctx).eq('id',id).eq('kind',kind).eq('archived',false).maybeSingle());if(!existing||existing.version!==version)fail('Kayıt değişti. Listeyi yenileyin.',409);}
 for(const key of ['user_id','assignee_id','from_user_id','to_user_id'])if(data[key])await activeUser(ctx,data[key]);
 if(kind==='user_permissions'&&data.user_id===ctx.connection.connected_by)fail('Bağlantı sahibinin erişimi bu ekrandan değiştirilemez.',409);
 if(kind==='delegations'){const from=await loadReviewAccess({db:ctx.db,userId:data.from_user_id,connection:ctx.connection,allowlist:[]});if(from?.source==='delegation'||(data.scope==='approvals'?from?.role!=='admin':!['operator','legal','admin'].includes(from?.role||'')))fail('Devreden kullanıcının bu kapsamda doğrudan yetkisi gerekli.',403);}
 if(kind==='compensations'&&existing&&!ctx.canAdmin&&existing.data.status!=='proposed')fail('Karara bağlanmış telafi kaydını yalnızca yönetici değiştirebilir.',403);
 if(kind==='escalation_rules'){const found=checked(await ctx.db.from('app_users').select('id').eq('role',data.to_role).eq('is_active',true).limit(1));if(!found?.length)fail('Bu rol için etkin ERP kullanıcısı bulunamadı.');}
 if(data.template_id){const template=checked(await base(ctx).eq('id',data.template_id).eq('kind','templates').eq('archived',false).maybeSingle());if(!template)fail('Etkin şube şablonu bulunamadı.',404);}
 if(kind==='experiments'&&data.status==='running'){const experiments=await rows(ctx,RESOURCE_TABLE,q=>q.eq('kind','experiments').eq('archived',false));if(experiments.some(r=>r.id!==id&&r.data.status==='running'))fail('Bir seferde tek etkin A/B deneyi çalıştırılabilir.',409);}
 let linked:any=null;if(data.work_item_id){linked=await work(ctx,data.work_item_id);if(!ctx.canAdmin&&((linked.kind==='legal'&&ctx.role!=='legal')||(ctx.role==='legal'&&linked.kind!=='legal')))fail('Bu görev rolünüzün kapsamında değil.',403);if(kind==='compensations'&&!['complaint','legal'].includes(linked.kind))fail('Telafi kaydı şikayet veya hukuk görevine bağlı olmalı.');}
 const key=singletonKinds.has(kind)?'default':kind==='user_permissions'?data.user_id:kind==='notification_rules'?`${data.user_id}:${data.event}`:['legal_cases','complaints'].includes(kind)?data.work_item_id:existing?.key||id;
 if(existing&&existing.key!==key)fail('Kayıt kimliği değiştirilemez; yeni kayıt oluşturun.');
 const changesWork=['legal_cases','complaints'].includes(kind);
 if(changesWork)integer(b.expected_work_version,1,2147483646,'Görev sürümü');
 const result=checked(await ctx.db.rpc('google_review_save_resource',{p_connection_id:ctx.connection.id,p_branch_id:branchId,p_kind:kind,p_id:id,p_key:key,p_data:data,p_expected_version:version,p_actor_id:ctx.user.id,p_work_id:changesWork?linked.id:null,p_expected_work_version:changesWork?b.expected_work_version:null,p_work_status:changesWork?['closed','resolved'].includes(data.stage)?'done':'open':null}));
 return result;
}
async function archiveResource(ctx:Context) {
 const branchId=contextBranch(ctx),kind=enumeration(ctx.body.resource,kinds,'Kaynak'),id=uuid(ctx.body.id,'Kayıt'),version=integer(ctx.body.expected_version,1,2147483646,'Sürüm');
 const row=checked(await base(ctx).eq('id',id).eq('kind',kind).maybeSingle());if(!row)fail('Kayıt bulunamadı.',404);resourcePermission(ctx,kind,row.data);
 if(['branch_settings','retention_policy','ai_config','user_permissions','notification_rules','legal_cases','complaints'].includes(kind))fail('Bu kaydı arşivlemek yerine kayıt durumunu değiştirin.');
 const saved=checked(await ctx.db.from(RESOURCE_TABLE).update({archived:true,version:version+1,updated_by:ctx.user.id,updated_at:new Date().toISOString()}).eq('connection_id',ctx.connection.id).eq('branch_id',branchId).eq('id',id).eq('kind',kind).eq('version',version).eq('archived',false).select('*').maybeSingle());if(!saved)fail('Kayıt değişti. Listeyi yenileyin.',409);
 await audit(ctx,'resource_archive',kind,id,'Yönetim kaydı arşivlendi.',{version:saved.version});return{resource:saved};
}
async function extendedRead(ctx:Context) {
 const all=await rows(ctx,RESOURCE_TABLE,q=>q.eq('archived',false));const resources:any=Object.fromEntries(kinds.map(k=>[k,[]]));
 for(const row of all){if(row.kind==='user_permissions'&&!ctx.canManageGrants)continue;if(row.kind==='notification_rules'&&!ctx.canAdmin&&row.data.user_id!==ctx.user.id)continue;resources[row.kind].push(row);}
 const notifications=checked(await base(ctx,NOTIFICATIONS).eq('user_id',ctx.user.id).order('created_at',{ascending:false}).limit(200))||[];
 const users=checked(await ctx.db.from('app_users').select('id,auth_user_id,full_name,role,is_active,branch_id').eq('is_active',true).order('full_name').limit(1000))||[];
 return{branch_id:contextBranch(ctx),resources,notifications,users:users.map((u:any)=>({id:u.id,user_id:u.auth_user_id,full_name:u.full_name,role:u.role,is_active:u.is_active,branch_id:u.branch_id})),actor:{id:ctx.user.id,role:ctx.role||'viewer',is_owner:Boolean(ctx.canManageGrants)},capabilities:{extended_management:true,templates:true,experiments:true,escalation_rules:true,notification_rules:true,store_groups:true,branch_settings:true,delegations:true,legal_cases:true,complaints:true,compensations:true,retention_preview:true,user_permissions:Boolean(ctx.canManageGrants),external_notifications:false,payments:false,automatic_deletion:false}};
}
async function escalationRun(ctx:Context) {
 if(!ctx.canAdmin)fail('Eskalasyonu çalıştırmak için yönetici yetkisi gerekli.',403);
 await assertReviewLifecycle(ctx);
 return checked(await ctx.db.rpc('google_review_run_escalation',{p_connection_id:ctx.connection.id,p_actor_id:ctx.user.id}));
}
async function retentionPreview(ctx:Context) {
 if(!ctx.canAdmin)fail('Saklama önizlemesi için yönetici yetkisi gerekli.',403);const record=checked(await base(ctx).eq('kind','retention_policy').eq('key','default').eq('archived',false).maybeSingle());if(!record)fail('Önce saklama politikasını kaydedin.',409);
 const branchId=contextBranch(ctx),policy=record.data,cutoff=(days:number)=>Date.now()-days*86400000,tasks=await rows(ctx,WORK),protectedReviews=new Set(tasks.filter(t=>!['done','published'].includes(t.status)||t.review_snapshot?.legal_hold).map(t=>t.review_id));
 const reviews:any[]=[];for(let offset=0;offset<20000;offset+=500){const batch=checked(await ctx.db.from('google_reviews').select('id,review_date,raw').eq('branch_id',branchId).order('id').range(offset,offset+499))||[];reviews.push(...batch);if(batch.length<500)break;if(offset===19500)fail('Önizleme sınırı aşıldı.',413);}
 const auditCount=await ctx.db.from('google_review_audit_log').select('id',{count:'exact',head:true}).eq('connection_id',ctx.connection.id).lt('created_at',new Date(cutoff(policy.audit_days)).toISOString());checked(auditCount);
 const reviewIdentity=(r:any)=>typeof r.raw?.reviewId==='string'?r.raw.reviewId:typeof r.raw?.name==='string'&&/^accounts\/\d+\/locations\/\d+\/reviews\/[^/]+$/.test(r.raw.name)?r.raw.name.split('/').pop():r.id;
 return{policy,source:'local_cache',cached_review_count:reviews.length,audit_scope:'connection',candidates:{reviews:reviews.filter(r=>Date.parse(r.review_date)<cutoff(policy.review_days)&&!protectedReviews.has(reviewIdentity(r))).length,closed_tasks:tasks.filter(t=>['done','published'].includes(t.status)&&!t.review_snapshot?.legal_hold&&Date.parse(t.updated_at)<cutoff(policy.closed_task_days)).length,audit:auditCount.count||0},protected_reviews:protectedReviews.size,destructive:false};
}
async function templateApply(ctx:Context) {
 await assertReviewLifecycle(ctx);
 if(ctx.role==='viewer')fail('Taslak düzenleme yetkisi gerekli.',403);const b=ctx.body,id=uuid(b.id,'Şablon');integer(b.expected_version,1,2147483646,'Şablon sürümü');integer(b.expected_work_version,1,2147483646,'Görev sürümü');enumeration(b.variant,['a','b'],'Varyant');
 const template=checked(await base(ctx).eq('id',id).eq('kind','templates').eq('archived',false).maybeSingle());if(!template||template.version!==b.expected_version)fail('Şablon değişti. Yenileyin.',409);
 const item=await work(ctx,uuid(b.work_item_id,'Görev'));if(item.kind!=='reply'||!['approval_pending','publish_failed','draft_failed'].includes(item.status))fail('Bu taslak düzenlenemez.',409);
  const raw=b.variant==='b'?template.data.body_b:template.data.body;if(!raw)fail('Seçilen şablon varyantı boş.');const isBursa=contextBranch(ctx)===REVIEW_BRANCH;const branchName=String(ctx.body.branch_name||(isBursa?'OTOTR Bursa Nilüfer':'OTOTR şubesi'));let reply=raw.replaceAll('{{musteri_adi}}',String(item.review_snapshot?.reviewer_name||'')).replaceAll('{{sube_adi}}',branchName);const signature=isBursa&&!ctx.body.branch_name?'OTOTR Bursa Nilüfer Otoekspertiz Ekibi':`${branchName} ekibi`;if(!reply.trim().endsWith(signature))reply=`${reply.trim()}\n\n${signature}`;if(reply.length>4000)fail('Doldurulmuş şablon çok uzun.');
  const {rejection:_,...snapshot}=item.review_snapshot||{};const saved=checked(await ctx.db.from(WORK).update({reply_text:reply,draft_source:'local_template',status:'approval_pending',review_snapshot:{...snapshot,template_id:id,template_version:template.version,template_variant:b.variant},approved_by:null,approved_at:null,published_at:null,attempt_id:null,last_error:null,version:item.version+1,updated_by:ctx.user.id,updated_at:new Date().toISOString()}).eq('connection_id',ctx.connection.id).eq('branch_id',contextBranch(ctx)).eq('id',item.id).eq('version',b.expected_work_version).in('status',['approval_pending','publish_failed','draft_failed']).select('*').maybeSingle());if(!saved)fail('Taslak başka bir oturumda değişti.',409);
 await audit(ctx,'template_apply','review_work_item',item.id,'Şablon taslağa uygulandı; Google’a gönderilmedi.',{template_id:id,template_version:template.version,variant:b.variant});
 return{item:saved,changed_existing_text:Boolean(item.reply_text&&item.reply_text.trim()!==reply.trim())};
}
export async function handleReviewManagement(ctx:Context) {
 const actions=['management_extended_read','resource_save','resource_archive','notification_read','escalation_run','retention_preview','template_apply'];if(!actions.includes(ctx.body?.action))return undefined;scope(ctx);
 if(ctx.body.action==='management_extended_read')return await extendedRead(ctx);
 if(ctx.body.action==='resource_save')return await saveResource(ctx);
 if(ctx.body.action==='resource_archive')return await archiveResource(ctx);
 if(ctx.body.action==='escalation_run')return await escalationRun(ctx);
 if(ctx.body.action==='retention_preview')return await retentionPreview(ctx);
 if(ctx.body.action==='template_apply')return await templateApply(ctx);
 const id=uuid(ctx.body.id,'Bildirim'),read=boolean(ctx.body.read,'Okundu');const notification=checked(await ctx.db.from(NOTIFICATIONS).update({read_at:read?new Date().toISOString():null}).eq('connection_id',ctx.connection.id).eq('branch_id',contextBranch(ctx)).eq('user_id',ctx.user.id).eq('id',id).select('*').maybeSingle());if(!notification)fail('Bildirim bulunamadı.',404);return{notification};
}
