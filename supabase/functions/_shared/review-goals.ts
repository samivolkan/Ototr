export class ReviewGoalError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

type Branch = {id:string; region:string; city:string};
type Actor = {id:string; role:'gm'|'region'|'branch'|'viewer'; branch?:Branch};
type Values = {total:number; stars:number; starCount:number; rating:number};
type Plan = {version:number; status:string; draft:Values; approved:Values|null; history:unknown[]};
const fail = (message:string, status:number):never => { throw new ReviewGoalError(message,status); };

export function goalActions(actor:Actor, path:string[], status:string) {
  const local = actor.branch;
  const ownBranch = path.length === 3 && local?.id === path[2];
  const ownRegion = !!local && path[0] === local.region;
  const visible = actor.role === 'gm' || (actor.role === 'branch' && ownBranch) || (actor.role === 'region' && ownRegion);
  if (!visible) return null;
  const edit = actor.role === 'gm' || (actor.role === 'branch' && ownBranch) || (actor.role === 'region' && ownRegion);
  const review = actor.role === 'gm' || actor.role === 'region' && ownRegion;
  if (['new','draft','revision'].includes(status)) return edit ? ['save','submit'] : [];
  if (status === 'regional') return review ? ['forward','revise'] : [];
  if (status === 'pending') return actor.role === 'gm' ? ['approve','revise'] : [];
  return status === 'approved' && edit ? ['revise'] : [];
}

export function transitionGoal(actor:Actor,path:string[],plan:Plan|null,action:string,input:any,reason:unknown) {
  if (!goalActions(actor,path,plan?.status || 'new')?.includes(action)) fail('Bu hedef işlemi için yetkiniz yok veya hedefin durumu değişti.',403);
  let draft = plan?.draft;
  let approved = plan?.approved || null;
  let status = plan?.status;
  if (action === 'save' || action === 'submit') {
    const {total,stars,starCount,rating} = input || {};
    if (![total,stars,starCount].every(Number.isSafeInteger) || total<1 || total>10000000 ||
        stars<1 || stars>5 || starCount<0 || starCount>total || typeof rating!=='number' ||
        !Number.isFinite(rating) || rating<1 || rating>5 || Math.abs(rating*10-Math.round(rating*10))>1e-8) {
      fail('Yorum adedi, yıldız türü, yıldızlı yorum adedi ve puan hedefini kontrol edin.',400);
    }
    draft = {total,stars,starCount,rating};
    status = action === 'save' ? 'draft' : path.length>=2 ? 'regional' : 'pending';
  } else if (action === 'forward') {
    status = 'pending';
  } else if (action === 'approve') {
    approved = draft!;
    status = 'approved';
  } else {
    if (typeof reason !== 'string' || !reason.trim() || reason.length>500) fail('500 karakteri geçmeyen revizyon gerekçesi girin.',400);
    status = 'revision';
  }
  const updated_at = new Date().toISOString();
  return {version:(plan?.version || 0)+1,status,draft,approved,updated_at,
    history:[...(plan?.history || []),{action,at:updated_at,role:actor.role,actorId:actor.id,reason:action==='revise'?String(reason).trim():null,values:draft}]};
}

export async function handleReviewGoals({db,connectionId,actor,branches,body}:{db:any;connectionId:string;actor:Actor;branches:Branch[];body:any}) {
  const {path,month} = body;
  if (!Array.isArray(path) || path.length>3 || path.some(value=>typeof value!=='string' || !value || value.length>150) ||
      path.length && !branches.some(b=>path.every((value,i)=>[b.region,b.city,b.id][i]===value)) ||
      typeof month!=='string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) fail('Geçerli ERP kapsamı ve hedef ayı seçin.',400);
  const scopeKey=JSON.stringify(path);
  const table=()=>db.from('google_review_goal_plans');
  const scoped=(q:any)=>q.eq('connection_id',connectionId).eq('scope_key',scopeKey).eq('month',month+'-01');
  if (body.action==='goal_plan_list') {
    if (actor.role==='viewer' || (actor.role!=='gm' && !actor.branch)) fail('Onaylı hedeflere erişiminiz yok.',403);
    const result=await table().select('scope_key,month,approved').eq('connection_id',connectionId).not('approved','is',null).order('month',{ascending:false}).limit(1000);
    if(result.error) fail('Onaylı hedefler okunamadı.',503);
    return {items:(result.data || []).filter((row:any)=>goalActions(actor,JSON.parse(row.scope_key),'approved')!==null)};
  }
  if (goalActions(actor,path,'new')===null) fail('Bu hedef kapsamına erişiminiz yok.',403);
  const current=await scoped(table().select('version,status,draft,approved,history')).maybeSingle();
  if(current.error) fail('Hedef planı okunamadı.',503);
  let record:Plan|null=current.data;
  if(body.action==='goal_plan_transition') {
    if (body.expected_version!==(record?.version || 0)) fail('Hedef değişti. Sayfayı yenileyip tekrar deneyin.',409);
    const next=transitionGoal(actor,path,record,body.transition,body.values,body.reason);
    const response=record
      ? await scoped(table().update(next)).eq('version',record.version).select('version,status,draft,approved,history').maybeSingle()
      : await table().insert({...next,connection_id:connectionId,scope_key:scopeKey,month:month+'-01'}).select('version,status,draft,approved,history').maybeSingle();
    if(response.error?.code==='23505' || !response.error && !response.data) fail('Hedef başka bir oturumda değişti.',409);
    if(response.error) fail('Hedef değişikliği kaydedilemedi.',503);
    record=response.data;
  }
  return {record,actions:goalActions(actor,path,record?.status || 'new')};
}
