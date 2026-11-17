(function () {
 'use strict';
 function mount() {
  const nav=document.getElementById('nav');
  if(!nav||nav.querySelector('[data-ik-ototr-link]'))return;
  const node=document.createElement('div');node.className='nav-node';
  const button=document.createElement('button');button.type='button';button.dataset.ikOtotrLink='';
  button.textContent='İK OTOTR · Merkez ve Bayiler';
  node.append(button);
  const hr=nav.querySelector('[data-nav-route="hr"]')?.closest('.nav-node');
  if(hr)hr.after(node);else nav.append(node);
 }
 // The ERP can rebuild navigation markup. Delegate so a cloned button still works.
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-ik-ototr-link]');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign(new URL('ik-ototr/',document.baseURI).href);
 },true);
 function start(){mount();const nav=document.getElementById('nav');if(nav)new MutationObserver(mount).observe(nav,{childList:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
