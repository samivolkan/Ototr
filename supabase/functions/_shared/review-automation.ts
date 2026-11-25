export const AUTOMATION_BRANCH = 'branch-google-nilufer';
export async function verifyWorker(db: any, token: string, requireLease = false) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Object.assign(new Error('Sunucu iş kimliği geçersiz.'), { status: 401 });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2,'0')).join('');
  const result = await db.from('google_review_automation').select('*').eq('branch_id',AUTOMATION_BRANCH).maybeSingle();
  if (result.error) throw Object.assign(new Error('Otomasyon yapılandırması okunamadı.'),{status:503});
  const row = result.data;
  if (!row?.enabled || row.token_digest !== digest || (requireLease && (!row.lease_id || Date.parse(row.lease_until) <= Date.now()))) throw Object.assign(new Error('Sunucu iş kimliği geçersiz veya devre dışı.'),{status:401});
  return row;
}
export async function automationStatus(db: any) {
  const [state,runs,ai] = await Promise.all([
    db.from('google_review_automation').select('branch_id,enabled,interval_minutes,last_started_at,last_finished_at,last_success_at,last_google_success_at,next_run_at,status,last_error,reviewed,prepared,published,approval_pending').eq('branch_id',AUTOMATION_BRANCH).maybeSingle(),
    db.from('google_review_automation_runs').select('id,started_at,finished_at,status,reviewed,prepared,published,approval_pending,error').eq('branch_id',AUTOMATION_BRANCH).order('started_at',{ascending:false}).limit(10),
    db.from('google_review_ai_generations').select('status,failure_code,model,latency_ms,created_at').eq('branch_id',AUTOMATION_BRANCH).order('created_at',{ascending:false}).limit(1)
  ]);
  if (state.error || runs.error || ai.error) throw Object.assign(new Error('Servis durumu okunamadı.'),{status:503});
  return {automation:state.data,runs:runs.data||[],ai:ai.data?.[0]||null,checked_at:new Date().toISOString()};
}
const googleStars: Record<string, number> = { ONE:1, TWO:2, THREE:3, FOUR:4, FIVE:5 };
export function matchesReviewSnapshot(review: any, snapshot: any) {
  return Boolean(review && snapshot) && String(review.comment || '').slice(0, 6000) === snapshot.comment &&
    googleStars[review.starRating] === Number(snapshot.rating);
}
export function canRevisePublishedReply(review: any, item: any) {
  const snapshot = item?.review_snapshot;
  const priorReply = item?.status === 'published' ? item.reply_text :
    item?.status === 'approval_pending' && snapshot?.edited_review ? item.expected_reply : '';
  return item?.draft_source === 'openai' && typeof snapshot?.comment === 'string' &&
    !snapshot.legal_hold && !snapshot.rejection && !matchesReviewSnapshot(review, snapshot) &&
    Boolean(priorReply?.trim()) && String(review.reviewReply?.comment || '').trim() === priorReply.trim();
}
// Dependencies use the same Google read, AI validation and publication code as the ERP.
export async function runAutomation(db: any, workerToken: string, deps: any) {
  await verifyWorker(db,workerToken);
  const id=crypto.randomUUID();
  const claim=await db.rpc('claim_google_review_automation',{p_lease:id});
  if(claim.error) throw new Error('Sunucu çalışma kilidi alınamadı.');
  if(!claim.data?.length) return {skipped:true,reason:'not_due_or_running'};
  let counts={reviewed:0,prepared:0,published:0,approval_pending:0};
  let googleSuccess: string|null=null, failure: string|null=null;
  const started=Date.now();
  const run=await db.from('google_review_automation_runs').insert({id,branch_id:AUTOMATION_BRANCH});
  try {
    if(run.error) throw new Error('Çalışma kaydı oluşturulamadı.');
    const {connection,user}=await deps.connection();
    await deps.lifecycle(connection);
    const synced=await deps.sync(connection);
    const branch=synced.branches?.find((b:any)=>b.branch_id===AUTOMATION_BRANCH);
    if(synced.errors?.length || !branch || !branch.pagination_complete) throw new Error(synced.errors?.[0]?.error || 'Google kayıtları tam alınamadı.');
    googleSuccess=new Date().toISOString();counts.reviewed=branch.reviews.length;
    if(deps.observe)try{await deps.observe(branch);}catch{console.warn('Office notification observation unavailable');}
    const pending=branch.reviews.filter((r:any)=>!String(r.reviewReply?.comment||'').trim());
    // A bounded batch protects provider quotas and the edge request deadline.
    const byId = new Map(branch.reviews.map((review:any) => [review.reviewId,review]));
    const edited = branch.reviews.filter((review:any) =>
      String(review.reviewReply?.comment || '').trim() &&
      Date.parse(review.updateTime) > Date.parse(review.createTime));
    for(const review of [...edited, ...pending]) {
      if(counts.prepared>=2 || Date.now()-started>85000) break;
      const existing=await deps.find(review,branch);
      const replacement = canRevisePublishedReply(review, existing) ? existing : null;
      if (existing && !replacement) continue;
      if (!replacement && String(review.reviewReply?.comment || '').trim()) continue;
      const result=await deps.prepare(user,connection,review,branch,workerToken,replacement);
      counts.prepared++;
      if(result.item?.status==='draft_failed') throw new Error(result.item.last_error || 'AI taslağı hazırlanamadı.');
    }
    const queue=await db.from('google_review_work_items').select('*').eq('connection_id','ototr-primary').eq('branch_id',AUTOMATION_BRANCH).eq('kind','reply').eq('status','approval_pending').order('created_at',{ascending:true}).limit(100);
    if(queue.error)throw new Error('Onay kuyruğu okunamadı.');
    counts.approval_pending=queue.data?.length||0;
    let attempted=0;
    const unanswered=new Set(pending.map((r:any)=>r.reviewId));
    for(const item of queue.data||[]) {
      if(attempted>=2 || Date.now()-started>105000)break;
      const live:any = byId.get(item.review_id);
      const replacement = item.review_snapshot?.edited_review === true &&
        String(live?.reviewReply?.comment || '').trim() === String(item.expected_reply || '').trim() &&
        Boolean(item.expected_reply?.trim()) && matchesReviewSnapshot(live, item.review_snapshot);
      if (item.review_snapshot?.edited_review ? !replacement : !unanswered.has(item.review_id)) continue;
      try { await deps.safe(item); } catch(e:any) { if(e.status===409)continue; throw e; }
      attempted++;
      const result=await deps.publish(user,item,connection);
      if(result.item?.status==='published') {counts.published++;counts.approval_pending--;}
      else if(result.item?.status==='publish_failed') throw new Error(result.item.last_error||'Google yayını başarısız.');
    }
  } catch(e:any) { failure=String(e?.message||'Sunucu işlemi başarısız.').slice(0,500); }
  const finished=new Date().toISOString(),status=failure?'failed':'succeeded';
  const result=await db.from('google_review_automation_runs').update({...counts,status,error:failure,finished_at:finished}).eq('id',id);
  const saved=await db.from('google_review_automation').update({...counts,status,last_error:failure,last_finished_at:finished,lease_id:null,lease_until:null,...(googleSuccess?{last_google_success_at:googleSuccess}:{}),...(!failure?{last_success_at:finished}:{})}).eq('branch_id',AUTOMATION_BRANCH).eq('lease_id',id);
  if(result.error||saved.error)throw new Error('Otomasyon sonucu kaydedilemedi.');
  return {id,status,...counts,error:failure};
}
