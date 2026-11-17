import {checkShiftLimits,validateShiftLimits} from './shift-planning.mjs';
import {HrStore as WorkflowStore,seed,policyBalance,leaveTypes} from './workflows.mjs';
import {DAY,clone,iso,leaveDays} from './model.mjs';
export {seed};
const OFFSET=3*3600000;
const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')||!Number.isFinite(Date.parse(value))||iso(value)!==value)throw Error('Tarih geçersiz.');return value;};
export const businessDate=value=>iso(new Date(value).getTime()+OFFSET);
const round=value=>Math.round(value*10000)/10000;

// Derive attendance from closed sessions; never overwrite a manual correction.
export function attendanceDays(entries){
 const days=new Map();
 for(const entry of entries){
  if(!entry.out)continue;
  let cursor=Date.parse(entry.in);const end=Date.parse(entry.out);
  if(!Number.isFinite(cursor)||!Number.isFinite(end)||end<cursor||end-cursor>DAY)throw Error('PDKS oturumu 0–24 saat aralığında olmalıdır.');
  while(cursor<end){const date=businessDate(cursor),stop=Math.min(end,Date.parse(date)+DAY-OFFSET),key=entry.employeeId+'|'+date;
   const value=days.get(key)||{employeeId:entry.employeeId,date,milliseconds:0,entryIds:[]};
   value.milliseconds+=stop-cursor;value.entryIds.push(entry.id);days.set(key,value);cursor=stop;
  }
 }
 return [...days.values()].map(({milliseconds,...row})=>({...row,hours:round(milliseconds/3600000)}));
}

