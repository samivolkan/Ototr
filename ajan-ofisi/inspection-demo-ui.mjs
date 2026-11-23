import{newInspectionDemo,applyInspectionDemo,inspectDemo,inspectionScenario}from'./inspection-demo-model.mjs';
let state=newInspectionDemo();const root=document.querySelector('#inspection-demo');
function render(){const view=inspectDemo(state),step=inspectionScenario[state.events.length];
 root.querySelector('[data-stage]').textContent=view.stage;
 root.querySelector('[data-owner]').textContent=view.owner;
 root.querySelector('[data-next]').textContent=view.next;
 root.querySelector('[data-progress]').textContent=`${state.events.length} / ${inspectionScenario.length} demo adımı`;
 root.querySelector('[data-query]').textContent=({waiting:'Bekliyor',failed:'Hata · temiz kayıt değildir',success:'Demo sonuç kanıtı alındı'})[state.queries.vehicle];
 const button=root.querySelector('[data-advance]');button.disabled=!step;button.textContent=step?.label||'Demo tamamlandı';
 const list=root.querySelector('ol');list.replaceChildren(...state.events.map(e=>{const li=document.createElement('li');li.textContent=`${e.actor} · ${e.label} · ${e.evidence}`;return li;}));
}
root.querySelector('[data-advance]').addEventListener('click',()=>{const step=inspectionScenario[state.events.length];if(!step)return;
 state=applyInspectionDemo(state,{...step,id:`demo-event-${state.events.length+1}`,caseId:state.id,branch:state.branch,mode:'demo',expectedRevision:state.revision,at:new Date().toISOString(),evidence:`fixture:${state.events.length+1}`});render();});
root.querySelector('[data-reset]').addEventListener('click',()=>{state=newInspectionDemo();render();});render();
