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
 return {month,checked_at:new Date().toISOString(),branches:branches.map(b=>teamBranchProjection(b,month,targets.data||[],plans.data||[],google.branches?.find((g:any)=>g.branch_id===b.id))),reply:reply?.summary||null,personnel_targets_enabled:false};
}
