import{activityCount,activityActive}from './team-activity-model.mjs';
import{createOfficeSalesClient}from './sales-health.mjs';
const records=new Map();
function paint(){for(const team of ['FRA','FIN','REV','SALE']){const on=!document.hidden&&activityActive(records.get(team));document.querySelectorAll(`.room-label[data-team="${team}"],[data-department="${team}"]`).forEach(el=>{el.classList.toggle('team-has-work',on);if(el.classList.contains('room-label')){let marker=el.querySelector('.activity-marker');if(on&&!marker){marker=document.createElement('span');marker.className='activity-marker';marker.textContent='İş var';el.append(marker);}if(!on)marker?.remove();}});}}
function set(team,value){records.set(team,{count:activityCount(team,value),at:Date.now()});paint();}
window.addEventListener('franchise-office-status',e=>{set('FRA',e.detail);set('FIN',e.detail);});
window.addEventListener('review-office-status',e=>set('REV',e.detail));
let busy=false;async function sales(){if(busy||document.hidden)return;busy=true;try{set('SALE',await createOfficeSalesClient({getSession:()=>window.OTOTRGetERPAuthSession?.()}).read());}catch{set('SALE',null);}finally{busy=false;}}
setInterval(paint,5000);setInterval(sales,60000);sales();document.addEventListener('visibilitychange',()=>{paint();if(!document.hidden)sales();});
