(function () {
 'use strict';
 function mount() {
  const nav=document.getElementById('nav');
  if(!nav||nav.querySelector('[data-ik2-link]'))return;
  const node=document.createElement('div');node.className='nav-node';
  const button=document.createElement('button');button.type='button';button.dataset.ik2Link='';
  button.textContent='İK2 · Demo İK Merkezi';
  button.addEventListener('click',()=>location.assign(new URL('gm-ik2/',document.baseURI).href));
  node.append(button);nav.append(node);
 }
 function start(){mount();const nav=document.getElementById('nav');if(nav)new MutationObserver(mount).observe(nav,{childList:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
