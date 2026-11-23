// Read-only team projection. No staff assignments, target writes or reply publication.
export function officeTeamBranches(registry:any[]){
 return [{id:'branch-google-nilufer',name:'OTOTR Bursa Nilüfer Şube',region:'Marmara',city:'Bursa'},...registry.filter(b=>b.id.startsWith('branch-custom-')&&b.active===true&&b.lifecycle==='live'&&b.mode!=='demo'&&b.onboarding?.test!==true)];
}
export function teamBranchProjection(branch:any,month:string,targets:any[],plans:any[],google:any,now=Date.now()){
 const approved=plans.find(p=>{try{const scope=JSON.parse(p.scope_key);return Array.isArray(scope)&&scope.length===3&&scope[0]===branch.region&&scope[1]===branch.city&&scope[2]===branch.id&&String(p.month).slice(0,7)===month;}catch{return false;}})?.approved;
 const row=targets.find(t=>t.branch_id===branch.id&&String(t.month).slice(0,7)===month);
 const candidate=approved?.total??row?.target;
 const target=Number.isSafeInteger(candidate)&&candidate>0?candidate:null;
 const total=Number.isSafeInteger(google?.totalReviewCount)&&google.totalReviewCount>=0?google.totalReviewCount:null;
 let periodCount:number|null=null;
 if(google?.pagination_complete===true&&google?.review_count_matches===true){const seen=new Set();periodCount=0;for(const r of google.reviews||[]){const id=r.reviewId;const date=Date.parse(r.createTime);if(!id||seen.has(id)||!Number.isFinite(date)||date>now)continue;seen.add(id);if(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).format(new Date(date))===month)periodCount++;}}
 return {id:branch.id,name:branch.name,city:branch.city,month,target,target_source:target===null?'missing':approved?.total!=null?'approved_plan':'branch_target',total,period_count:periodCount,rating:typeof google?.averageRating==='number'?google.averageRating:null,remaining:target!==null&&total!==null?Math.max(0,target-total):null,progress:target!==null&&total!==null?Math.round(total/target*100):null,source_status:total===null?'unavailable':'verified'};
}
export async function officeReviewTeam(input:any){
 const {db,access,registry,readGoogle,readReply}=input;
 if(access?.role!=='admin'||!access?.is_owner)throw Object.assign(new Error('Yorum ekibi için bağlantı sahibi yönetici gerekli.'),{status:403});
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).format(new Date());
 const branches=officeTeamBranches(registry);
 const [targets,plans,google,reply]=await Promise.all([
 db.from('google_review_targets').select('branch_id,month,target').eq('connection_id','ototr-primary').eq('month',month+'-01').in('branch_id',branches.map(b=>b.id)),
 db.from('google_review_goal_plans').select('scope_key,month,approved').eq('connection_id','ototr-primary').eq('month',month+'-01').not('approved','is',null),
 readGoogle(branches).catch(()=>({branches:[],errors:[{code:'GOOGLE_UNAVAILABLE'}]})),
 readReply().catch(()=>null)
 ]);
 if(targets.error||plans.error)throw Object.assign(new Error('Kayıtlı şube hedefleri okunamadı.'),{status:503});
 for(const branch of google.branches||[])await observeOfficeBranch(db,branch).catch(()=>console.warn('Office notification observation unavailable'));
 return {month,checked_at:new Date().toISOString(),branches:branches.map(b=>teamBranchProjection(b,month,targets.data||[],plans.data||[],google.branches?.find((g:any)=>g.branch_id===b.id))),reply:reply?.summary||null,personnel_targets_enabled:false};
}
export async function observeOfficeBranch(db:any,branch:any){
 if(branch?.pagination_complete!==true||branch?.review_count_matches!==true||!Number.isSafeInteger(branch.totalReviewCount))return;
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).format(new Date());
 const [targets,plans]=await Promise.all([
 db.from('google_review_targets').select('branch_id,month,target').eq('connection_id','ototr-primary').eq('branch_id',branch.branch_id).eq('month',month+'-01'),
 db.from('google_review_goal_plans').select('scope_key,month,approved').eq('connection_id','ototr-primary').eq('month',month+'-01').not('approved','is',null)]);
 if(targets.error||plans.error)throw Error('Bildirim hedef kaynağı okunamadı.');
 const approved=(plans.data||[]).find((p:any)=>{try{const path=JSON.parse(p.scope_key);return path.length===3&&path[2]===branch.branch_id;}catch{return false;}})?.approved;
 const rawTarget=approved?.total??targets.data?.[0]?.target;
 const result=await db.rpc('observe_review_office',{p_branch_id:branch.branch_id,p_review_ids:[...new Set(branch.reviews.map((r:any)=>r.reviewId).filter(Boolean))],p_reply_ids:[...new Set(branch.reviews.filter((r:any)=>String(r.reviewReply?.comment||'').trim()).map((r:any)=>r.reviewId).filter(Boolean))],p_month:month,p_target:Number.isSafeInteger(rawTarget)&&rawTarget>0?rawTarget:null,p_total:branch.totalReviewCount});
 if(result.error)throw Error('Bildirim gözlemi kaydedilemedi.');
}
export async function officeNotifications(db:any,body:any,access:any,user:any){
 if(access?.role!=='admin'||!access?.is_owner)throw Object.assign(new Error('Bildirimler için bağlantı sahibi yönetici gerekli.'),{status:403});
 if(body.action==='office_notification_read'){
 if(typeof body.id!=='string'||! /^[0-9a-f-]{36}$/i.test(body.id))throw Object.assign(new Error('Geçersiz bildirim.'),{status:400});
 const r=await db.from('google_review_notifications').update({read_at:new Date().toISOString()}).eq('id',body.id).eq('connection_id','ototr-primary').eq('user_id',user.id).select('id').maybeSingle();if(r.error)throw Error('Bildirim güncellenemedi.');if(!r.data)throw Object.assign(new Error('Bildirim bulunamadı.'),{status:404});return{ok:true};
 }
 const r=await db.from('google_review_notifications').select('id,branch_id,event,title,body,created_at,read_at,review_id,goal_month').eq('connection_id','ototr-primary').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);if(r.error)throw Error('Bildirimler okunamadı.');return{items:r.data||[]};
}
