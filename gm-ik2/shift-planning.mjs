import {DAY,iso,shiftMinutes} from './model.mjs?v=20261117-visual-2';
export const limitFields=[['daily','Günlük saat',24],['weekly','Haftalık saat',168],['monthly','Aylık saat',744],['days','Haftalık gün',7],['consecutive','Ardışık gün',31]];
export function shiftLimits(settings,part=false){return {...(part?{daily:4,weekly:32,monthly:140,days:4,consecutive:4}:{daily:settings.maxDailyHours,weekly:settings.maxWeeklyHours,monthly:204,days:6,consecutive:6}),...settings.shiftLimits?.[part?'part':'full'],...(!part?{daily:settings.maxDailyHours,weekly:settings.maxWeeklyHours}:{})};}
export function validateShiftLimits(value){for(const group of ['full','part'])for(const [key,label,max] of limitFields){const v=value?.[group]?.[key];if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>max||(['days','consecutive'].includes(key)&&!Number.isInteger(v)))throw Error(label+' limiti geçersiz.');}return value;}
export function checkShiftLimits(state,input){
 const e=state.employees.find(e=>e.id===input.employeeId);if(!e)throw Error('Çalışan bulunamadı.');
 const limits=shiftLimits(state.settings,e.workType==='Yarı zamanlı'),minutes=shiftMinutes(input.start,input.end,input.breakMinutes||0);
 const at=Date.parse(input.date),monday=at-((new Date(at).getUTCDay()+6)%7)*DAY;
 const rows=state.shifts.filter(s=>s.employeeId===e.id),week=rows.filter(s=>Date.parse(s.date)>=monday&&Date.parse(s.date)<monday+7*DAY);
 if(minutes>limits.daily*60)throw Error('Çalışma şekline ait günlük saat limiti aşıldı.');
 if(week.reduce((n,s)=>n+s.minutes,minutes)>limits.weekly*60)throw Error('Çalışma şekline ait haftalık saat limiti aşıldı.');
 if(rows.filter(s=>s.date.slice(0,7)===input.date.slice(0,7)).reduce((n,s)=>n+s.minutes,minutes)>limits.monthly*60)throw Error('Aylık saat limiti aşıldı.');
 if(new Set([...week.map(s=>s.date),input.date]).size>limits.days)throw Error('Haftalık çalışma günü limiti aşıldı.');
 const days=new Set([...rows.map(s=>s.date),input.date]);let count=1;
 for(const direction of [-1,1])for(let d=at+direction*DAY;days.has(iso(d));d+=direction*DAY)count++;
 if(count>limits.consecutive)throw Error('Ardışık çalışma günü limiti aşıldı.');
}
