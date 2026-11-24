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
 quick.innerHTML='<div><strong>Bugün ne yapmak istiyorsun?</strong><p>Günlük işlerini aç, kararlarını incele veya ekibin durumunu kontrol et.</p></div>';
 office.prepend(quick);
 const actions=document.createElement('section');actions.className='daily-actions';actions.setAttribute('aria-label','Günlük işler');
 actions.innerHTML=`<a href="../isler/"><small>GÖREVLER</small><strong>İşlerimi takip et →</strong><p>Görev, sorumlu, devir ve teslim durumlarını aç.</p></a><a href="decision-desk.html"><small>KARARLAR</small><strong>Karar masamı aç →</strong><p>Mevcut yetkinle sana bağlı incelemeleri ve kararları gör.</p></a><a href="operations-center.html"><small>SALT OKUNUR</small><strong>Ekibin durumuna bak →</strong><p>Satış, ekspertiz ve görev kaynaklarının güncel özetini kontrol et.</p></a><a href="review-team.html"><small>YORUM EKİBİ</small><strong>Yorumları takip et →</strong><p>Bağlı şubenin yanıt ve inceleme durumlarını aç.</p></a>`;
 quick.after(actions);
 const pending=document.createElement('details');pending.className='friendly-extra readiness-hold';pending.innerHTML='<summary>Hazırlık bekleyen bağlantılar</summary><p>Finans kapsamı, gerçek departman sorumluları ve izin–vardiya bağlantısı hazır olduğunda açılacak. Şimdilik işlem yapman gerekmiyor; mevcut takip ekranlarını kullanabilirsin.</p><a href="management.html">Birim planlarını incele →</a><a href="inspection-coordinator.html">Ekspertiz süreç planı →</a>';
 actions.after(pending);
 const wrapDemo=()=>{const demoHost=document.querySelector('#web-demo-tasks');
 if(demoHost&&!demoHost.closest('.office-demo')){const demo=document.createElement('details');demo.className='friendly-extra office-demo';demo.innerHTML='<summary>Demo: aday sürecini dene</summary><p>Örnek başvuru ve ekip devri. Gerçek müşteri işi veya canlı görev değildir.</p>';demoHost.before(demo);demo.append(demoHost);}return !!demoHost;};
 if(!wrapDemo()){const observer=new MutationObserver(()=>{if(wrapDemo())observer.disconnect();});observer.observe(office,{childList:true});}
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
