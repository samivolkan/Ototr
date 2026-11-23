const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=document.createElement('div');host.id='ototr-profile-actions';host.innerHTML=`<button id="ototr-notifications-toggle" aria-label="Bildirimler" aria-expanded="false" aria-controls="ototr-notifications-panel">Bildirimler <span id="ototr-notification-count" hidden>0</span></button><button id="ototr-profile-toggle" aria-haspopup="menu" aria-expanded="false" aria-controls="ototr-profile-menu">Profil ▾</button><div id="ototr-profile-menu" role="menu" aria-label="Profil menüsü" hidden></div><section id="ototr-notifications-panel" aria-label="Bildirimler" hidden><div class="on-head"><b>Bildirimler</b><button id="ototr-notification-refresh">Yenile</button></div><p class="on-note">Son 50 bildirim · yeni yorum, yayımlanan yanıt ve hedef geçişleri</p><div id="ototr-notification-list" aria-live="polite">Bağlantı kontrol ediliyor.</div><a class="on-open" href="ajan-ofisi/review-team.html">Yorum Ekibini aç →</a></section>`;document.body.append(host);
const style=document.createElement('style');style.textContent=`#ototr-profile-actions{position:fixed;top:10px;right:16px;z-index:10000;display:flex;gap:5px;padding:5px;border:1px solid #dfe3e8;border-radius:11px;background:#fff;box-shadow:0 4px 18px #0f172a14;font:600 12px system-ui;color:#25352d}#ototr-profile-actions button{font:inherit;cursor:pointer;border:0;border-radius:7px;background:#f4f6f2;color:inherit;padding:9px 12px}#ototr-profile-actions button:hover{background:#e8eee3}#ototr-profile-actions button:focus-visible{outline:2px solid #517c61;outline-offset:2px}#ototr-profile-actions [hidden]{display:none!important}#ototr-profile-menu{position:absolute;right:0;top:calc(100% + 7px);min-width:170px;padding:6px;border:1px solid #dfe3e8;border-radius:10px;background:#fff;box-shadow:0 8px 30px #18241f22}#ototr-profile-menu #ototr-account-exit{position:static!important;display:block;width:100%;min-height:38px!important;border:0!important;text-align:left;color:#ad2727!important}#ototr-notification-count{background:#ba302d;color:white;border-radius:20px;padding:2px 5px;font-size:10px}#ototr-notifications-panel{position:absolute;right:0;top:calc(100% + 7px);width:min(370px,calc(100vw - 24px));border:1px solid #dce4d8;border-radius:12px;background:white;box-shadow:0 8px 32px #18241f22;overflow:hidden}.on-head{display:flex;justify-content:space-between;align-items:center;padding:13px 15px}.on-note{font-size:10px;line-height:1.6;color:#788773;margin:0;padding:0 15px 12px}#ototr-notification-list{max-height:60vh;overflow:auto;font-weight:400;padding:0 12px;font-size:12px}.on-item:focus-visible{outline:2px solid #517c61;outline-offset:-2px}.on-item:hover{background:#eef4e9}.on-status{display:block;font-size:10px;margin-top:8px;color:#517c61}.on-item{cursor:pointer;border-top:1px solid #e5eadd;padding:12px 3px;line-height:1.6}.on-item.unread{background:#f2f6ed}.on-item b{font-size:12px}.on-item p{font-size:11px;margin:6px 0}.on-item small{font-size:10px;color:#77866e}.on-item button{display:block;font-size:10px!important;margin-top:7px}.on-empty{padding:16px 4px;line-height:1.7}.on-open{display:block;padding:13px 15px;border-top:1px solid #e2e7db;font-size:12px;color:#35523e;text-decoration:none}@media(max-width:640px){#ototr-profile-actions{top:8px;right:8px;font-size:11px}#ototr-profile-actions button{padding:9px}}`;document.head.append(style);
const q=s=>host.querySelector(s),profile=q('#ototr-profile-toggle'),menu=q('#ototr-profile-menu'),bell=q('#ototr-notifications-toggle'),panel=q('#ototr-notifications-panel');
function close(){menu.hidden=true;panel.hidden=true;profile.setAttribute('aria-expanded','false');bell.setAttribute('aria-expanded','false');}
function moveExit(){const exit=document.getElementById('ototr-account-exit');if(exit&&exit.parentElement!==menu){exit.textContent='Çıkış';exit.setAttribute('role','menuitem');menu.append(exit);}}
moveExit();new MutationObserver(moveExit).observe(document.body,{childList:true,subtree:true});
profile.onclick=()=>{const open=menu.hidden;close();menu.hidden=!open;profile.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('button')?.focus();};
bell.onclick=()=>{const open=panel.hidden;close();panel.hidden=!open;bell.setAttribute('aria-expanded',String(open));if(open)refresh();};
profile.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();profile.click();}};
document.addEventListener('click',e=>{if(!host.contains(e.target))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!menu.hidden||!panel.hidden)){const target=menu.hidden?bell:profile;close();target.focus();}});
let busy=false,items=[];
async function api(action,extra={}){const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu bekleniyor.');const r=await fetch('https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Bildirim bağlantısı doğrulanamadı.');return d;}
function render(){const unread=items.filter(x=>!x.read_at).length;q('#ototr-notification-count').textContent=String(unread);q('#ototr-notification-count').hidden=!unread;bell.setAttribute('aria-label',unread?`Bildirimler · son 50 kayıtta ${unread} okunmamış`:'Bildirimler');q('#ototr-notification-list').innerHTML=items.length?items.map(n=>`<article class="on-item ${n.read_at?'':'unread'}" role="button" tabindex="0" data-open="${esc(n.id)}" aria-label="${esc(n.title)} · ilgili ekranı aç"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${new Date(n.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</small><span class="on-status">${n.read_at?'Okundu':'Okunmadı'} · Aç →</span></article>`).join(''):'<p class="on-empty">Yeni bildirim yok. İlk kontrol geçmiş kayıtlar için bildirim oluşturmaz.</p>';}
async function refresh(){if(busy||document.hidden)return;busy=true;q('#ototr-notification-refresh').disabled=true;try{items=(await api('office_notifications')).items;render();}catch(e){q('#ototr-notification-count').hidden=true;q('#ototr-notification-list').innerHTML='<p class="on-empty">'+esc(e.message)+'</p>';}finally{busy=false;q('#ototr-notification-refresh').disabled=false;}}
q('#ototr-notification-refresh').onclick=refresh;
const destinationKey='ototr.notification.destination';
q('#ototr-notification-list').onclick=async e=>{
 const card=e.target.closest('[data-open]');if(!card||card.getAttribute('aria-busy')==='true')return;
 const row=items.find(n=>n.id===card.dataset.open);if(!row)return;
 card.setAttribute('aria-busy','true');
 try{
  if(window.OTOTRReviewBridge?.isEditing?.())throw Error('Önce açık yorum taslağını kaydedin.');
  if(!row.read_at)await api('office_notification_read',{id:row.id});
  row.read_at=row.read_at||new Date().toISOString();render();
  if(window.OTOTRReviewAlternative?.openNotification){await window.OTOTRReviewAlternative.openNotification(row);close();}
  else{
   sessionStorage.setItem(destinationKey,JSON.stringify({item:row,expires:Date.now()+60000}));
   const target=new URL('index.html',location.href);target.hash='google-reviews';
   window.location.assign(target.href);
  }
 }catch(error){card.removeAttribute('aria-busy');const status=document.createElement('p');status.setAttribute('role','alert');status.textContent=error.message||'Bildirim açılamadı. Tekrar deneyin.';q('#ototr-notification-list').prepend(status);}
};
q('#ototr-notification-list').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-open]')){e.preventDefault();e.target.click();}};
if(document.querySelector('.topbar')){
 let attempts=0;
 const pending=setInterval(async()=>{
  const raw=sessionStorage.getItem(destinationKey);if(!raw||++attempts>60){clearInterval(pending);return;}
  if(!window.OTOTRReviewAlternative?.openNotification||!window.OTOTRReviewLiveViews?.scopedReviews?.().length)return;
  clearInterval(pending);sessionStorage.removeItem(destinationKey);
  try{const value=JSON.parse(raw);if(value.expires>Date.now())await window.OTOTRReviewAlternative.openNotification(value.item);}
  catch(error){window.toast?.(error.message||'Bildirim hedefi açılamadı.','warn');}
 },500);
}
let tries=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++tries>=30){clearInterval(boot);refresh();}},500);setInterval(refresh,60000);

// Reuse the same account menu and inbox inside the standalone/embedded review header.
if(document.querySelector('.topbar')&&document.getElementById('notifBtn')){
 document.querySelector('.topbar').append(host);
 host.classList.add('review-header-actions');
 bell.innerHTML='🔔 <span id="ototr-notification-count" hidden>0</span>';
 document.getElementById('notifBtn').style.display='none';
 const embeddedStyle=document.createElement('style');embeddedStyle.textContent='#ototr-profile-actions.review-header-actions{position:relative;top:auto;right:auto;box-shadow:none;border:0;background:transparent;margin-left:4px;padding:0;flex-shrink:0}#ototr-profile-actions.review-header-actions #ototr-profile-menu{z-index:200}#ototr-notifications-panel{z-index:200}';document.head.append(embeddedStyle);
}
