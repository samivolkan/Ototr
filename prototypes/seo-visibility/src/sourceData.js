import {parseCSV} from './intake.js';
const num=x=>{const n=Number(String(x).replace('%',''));if(!Number.isFinite(n)||n<0)throw Error('Geçersiz rapor sayısı');return n};
export function gscCSV(text){return parseCSV(text).slice(1).map(([name,clicks,impressions,ctr,position])=>({name,clicks:num(clicks),impressions:num(impressions),ctr:num(ctr),position:num(position)}))}
export function gaCSV(text){return parseCSV(text.split(/\r?\n/).filter(l=>!l.startsWith('#')).join('\n')).slice(1).map(r=>({name:r[0],sessions:num(r[1]),engagedSessions:num(r[2]),engagementRate:num(r[3])*100,eventCount:num(r[6]),keyEvents:num(r[7])}))}
export function gscTotal(rows){const clicks=rows.reduce((a,r)=>a+r.clicks,0),impressions=rows.reduce((a,r)=>a+r.impressions,0);return {clicks,impressions,ctr:impressions?100*clicks/impressions:0,position:impressions?rows.reduce((a,r)=>a+r.position*r.impressions,0)/impressions:0}}