export class HrStore extends WorkflowStore {
 constructor(data=seed(),options={}){super(data,options);this.now=options.now||(()=>new Date().toISOString());}
 validate(){super.validate();if(this.state.settings.shiftLimits)validateShiftLimits(this.state.settings.shiftLimits);const ids=this.state.employees.map(e=>e.id),validIds=list=>Array.isArray(list)&&list.every(id=>ids.includes(id))&&new Set(list).size===list.length;
  for(const e of this.state.employees){for(const p of e.positions){validDate(p.start);if(p.scheduled&&(!this.state.settings.branches.includes(p.branch)||!this.state.settings.departments.includes(p.department)||!p.title))throw Error('Planlı pozisyon geçersiz.');}for(const r of e.salaryHistory){validDate(r.start);if(!Number.isFinite(Number(r.amount))||Number(r.amount)<0)throw Error('Maaş geçmişi geçersiz.');}}
  for(const a of this.state.assessments){if(a.reviewerAssignments!==undefined&&(!Array.isArray(a.reviewerAssignments)||a.reviewerAssignments.some(r=>!a.participants?.includes(r.employeeId)||!validIds(r.reviewers)||!r.reviewers.length)))throw Error('Değerlendirici yedeği geçersiz.');if(a.reviews!==undefined&&(!Array.isArray(a.reviews)||a.reviews.some(r=>!a.reviewerAssignments?.some(t=>t.employeeId===r.employeeId&&t.reviewers.includes(r.reviewerId))||!Array.isArray(r.answers)||r.answers.length!==a.questions.length||r.answers.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100))))throw Error('Soru yanıtı yedeği geçersiz.');}
  for(const c of this.state.compensations){if(c.approvalChain!==undefined&&!validIds(c.approvalChain))throw Error('Ücret onay zinciri geçersiz.');for(const p of c.proposals||[])if(p.approvers&&(!validIds(p.approvers)||!Array.isArray(p.approvals)||p.approvals.length>p.approvers.length||p.approvals.some((v,i)=>v.actor!==p.approvers[i])))throw Error('Ücret onay kaydı geçersiz.');}
  const seen=new Set();for(const r of this.state.timesheets){validDate(r.date);const key=r.employeeId+'|'+r.date;if(seen.has(key)||!Number.isFinite(Number(r.hours))||Number(r.hours)<0||Number(r.hours)>24)throw Error('Puantaj yedeği geçersiz.');seen.add(key);}
  const externalIds=new Set(),intervals=new Map();
  for(const r of this.state.clockEntries||[]){
   const from=Date.parse(r.in),to=r.out?Date.parse(r.out):Infinity;
   if(!ids.includes(r.employeeId)||!Number.isFinite(from)||r.out&&(!Number.isFinite(to)||to<from||to-from>DAY))throw Error('PDKS yedeğinde tarih veya çalışan geçersiz.');
   if(r.externalId){if(externalIds.has(r.externalId))throw Error('PDKS cihaz kimliği yinelenmiş.');externalIds.add(r.externalId);}
   const previous=intervals.get(r.employeeId)||[];
   if(previous.some(x=>x.from<to&&x.to>from))throw Error('PDKS yedeğinde çakışan oturumlar var.');
   previous.push({from,to});intervals.set(r.employeeId,previous);
  }
  attendanceDays(this.state.clockEntries||[]);
 }
 saveEmployee(input,id){if(input.policyId&&!this.state.policies.some(p=>p.id===input.policyId))throw Error('İzin politikası bulunamadı.');if(id===this.actor&&input.status==='inactive')throw Error('Kendi hesabınızı pasife alamazsınız.');return super.saveEmployee(input,id);}
 advanceDate(value,{automatic=false}={}){
  if(!automatic)this.admin();validDate(value);if(value<this.state.today)throw Error('Çalışma tarihi geri alınamaz.');
  const due=this.state.employees.some(e=>[...e.positions,...e.salaryHistory].some(r=>r.scheduled&&r.start<=value));
  if(value===this.state.today&&!due)return {salary:0,position:0};
  return this.transaction('Çalışma tarihi ve planlı değişiklikler işlendi',()=>{
   const result={salary:0,position:0};
   for(let year=Number(this.state.today.slice(0,4));year<Number(value.slice(0,4));year++){const carry=this.state.employees.map(e=>({id:e.id,days:Math.max(0,policyBalance(this.state,e.id,year+'-12-31').available)}));for(const item of carry)this.employee(item.id).carryDays=item.days;}
   for(const e of this.state.employees){
    for(const r of e.salaryHistory.filter(r=>r.scheduled&&r.start<=value).sort((a,b)=>a.start.localeCompare(b.start))){r.previousAmount=e.salary;e.salary=Number(r.amount);r.scheduled=false;r.appliedAt=value;result.salary++;}
    for(const r of e.positions.filter(r=>r.scheduled&&r.start<=value).sort((a,b)=>a.start.localeCompare(b.start))){if(!this.state.settings.branches.includes(r.branch)||!this.state.settings.departments.includes(r.department))throw Error('Planlı pozisyonun birimi bulunamadı.');Object.assign(e,{branch:r.branch,department:r.department,title:r.title});r.scheduled=false;r.appliedAt=value;result.position++;}
   }
   this.state.today=value;return result;
  });
 }
 position(id,input){if(this.employee(id).positions.some(p=>p.scheduled&&p.start===input.start))throw Error('Bu tarihte planlı pozisyon var.');return super.position(id,input);}
 shift(input){checkShiftLimits(this.state,input);return super.shift(input);}
 settings(input){if(input.shiftLimits)validateShiftLimits(input.shiftLimits);for(const [key,field] of [['branches','branch'],['departments','department']])if(input[key]&&this.state.employees.some(e=>e.positions.some(p=>p.scheduled&&!input[key].includes(p[field]))))throw Error('Planlı pozisyonun kullandığı birim kaldırılamaz.');return super.settings(input);}
 syncAttendanceRows(employeeId){
  const rows=attendanceDays(this.state.clockEntries.filter(r=>!employeeId||r.employeeId===employeeId));
  const conflicts=[];
  for(const row of rows){const old=this.state.timesheets.find(t=>t.employeeId===row.employeeId&&t.date===row.date);
   if(old&&old.source!=='clock'){conflicts.push({employeeId:row.employeeId,date:row.date});continue;}
   const value={...row,source:'clock',note:'PDKS giriş/çıkışlarından hesaplandı'};
   if(old)Object.assign(old,value);else this.state.timesheets.push({id:crypto.randomUUID(),...value});
  }
  return conflicts;
 }
 syncAttendance(){this.admin();return this.transaction('PDKS kayıtları puantaja aktarıldı',()=>this.syncAttendanceRows());}
 correctAttendance(id,{start,end,note}){this.admin();return this.transaction('PDKS oturumu gerekçeyle düzeltildi',()=>{const row=this.state.clockEntries.find(r=>r.id===id),from=Date.parse(start),to=Date.parse(end);if(!row||typeof note!=='string'||!note.trim()||note.length>10000||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>DAY)throw Error('Gerekçe ve 0–24 saatlik geçerli oturum gerekir.');if(businessDate(from)<this.employee(row.employeeId).start)throw Error('İşe giriş öncesi PDKS kaydı olamaz.');if(this.state.clockEntries.some(r=>r.id!==id&&r.employeeId===row.employeeId&&Date.parse(r.in)<to&&(!r.out||Date.parse(r.out)>from)))throw Error('PDKS oturumları çakışıyor.');row.corrections??=[];row.corrections.push({in:row.in,out:row.out,actor:this.actor,note:note.trim(),at:this.now()});row.in=new Date(from).toISOString();row.out=new Date(to).toISOString();row.minutes=Math.round((to-from)/60000);this.state.timesheets=this.state.timesheets.filter(t=>t.employeeId!==row.employeeId||t.source!=='clock');return this.syncAttendanceRows(row.employeeId);});}
 clock(employeeId,kind){
  if(!this.allowedEmployee(employeeId)||this.employee(employeeId).status!=='active')throw Error('Çalışan erişimi yok.');
  return this.transaction('PDKS ve puantaj güncellendi',()=>{
   const now=this.now(),stamp=Date.parse(now);if(!Number.isFinite(stamp))throw Error('Saat geçersiz.');
   const entries=this.state.clockEntries.filter(e=>e.employeeId===employeeId),open=entries.find(e=>!e.out);
   if(kind==='in'){if(open)throw Error('Açık giriş kaydı var.');if(entries.some(e=>e.out&&Date.parse(e.out)>stamp))throw Error('Önceki çıkıştan önce giriş yapılamaz.');this.state.clockEntries.push({id:crypto.randomUUID(),employeeId,in:new Date(stamp).toISOString(),out:null});return [];}
   if(kind!=='out')throw Error('İşlem geçersiz.');if(!open)throw Error('Önce giriş yapın.');
   if(stamp<Date.parse(open.in)||stamp-Date.parse(open.in)>DAY)throw Error('Giriş/çıkış 0–24 saat aralığında olmalıdır.');
   open.out=new Date(stamp).toISOString();open.minutes=Math.round((stamp-Date.parse(open.in))/60000);
   return this.syncAttendanceRows(employeeId);
  });
 }
 timesheet(input){return super.timesheet({...input,source:'manual'});}
 useClockAttendance(employeeId,date){this.admin();return this.transaction('Puantaj PDKS kaynağına döndürüldü',()=>{const row=attendanceDays(this.state.clockEntries).find(r=>r.employeeId===employeeId&&r.date===date);if(!row)throw Error('Kapalı PDKS kaydı bulunamadı.');const old=this.state.timesheets.find(r=>r.employeeId===employeeId&&r.date===date);if(old)Object.assign(old,{...row,source:'clock',note:'PDKS giriş/çıkışlarından hesaplandı'});else this.state.timesheets.push({id:crypto.randomUUID(),...row,source:'clock',note:'PDKS giriş/çıkışlarından hesaplandı'});});}
 importAttendance(rows){
  this.admin();if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('1–500 PDKS oturumu gerekir.');
  return this.transaction('PDKS oturum dosyası içe aktarıldı',()=>{let added=0,skipped=0;
   for(const r of rows){if(typeof r.externalId!=='string'||!/^[-a-zA-Z0-9_:]{1,120}$/.test(r.externalId))throw Error('Cihaz kayıt kimliği geçersiz.');const employee=this.employee(r.employeeId);const from=Date.parse(r.in),to=Date.parse(r.out);if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>DAY||!/[Z]|[+-]\d\d:\d\d$/.test(r.in)||!/[Z]|[+-]\d\d:\d\d$/.test(r.out))throw Error('Saat dilimi içeren 0–24 saatlik giriş/çıkış gerekir.');
    if(businessDate(from)<employee.start)throw Error('İşe giriş öncesi PDKS kaydı alınamaz.');
    const old=this.state.clockEntries.find(e=>e.externalId===r.externalId);if(old){if(old.employeeId!==r.employeeId||Date.parse(old.in)!==from||Date.parse(old.out)!==to)throw Error('Aynı cihaz kimliği farklı kayıt içeriyor.');skipped++;continue;}
    if(this.state.clockEntries.some(e=>e.employeeId===r.employeeId&&Date.parse(e.in)<to&&(!e.out||Date.parse(e.out)>from)))throw Error('PDKS oturumları çakışıyor.');
    this.state.clockEntries.push({id:crypto.randomUUID(),externalId:r.externalId,employeeId:r.employeeId,in:new Date(from).toISOString(),out:new Date(to).toISOString(),minutes:Math.round((to-from)/60000)});added++;
   }
   return {added,skipped,conflicts:this.syncAttendanceRows()};
  });
 }
 attachReceipt(requestId,documentId){return this.transaction('Harcama belgesi ilişkilendirildi',()=>{const r=this.state.requests.find(r=>r.id===requestId),d=this.state.documents.find(d=>d.id===documentId);if(!r||r.type!=='Harcama'||r.status!=='pending'||!this.allowedEmployee(r.employeeId))throw Error('Bekleyen harcama erişimi yok.');if(!d?.base64||d.status==='completed'||d.employeeId!==r.employeeId)throw Error('Çalışana ait aktif belge seçin.');r.receiptId=d.id;});}
 archiveDocument(id,archived){if(archived&&this.state.requests.some(r=>r.receiptId===id&&['pending','approved'].includes(r.status)))throw Error('Aktif harcamaya bağlı belge arşivlenemez.');return super.archiveDocument(id,archived);}
 importPayroll({month,provider,rows}){this.admin();if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||typeof provider!=='string'||!provider.trim()||provider.length>120||!Array.isArray(rows)||!rows.length)throw Error('Bordro dönemi, kaynak ve satırlar gerekir.');return this.transaction('Harici demo bordro dosyası alındı',()=>{if(this.state.payrolls.some(p=>p.month===month))throw Error('Bu dönemin bordrosu zaten var.');const seen=new Set();const normalized=rows.map(r=>{this.employee(r.employeeId);if(seen.has(r.employeeId))throw Error('Yinelenen çalışan bordrosu.');seen.add(r.employeeId);const result={employeeId:r.employeeId};for(const key of ['gross','contribution','tax','net','cost','additions','deductions']){const value=r[key]??(['additions','deductions'].includes(key)?0:undefined);if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9)throw Error('Bordro tutarı geçersiz.');result[key]=value;}if(Math.abs(result.gross-result.contribution-result.tax+result.additions-result.deductions-result.net)>0.011)throw Error('Brüt, kesinti ve net toplamları tutarsız.');if(result.cost<result.gross)throw Error('İşveren maliyeti brütün altında olamaz.');return result;});const id=crypto.randomUUID();this.state.payrolls.push({id,month,status:'draft',source:'external-demo',provider:provider.trim(),rows:normalized});return id;});}
 assignPolicy(ids,policyId){this.admin();if(!Array.isArray(ids)||!ids.length||!this.state.policies.some(p=>p.id===policyId))throw Error('Çalışan ve politika seçin.');return this.transaction('Çalışan izin politikası atandı',()=>{for(const id of ids){const e=this.employee(id);if(this.state.requests.some(r=>r.employeeId===id&&r.type==='İzin'&&r.status==='pending'))throw Error('Önce çalışanın bekleyen izin taleplerini sonuçlandırın.');e.policyId=policyId;e.usePolicy=true;}});}
 leaveTypeRule(policyId,type,input){this.admin();return this.transaction('İzin türü kuralı kaydedildi',()=>{const p=this.state.policies.find(p=>p.id===policyId);if(!p||!leaveTypes.includes(type))throw Error('Politika ve izin türü seçin.');const r={};for(const key of ['minDays','maxDays','waitingDays','yearlyLimit']){const n=Number(input[key]);if(input[key]===''||!Number.isFinite(n)||n<0||n>3660)throw Error('İzin sınırları 0–3660 arasında olmalıdır.');r[key]=n;}if(r.maxDays&&r.minDays>r.maxDays)throw Error('En az süre en çok süreden büyük olamaz.');for(const key of ['calendarDays','requireNote','requireReplacement','paidLeave'])r[key]=Boolean(input[key]);p.leaveTypeRules??={};p.leaveTypeRules[type]=r;});}
 request(input){if(input.type!=='İzin')return super.request(input);const p=this.policyFor(input.employeeId,input.leaveType),days=this.requestDays(input);if(p.yearlyLimit){const reserved=this.state.requests.filter(r=>r.employeeId===input.employeeId&&r.type==='İzin'&&r.leaveType===input.leaveType&&r.start?.slice(0,4)===input.start.slice(0,4)&&['pending','approved'].includes(r.status)).reduce((sum,r)=>sum+r.days,0);if(reserved+days>p.yearlyLimit)throw Error('Bu izin türünün yıllık sınırı aşıldı.');}return super.request({...input,paidLeave:p.paidLeave??input.leaveType!=='Ücretsiz İzin',policyId:p.id,policyWeekdays:[...p.weekdays],policyCalendarDays:p.calendarDays});}
 attendanceSummary(employeeId,month){if(!this.allowedEmployee(employeeId))throw Error('Puantaj erişimi yok.');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Dönem geçersiz.');const end=iso(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)),requests=this.state.requests.filter(r=>r.employeeId===employeeId&&r.status==='approved');let paidLeave=0,unpaidLeave=0;for(const r of requests.filter(r=>r.type==='İzin'&&r.start<=end&&r.end>=month+'-01')){const p=this.policyFor(employeeId,r.leaveType),days=r.leaveUnit==='hours'?r.days:leaveDays(r.start<month+'-01'?month+'-01':r.start,r.end>end?end:r.end,{weekdays:r.policyWeekdays||p.weekdays,holidays:this.state.settings.holidays,calendarDays:r.policyCalendarDays??p.calendarDays});if(r.paidLeave??r.leaveType!=='Ücretsiz İzin')paidLeave+=days;else unpaidLeave+=days;}return{paidLeave,unpaidLeave,overtime:requests.filter(r=>r.type==='Fazla Mesai'&&r.start.startsWith(month)).reduce((sum,r)=>sum+r.hours,0)};}
 visaDocument(id){const r=this.state.requests.find(r=>r.id===id);if(!r||r.type!=='Vize Belgesi'||r.status!=='approved'||!this.allowedEmployee(r.employeeId))throw Error('Onaylı vize belgesine erişim yok.');const e=this.employee(r.employeeId);return ['DEMO ÇALIŞMA BELGESİ — Resmî belge değildir',this.state.settings.company,'Muhatap: '+r.destination,'Çalışan: '+e.name,'Unvan: '+e.title,'İşe başlama: '+e.start,'Düzenleme tarihi: '+this.state.today,'Bu belge kurgusal demo verisinden üretilmiştir. Gerçek kullanım için yetkili imza ve kurum doğrulaması gerekir.'].join('\n');}
 configureReviewers(id,assignments){
  this.admin();return this.transaction('Performans değerlendiricileri atandı',()=>{
   const a=this.state.assessments.find(a=>a.id===id);
   if(!a||a.status==='completed'||a.scores?.length||a.reviews?.length)throw Error('Puanlama başlayan değerlendirme değiştirilemez.');
   if(!Array.isArray(assignments)||assignments.length!==a.participants.length)throw Error('Her katılımcı için değerlendirici seçin.');
   const seen=new Set();for(const row of assignments){if(!a.participants.includes(row.employeeId)||seen.has(row.employeeId)||!Array.isArray(row.reviewers)||!row.reviewers.length||new Set(row.reviewers).size!==row.reviewers.length)throw Error('Değerlendirici ataması geçersiz.');seen.add(row.employeeId);for(const id of row.reviewers)if(this.employee(id).status!=='active')throw Error('Değerlendirici aktif olmalıdır.');}
   a.reviewerAssignments=clone(assignments);a.reviews=[];
  });
 }
 submitReview(id,employeeId,{answers,goal,note=''}){
  return this.transaction('Soru bazlı değerlendirme gönderildi',()=>{
   const a=this.state.assessments.find(a=>a.id===id),assigned=a?.reviewerAssignments?.find(r=>r.employeeId===employeeId);
   if(!a||a.status!=='published'||this.state.today<a.start||this.state.today>a.end||!assigned?.reviewers.includes(this.actor))throw Error('Bu değerlendirmeye atanmamışsınız veya dönem açık değil.');
   if(a.reviews?.some(r=>r.employeeId===employeeId&&r.reviewerId===this.actor))throw Error('Bu değerlendirme daha önce gönderildi.');
   if(!Array.isArray(answers)||answers.length!==a.questions.length||answers.some(v=>v===''||v==null||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100))throw Error('Her soruyu 0–100 aralığında puanlayın.');
   if(goal===''||goal==null||!Number.isFinite(Number(goal))||Number(goal)<0||Number(goal)>100)throw Error('Hedef puanı 0–100 olmalıdır.');
   if(typeof note!=='string'||note.length>10000)throw Error('Geri bildirim geçersiz.');
   a.reviews??=[];a.reviews.push({employeeId,reviewerId:this.actor,answers:answers.map(Number),goal:Number(goal),note,at:this.now()});
   const reviews=a.reviews.filter(r=>r.employeeId===employeeId);
   if(reviews.length===assigned.reviewers.length){const competency=round(reviews.reduce((sum,r)=>sum+r.answers.reduce((a,b)=>a+b,0)/r.answers.length,0)/reviews.length),goal=round(reviews.reduce((sum,r)=>sum+r.goal,0)/reviews.length),total=round((competency*a.competencyWeight+goal*(100-a.competencyWeight))/100);a.scores??=[];a.scores.push({employeeId,competency,goal,total,note:`${reviews.length} değerlendiricinin tamamı gönderdi.`,reviewCount:reviews.length});}
  });
 }
 scoreAssessment(id,...args){if(this.state.assessments.find(a=>a.id===id)?.reviewerAssignments?.length)throw Error('Bu süreçte soru bazlı değerlendirmeler kullanılmalıdır.');return super.scoreAssessment(id,...args);}
 configureCompensationApproval(id,approvers){this.admin();return this.transaction('Ücret onay sırası tanımlandı',()=>{const c=this.state.compensations.find(c=>c.id===id);if(!c||c.status==='completed'||c.proposals?.length)throw Error('Teklif başlamadan onay sırasını tanımlayın.');if(!Array.isArray(approvers)||!approvers.length||approvers.length>5||new Set(approvers).size!==approvers.length)throw Error('1–5 farklı onaylayıcı seçin.');for(const id of approvers)if(this.employee(id).status!=='active')throw Error('Onaylayıcı aktif olmalıdır.');c.approvalChain=[...approvers];});}
 allowedRoute(route,id){if(route==='compensation'&&this.role==='manager')return true;return super.allowedRoute(route,id);}
 compensationProposal(id,employeeId,amount){
  const c=this.state.compensations.find(c=>c.id===id);if(!c?.approvalChain?.length)return super.compensationProposal(id,employeeId,amount);
  if(!this.canManage(employeeId)||employeeId===this.actor)throw Error('Kendiniz için veya yetki dışı teklif oluşturamazsınız.');
  return this.transaction('Sıralı ücret teklifi oluşturuldu',()=>{const e=this.employee(employeeId),proposed=Number(amount);
   if(c.status==='completed'||!c.participants.includes(employeeId)||!Number.isFinite(proposed)||proposed<=0||e.salary<=0)throw Error('Ücret teklifi geçersiz.');
   const chain=c.approvalChain.filter(id=>id!==employeeId&&id!==this.actor);if(!chain.length)throw Error('Teklif sahibi ve çalışan dışında onaylayıcı gerekir.');chain.forEach(id=>{if(this.employee(id).status!=='active')throw Error('Onaylayıcı pasif.');});
   if((c.proposals||[]).filter(p=>p.employeeId!==employeeId).reduce((s,p)=>s+p.proposed,proposed)>c.budget)throw Error('Süreç bütçesi aşıldı.');
   const old=c.proposals?.find(p=>p.employeeId===employeeId);if(old?.status==='approved'||old?.approvals?.length)throw Error('Onay başlayan teklif değiştirilemez.');
   const proposal={employeeId,previous:e.salary,proposed,change:round((proposed/e.salary-1)*100),status:'pending',proposerId:this.actor,approvers:chain,approvals:[]};c.proposals??=[];if(old)Object.assign(old,proposal);else c.proposals.push(proposal);
  });
 }
 approveCompensation(id,employeeId){const c=this.state.compensations.find(c=>c.id===id),p=c?.proposals?.find(p=>p.employeeId===employeeId);if(!p?.approvers)return super.approveCompensation(id,employeeId);return this.transaction('Ücret onay adımı tamamlandı',()=>{if(this.role==='employee'||c.status==='completed'||p.status!=='pending'||p.approvers[p.approvals.length]!==this.actor)throw Error('Ücret onayı bu kullanıcıda değil.');p.approvals.push({actor:this.actor,at:this.now()});if(p.approvals.length===p.approvers.length)p.status='approved';});}
 ensureArchivable(id){if(this.state.compensations.some(c=>c.status!=='completed'&&(c.proposals||[]).some(p=>p.status==='pending'&&p.approvers?.slice(p.approvals?.length||0).includes(id))))throw Error('Bekleyen ücret onaylayıcısı pasife alınamaz.');if(this.state.assessments.some(a=>a.status!=='completed'&&(a.reviewerAssignments||[]).some(r=>r.reviewers.includes(id)&&!a.reviews?.some(v=>v.employeeId===r.employeeId&&v.reviewerId===id))))throw Error('Bekleyen performans değerlendiricisi pasife alınamaz.');return super.ensureArchivable(id);}
 saveRecord(collection,input,id){const copy=clone(input);delete copy.reviewerAssignments;delete copy.reviews;delete copy.approvalChain;const a=this.state.assessments.find(a=>a.id===id);if(collection==='assessments'&&a?.reviewerAssignments?.length&&['type','competencyWeight','questions','participants'].some(k=>copy[k]!==undefined&&JSON.stringify(copy[k])!==JSON.stringify(a[k])))throw Error('Değerlendirici atanan süreç yapısı değiştirilemez.');return super.saveRecord(collection,copy,id);}
 removeRecord(collection,id){if(collection==='assessments'&&this.state.assessments.find(a=>a.id===id)?.reviews?.length)throw Error('Yanıt içeren değerlendirme silinemez.');if(collection==='documents'&&this.state.requests.some(r=>r.receiptId===id))throw Error('Harcama belgesi bağlantısı korunur.');return super.removeRecord(collection,id);}
 restore(data){new HrStore(data);return super.restore(data);}
}
