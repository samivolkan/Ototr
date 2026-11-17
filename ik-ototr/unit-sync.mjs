import {combineUnits} from './unit-data.mjs';
export class UnitSync {
 constructor(api,{status=()=>{},changed=()=>{},blocked=()=>{}}={}){Object.assign(this,{api,status,changed,blocked,rows:[],access:[],unit:'',pending:null,online:false});}
 async load(){
  const [rows,access,capabilities]=await Promise.all([this.api.read(),this.api.access(),this.api.permissions?this.api.permissions():{}]);
  if(!rows.length||!access.length)throw Error('İK OTOTR erişiminiz yok veya kaldırılmış.');
  rows.sort((a,b)=>(a.unit==='Genel Merkez'?-1:b.unit==='Genel Merkez'?1:a.unit.localeCompare(b.unit,'tr')));this.rows=rows;this.access=access;this.capabilities=capabilities;this.online=true;
  if(rows.length===1)this.unit=rows[0].unit;
  if(this.unit&&!rows.some(r=>r.unit===this.unit))this.unit='';
  this.status('Sunucu ile eşitlendi');return this.document();
 }
 document(){const rows=this.unit?this.rows.filter(r=>r.unit===this.unit):this.rows;return rows.length===1?structuredClone(rows[0].document):combineUnits(rows);}
 select(unit){if(this.pending)throw Error('Kayıt tamamlanıyor; lütfen bekleyin.');if(unit&&!this.rows.some(r=>r.unit===unit))throw Error('Birim yetkisi yok.');if(!unit&&this.rows.length===1)unit=this.rows[0].unit;this.unit=unit;return this.document();}
 persist(value){
  if(this.refreshing)throw Error('Güncel sürüm denetleniyor; tekrar kaydedin.');
  if(!this.online)throw Error('Sunucu bağlantısı yok. Yeniden bağlandıktan sonra kaydedin.');
  if(this.pending)throw Error('Önceki kayıt tamamlanıyor; lütfen bekleyin.');
  if(!this.unit)throw Error('Düzenlemek için üstteki menüden bir birim seçin.');
  if(!this.access.find(a=>a.unit===this.unit)?.can_write)throw Error('Bu hesap yalnızca görüntüleyebilir.');
  const row=this.rows.find(r=>r.unit===this.unit),unit=this.unit;this.status('Sunucuya kaydediliyor…');
  const task=this.api.save(unit,row.revision,value).then(revision=>{
   row.document=structuredClone(value);row.revision=revision;this.status('Sunucuya kaydedildi');
  }).catch(error=>{this.online=false;this.changed(this.document());this.status('Kaydedilemedi · '+error.message);throw error;}).finally(()=>{this.pending=null;});
  this.pending=task;task.catch(()=>{});
 }
 async flush(){if(this.pending)await this.pending;}
 async refresh(apply=true){if(this.pending||this.refreshing)return;this.refreshing=true;try{
  const previous=this.rows,oldCaps=JSON.stringify(this.capabilities),old=JSON.stringify(this.rows.map(r=>[r.unit,r.revision]));const data=await this.load();
  if(previous.some(r=>!this.rows.some(n=>n.unit===r.unit)))throw Error('Birim yetkileriniz değişti. Sayfayı yenileyin.');
  if(!apply){if(oldCaps!==JSON.stringify(this.capabilities))throw Error('Alan yetkileriniz değişti. Sayfayı yenileyin.');this.rows=previous;return;}
  if(old!==JSON.stringify(this.rows.map(r=>[r.unit,r.revision]))||oldCaps!==JSON.stringify(this.capabilities))this.changed(data);
 }catch(e){this.online=false;this.status('Eşitleme durdu · '+e.message);this.blocked(e);}finally{this.refreshing=false;}}
}
export async function browserSync(options){
 const {r:client}=await import('../saha-satis/assets/feedbackLoader-puddZXLE.js');
 const {data,error}=await client.auth.getUser();if(error||!data?.user)throw Error('Önce ERP hesabınızla giriş yapın.');
 const check=r=>{if(r.error)throw Error(r.error.message.includes('IK_CONFLICT')?'Kayıt başka cihazda değişti. Güncel sürümü yükleyip tekrar deneyin.':r.error.message);return r.data;};
 const sync=new UnitSync({permissions:async()=>check(await client.rpc('ik_ototr_permissions').abortSignal(AbortSignal.timeout(15000)).retry(false)),read:async()=>check(await client.rpc('ik_ototr_read_units').abortSignal(AbortSignal.timeout(15000)).retry(false)),access:async()=>check(await client.rpc('ik_ototr_access').abortSignal(AbortSignal.timeout(15000)).retry(false)),save:async(target,expected,value)=>check(await client.rpc('ik_ototr_save',{target,expected,value}).abortSignal(AbortSignal.timeout(15000)).retry(false))},options);
 client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id&&session.user.id!==data.user.id){sync.online=false;options.blocked(Error('Oturum değişti. Sayfayı yenileyin.'));}});
 sync.client=client;sync.actor=data.user.id;await sync.load();return sync;
}
