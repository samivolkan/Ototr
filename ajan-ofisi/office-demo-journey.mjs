import {createDemo,reportProgress} from './branch-operations-model.mjs';
export const journeyStages=['Sekreterya','Ustalar','Rapor kontrolü','Rapor baskısı','Sunum','Teslim edildi'];
export function createJourney(){
 const car=createDemo()[0];car.plate='16 DEMO 260';car.id='office-journey';
 car.reportItems.forEach(i=>i.done=false);
 car.tasks.forEach(t=>{t.status='queued';t.waitReason='Önceki aşama bekleniyor';t.activeMs=0;t.waitingMs=0;delete t.activeSince;delete t.waitingSince;delete t.currentItemId;});
 const names={intake:'Araç kabul bilgisi',mechanical:'Motor ve mekanik kontrolü',body:'Kaporta ölçümü'};
 car.tasks.forEach(t=>t.items?.forEach((item,i)=>item.label=`${names[t.station]} ${i+1}`));
 const state={car,stage:0,ticks:0,history:['Demo başvuru alındı → İlayda / Sekreterya'],done:false};activate(state,['intake']);return state;
}
function activate(s,stations){for(const t of s.car.tasks){if(stations.includes(t.station)){t.status='active';t.waitReason='';t.currentItemId=t.items?.find(i=>!i.done)?.id;}else if(t.status==='active'){t.status='completed';delete t.currentItemId;}}}
function complete(t,count){for(const item of t.items.filter(i=>!i.done).slice(0,count))item.done=true;t.activeMs+=3000;t.currentItemId=t.items.find(i=>!i.done)?.id;if(!t.currentItemId)t.status='completed';}
export function tickJourney(s){
 if(s.done)return s;s.ticks++;
 const tasks=s.car.tasks,at=id=>tasks.find(t=>t.station===id);
 if(s.stage===0){complete(at('intake'),4);if(at('intake').status==='completed'){s.stage=1;s.ticks=0;activate(s,['mechanical','body']);s.history.push('İlayda → Gürkan ve Vedat: araç testlere devredildi');}}
 else if(s.stage===1){complete(at('mechanical'),4);complete(at('body'),4);if(at('mechanical').status==='completed'&&at('body').status==='completed'){s.stage=2;s.ticks=0;s.history.push('Ustalar → Operasyon ajanı: zorunlu rapor kontrolleri');}}
 else if(s.stage===2){s.car.reportItems.filter(i=>!i.done).slice(0,16).forEach(i=>i.done=true);if(reportProgress(s.car).pct===100){s.stage=3;s.ticks=0;s.car.gates.print='Demo baskı kontrolü uygun';s.history.push('Rapor %100 → örnek baskı kontrolü uygun');}}
 else if(s.stage===3){s.stage=4;s.ticks=0;s.car.gates.print='Örnek baskı teyidi var';activate(s,['presentation']);s.history.push('Rapor basıldı (demo) → İlayda: sunum başladı');}
 else if(s.stage===4){at('presentation').activeMs+=3000;if(s.ticks>=3){at('presentation').status='completed';s.stage=5;s.done=true;s.car.gates.delivery='Örnek teslim teyidi var';s.history.push('İlayda → müşteri: sunum ve teslim tamamlandı (demo)');}}
 return s;
}
