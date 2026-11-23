// Progressive disclosure only: preserve sources, controls, and permission boundaries.
function group(nodes,title,after){
 const valid=nodes.filter(Boolean);if(!valid.length)return;
 const details=document.createElement('details');details.className='friendly-extra';
 const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
 after.after(details);valid.forEach(n=>details.append(n));return details;
}
if(document.querySelector('#scene')){
 document.body.classList.add('friendly-office');
 const office=document.querySelector('.office'),sidebar=document.querySelector('.sidebar');
 const teamDetails=group([sidebar],'Ekip ve kaynak incelemeleri',office);
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-team]');if(!button)return;
  if(button.dataset.team==='FIN'){
   const task=document.querySelector('.friendly-work[data-details$=":FIN-04"]');
   if(task){event.preventDefault();event.stopImmediatePropagation();task.open=true;task.scrollIntoView({block:'center',behavior:'smooth'});return;}
  }
  if(!['FRA','REV','SEO'].includes(button.dataset.team)){teamDetails.open=true;setTimeout(()=>teamDetails.scrollIntoView({block:'start',behavior:'smooth'}),0);}
 },true);
 const quick=document.createElement('nav');quick.className='friendly-shortcuts';quick.setAttribute('aria-label','Ofis kısayolları');
 quick.innerHTML='<div><strong>Ajan Ofisi</strong><p>Ekibini ve senden beklenenleri tek yerden takip et.</p></div><div class="office-entry-actions"><a href="operations-center.html">Operasyon kontrolü →</a><a href="#web-demo-tasks">Aday ve kararları gör ↓</a></div>';
 office.prepend(quick);
 const pilot=document.createElement('aside');pilot.className='inspection-pilot';pilot.innerHTML='<div><small>YENİ GÖREV PLANI · ÇALIŞTIRILMADI</small><strong>Ekspertiz Süreç Takip Ajanı</strong><p>İş emri → Usta girişi → Sorgu → Rapor → Sunum ve teslim → Memnuniyet</p></div><a href="inspection-coordinator.html">Görev planını incele →</a>';quick.after(pilot);
 const top=document.querySelector('.topbar');
 const extra=[...top.querySelectorAll('a')].filter(a=>/candidate-demo|management.html|delivery.html/.test(a.getAttribute('href')||''));
 if(extra.length){const d=document.createElement('details');d.className='friendly-menu';d.innerHTML='<summary>Diğer ekranlar</summary><div></div>';extra.forEach(a=>d.querySelector('div').append(a));top.append(d);}
 document.querySelector('.office-bottom').hidden=true;
}else if(document.querySelector('#franchiseWorkbench')){
 document.body.classList.add('friendly-franchise');
 const host=document.querySelector('#web-demo-tasks'),workbench=document.querySelector('#franchiseWorkbench');
 const main=document.querySelector('main');
 const stats=[...main.children].filter(n=>n!==host&&n!==workbench&&n.tagName!=='FOOTER'&&!n.classList.contains('intro'));
 group(stats,'Gerçek süreçler ve Finans kayıtları',host);
 group([workbench],'Süreç rehberi ve uzman görevleri',main.querySelector('.friendly-extra'));
 const intro=main.querySelector('.intro');intro.querySelector('h1').textContent='Franchise takibi';
 intro.querySelector('p:not(.eyebrow)').textContent='Adayın durumu, ekibin işleri ve senden beklenen kararlar.';
}
