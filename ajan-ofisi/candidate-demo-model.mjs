import {scenes} from './candidate-demo-data.mjs';
export function initialState(){return {index:0,approved:[],revisions:[],resolved:[],finished:false};}
export function canAdvance(s){return !s.finished&&(!scenes[s.index].decision||s.approved.includes(s.index));}
export function transition(s,action){
 const next={...s,approved:[...s.approved],revisions:[...s.revisions],resolved:[...s.resolved]};
 if(action==='reset')return initialState();
 if(action==='back'){next.index=Math.max(0,s.index-1);next.finished=false;return next;}
 if(action==='revise'&&scenes[s.index].decision){next.approved=next.approved.filter(i=>i<s.index);next.resolved=next.resolved.filter(i=>i<s.index);if(!next.revisions.includes(s.index))next.revisions.push(s.index);return next;}
 if(action==='resolve'&&next.revisions.includes(s.index)){if(!next.resolved.includes(s.index))next.resolved.push(s.index);return next;}
 if(action==='approve'&&scenes[s.index].decision){if(next.revisions.includes(s.index)&&!next.resolved.includes(s.index))return next;if(!next.approved.includes(s.index))next.approved.push(s.index);return next;}
 if(action==='next'&&canAdvance(s)){if(s.index===scenes.length-1)next.finished=true;else next.index++;}
 return next;
}
export function demoReport(s){return ['OTOTR · DEMO-FRA-001 · Kurgusal aday simülasyonu','Gerçek kayıt, ödeme, mesaj veya ajan çalışması değildir.',`Gösterim: ${s.finished?'Tamamlandı':'Devam ediyor'} · ${scenes[s.index].title}`,`Verilen demo kararları: ${s.approved.length} / 3`,`Revizyon canlandırmaları: ${s.revisions.length}`,...scenes.slice(0,s.index+1).map((x,i)=>`\n${i+1}. ${x.title} · ${x.day}\n${x.agents.join(', ')}\n${x.output}${x.decision?'\nDemo karar: '+(s.approved.includes(i)?'Onaylandı':'Bekliyor'):''}`)].join('\n');}
