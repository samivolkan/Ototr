import {initialRecords,transition,UNITS,COURSES,CHECKLISTS,validDate} from './business-model.mjs';
const KEY='ototr.ik-ototr.business.demo.v1';
export class BusinessClient{
 constructor({store,sync}){Object.assign(this,{store,sync,records:[],sensitive:[],pending:false});}
 get capabilities(){return this.sync?.capabilities||{health:true,discipline:true,identity:true};}
 async saveSensitive(unit,v){if(this.pending)throw Error('Önceki işlem tamamlanıyor.');if(!this.canWrite(unit)||!this.capabilities[v.category]||!['health','discipline'].includes(v.category)||!v.note?.trim()||v.note.length>2000)throw Error('Yetki veya kayıt bilgisi geçersiz.');this.pending=true;try{if(this.sync){const{error}=await this.sync.client.rpc('ik_ototr_sensitive_save',{target:unit,employee:v.employeeId,category:v.category,note:v.note}).abortSignal(AbortSignal.timeout(15000)).retry(false);if(error)throw Error(error.message);}else{this.sensitive.push({id:crypto.randomUUID(),unit,employee_id:v.employeeId,category:v.category,note:v.note,revision:1});localStorage.setItem(KEY+'.restricted',JSON.stringify(this.sensitive));}await this.load();}finally{this.pending=false;}}
 get headquarters(){return !this.sync||this.sync.access.some(a=>a.unit==='Genel Merkez'&&a.can_write);}
 get actor(){return this.sync?.actor||'offline-headquarters';}
 get today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 canWrite(unit){return !this.sync||!!this.sync.access.find(a=>a.unit===unit)?.can_write;}
 selected(){const unit=this.store.scope;if(!unit)throw Error('Önce üst menüden işlem yapılacak birimi seçin.');if(!this.canWrite(unit))throw Error('Bu hesap yalnızca görüntüleyebilir.');return unit;}
 list(kind){const scope=this.store.scope;return this.records.filter(r=>r.kind===kind&&(!scope||kind==='organization'||r.unit===scope||r.to_unit===scope));}
 context(){return{actor:this.actor,headquarters:this.headquarters,writeUnits:this.sync?this.sync.access.filter(a=>a.can_write).map(a=>a.unit):UNITS,today:this.today,employees:this.store.state.employees,assets:this.store.state.assets,requests:this.store.state.requests,hrApprover:this.store.state.settings.hrApprover,records:this.records};}
 async load(){if(this.sync){const {data,error}=await this.sync.client.from('ik_ototr_business').select('*').order('updated_at').abortSignal(AbortSignal.timeout(15000)).retry(false);if(error)throw Error(error.message);this.records=data;const restricted=await this.sync.client.from('ik_ototr_sensitive').select('*').order('updated_at').abortSignal(AbortSignal.timeout(15000)).retry(false);if(restricted.error)throw Error(restricted.error.message);this.sensitive=restricted.data;}else{try{this.sensitive=JSON.parse(localStorage.getItem(KEY+'.restricted')||'[]');}catch{this.sensitive=[];}try{this.records=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}this.records||=initialRecords(this.store.state.employees,this.today);}return this;}
 async refresh(apply=true){if(this.pending||!apply)return false;const before=JSON.stringify([...this.records,...this.sensitive].map(r=>[r.id,r.revision]));await this.load();return before!==JSON.stringify([...this.records,...this.sensitive].map(r=>[r.id,r.revision]));}
 async act(record,operation,input={}){
  if(this.pending)throw Error('Önceki işlem tamamlanıyor.');this.pending=true;
  try{
   let row;
   if(this.sync){const{data,error}=await this.sync.client.rpc('ik_ototr_business_action',{record_id:record?.id||null,expected:record?.revision||null,operation,input}).abortSignal(AbortSignal.timeout(15000)).retry(false);if(error)throw Error(error.message);row=data;}
   else if(operation==='create'){
    const {kind,unit,employeeId,toUnit}=input,p=structuredClone(input.payload),e=this.store.state.employees.find(e=>e.id===employeeId&&e.branch===unit&&e.status==='active');
    if(!this.canWrite(unit))throw Error('Yetkiniz yok.');if(['assignment','enrollment','lifecycle','inspection'].includes(kind)&&!e)throw Error('Aktif çalışan seçin.');
    let state='draft';
    if(kind==='position'){p.capacity=Number(p.capacity);if(!Number.isInteger(p.capacity)||p.capacity<1||!p.title?.trim()||this.records.some(r=>r.kind===kind&&r.unit===unit&&r.payload.title===p.title))throw Error('Pozisyon/kadro geçersiz veya zaten var.');state='active';}
    if(kind==='assignment'){validDate(p.start);validDate(p.end);if(!UNITS.includes(toUnit)||toUnit===unit||p.end<p.start||Date.parse(p.end)-Date.parse(p.start)>90*86400000||!['Motor','Kaporta','İSG'].includes(p.skill)||p.start<this.today||!p.reason?.trim())throw Error('Görevlendirme bilgileri geçersiz.');if(this.records.some(r=>r.kind===kind&&r.employee_id===employeeId&&!['completed','rejected'].includes(r.state)&&r.payload.start<=p.end&&r.payload.end>=p.start))throw Error('Çakışan görevlendirme var.');Object.assign(p,{employeeName:e.name,title:e.title});state='requested';}
    if(kind==='enrollment'){const course=COURSES.find(c=>c.id===p.course);if(!course)throw Error('Eğitim bulunamadı.');if(this.records.some(r=>r.kind===kind&&r.employee_id===employeeId&&r.payload.course===p.course&&(r.state!=='passed'||r.payload.validUntil>=this.today)))throw Error('Eğitim veya geçerli sertifika zaten var.');Object.assign(p,{skill:course.skill,lessons:[],attempts:0});state='enrolled';}
    if(kind==='lifecycle'){if(this.records.some(r=>r.kind===kind&&r.employee_id===employeeId&&r.payload.type===p.type&&r.state!=='completed'))throw Error('Çalışanın açık süreci var.');validDate(p.date);if(!CHECKLISTS[p.type]||!p.reason?.trim())throw Error('Süreç bilgisi eksik.');p.checks=CHECKLISTS[p.type].map(()=>false);}
    if(kind==='calibration'){validDate(p.validUntil);if(!p.reference||p.validUntil<this.today)throw Error('Kalibrasyon geçersiz.');state='active';}
    if(kind==='inspection')p.employeeName=e.name;
    if(kind==='integration'){if(!['staffing_plan.created','payroll.inputs.prepared'].includes(p.event)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.period||''))throw Error('Olay veya dönem geçersiz.');if(this.records.some(r=>r.kind===kind&&r.unit===unit&&r.payload.event===p.event&&r.payload.period===p.period))throw Error('Bu dönem olayı zaten var.');Object.assign(p,{mode:'synthetic-demo',contractVersion:1,source:'ik-ototr',unitKey:['hq','nilufer','gebze','inegol'][UNITS.indexOf(unit)],destination:p.event==='staffing_plan.created'?'franchise-demo-inbox':'finance-demo-inbox',attempts:0,employeeCount:this.store.state.employees.filter(e=>e.branch===unit).length});if(p.event==='staffing_plan.created')p.positions=this.records.filter(r=>r.kind==='position'&&r.unit===unit).map(r=>structuredClone(r.payload));else p.inputs=this.store.state.paymentAdjustments.filter(v=>v.month===p.period&&this.store.state.employees.some(e=>e.id===v.employeeId&&e.branch===unit)).map(v=>({employeeRef:v.employeeId,type:v.type,amount:v.amount}));}
    row={id:crypto.randomUUID(),kind,unit,employee_id:employeeId||null,to_unit:toUnit||null,payload:p,state,revision:1,created_by:this.actor};
   }else row=transition(record,operation,input,this.context());
   const i=this.records.findIndex(r=>r.id===row.id);if(i<0)this.records.push(row);else this.records[i]=row;
   if(!this.sync){if(row.kind==='lifecycle'&&row.state==='completed'&&row.payload.type==='offboarding')this.store.transaction('Demo ayrılış tamamlandı',()=>Object.assign(this.store.employee(row.employee_id),{status:'inactive',end:row.payload.date,exitReason:row.payload.reason}));localStorage.setItem(KEY,JSON.stringify(this.records));}
   if(this.sync&&row.kind==='lifecycle'&&row.state==='completed')await this.sync.refresh();
   return row;
  }finally{this.pending=false;}
 }
}
