export function validateDesk(value){
 if(value?.source!=='office_decision_queue'||value.scope!=='current_user_scope'||typeof value.configured!=='boolean')throw Error('Karar masası doğrulanamadı.');
 if(!value.configured)return value;
 const b=value.budget;
 if(typeof value.is_owner!=='boolean'||value.business_actions_executed!==false||!b||b.queue_limit!==10||b.daily_limit!==45||b.weekly_limit!==840||!['pending','today_reserved','today_actual','week_reserved','week_actual'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0)||b.pending>10||!Array.isArray(value.items)||!Array.isArray(value.review_items)||value.items.length+value.review_items.length!==b.pending)throw Error('Kuyruk kapasitesi doğrulanamadı.');
 const ids=new Set();
 for(const [rows,state]of [[value.items,'pending'],[value.review_items,'review_required']])for(const row of rows){
  if(typeof row.id!=='string'||ids.has(row.id)||row.state!==state||!Number.isSafeInteger(row.version)||row.version<1||typeof row.source_current!=='boolean'||typeof row.can_review!=='boolean'||!row.plan||!['finding','evidence','recommendation','risk','effort','decision'].every(k=>typeof row.plan[k]==='string'))throw Error('Karar kaydı doğrulanamadı.');
  ids.add(row.id);
 }
 return value;
}
export function createDecisionDesk({rpc,newId}){
 let view=null,source=null;const attempts=new Map();
 const save=value=>{view=structuredClone(validateDesk(value));return structuredClone(view);};
 async function read(){return save(await rpc('office_decision_queue',{p_action:'read'}));}
 async function loadSource(id){
  source=null;
  const d=await rpc('task2_delivery_action',{p_task_id:id,p_action:'read'});
  if(d?.source!=='task2'||d.task_id!==id||d.current!==true||d.is_manager!==true||d.archived!==false||d.state!=='reviewed'||!Number.isSafeInteger(d.version)||!/^[a-f0-9]{32}$/.test(d.source_revision)||typeof d.reference!=='string')throw Error('Güncel ve bağımsız incelenmiş bir görev teslimi gerekli.');
  source=structuredClone(d);return structuredClone(d);
 }
 async function act(action,draft={}){
  if(!view)throw Error('Önce karar masasını okuyun.');
  let payload;
  if(action==='initialize'){
   if(view.configured)throw Error('Karar masası zaten kurulmuş.');payload={};
  }else{
   if(!view.configured)throw Error('Önce karar masası kurulmalı.');
   if(action==='enqueue'){
    if(!source)throw Error('Önce incelenmiş görev kaynağını okuyun.');
    payload={task_id:source.task_id,source_revision:source.source_revision,delivery_version:source.version,
     decision_key:draft.key,priority:Number(draft.priority),minutes:Number(draft.minutes),day:draft.day,
     plan:{finding:draft.finding,evidence:source.reference,recommendation:draft.recommendation,risk:draft.risk,effort:draft.effort,decision:draft.decision}};
   }else{
    const row=[...view.items,...view.review_items].find(r=>r.id===draft.id);if(!row)throw Error('Güncel karar kaydını okuyun.');
    if(action==='review'){
     if(!row.can_review||!row.source_current||row.state!=='review_required')throw Error('Bağımsız inceleme için durum uygun değil.');
     payload={id:row.id,version:row.version,note:draft.note};
    }else if(action==='answer'||action==='cancel'){
     if(!view.is_owner||action==='answer'&&(!row.source_current||row.state!=='pending'))throw Error('Bu karar için sahiplik veya kaynak uygun değil.');
     if(action==='answer'&&(draft.minutes===null||draft.minutes===undefined||String(draft.minutes).trim()===''))throw Error('Gerçek inceleme süresini belirtin.');
     payload={id:row.id,version:row.version,answer:draft.answer,...(action==='answer'?{minutes:Number(draft.minutes)}:{})};
    }else throw Error('Tanımsız karar işlemi.');
   }
  }
  const key=JSON.stringify([action,payload]);if(!attempts.has(key))attempts.set(key,newId());
  return save(await rpc('office_decision_queue',{p_action:action,p_payload:payload,p_request_id:attempts.get(key)}));
 }
 return {read,loadSource,act};
}
