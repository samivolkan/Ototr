(()=>{
  const root=document.getElementById('app');
  if(!root)return;
  const showFailure=()=>{
    if(root.dataset.bootReady==='true')return;
    root.innerHTML=`
      <div class="empty-state error-state">
        <span class="empty-icon" aria-hidden="true">!</span>
        <h2>Oturum kontrolü tamamlanamadı</h2>
        <p class="muted">Bağlantınızı kontrol edip tekrar deneyin. Sorun devam ederse tarayıcı önbelleğini yenileyin.</p>
        <button id="bootRetry" class="btn primary" type="button">Tekrar dene</button>
      </div>`;
    root.querySelector('#bootRetry')?.addEventListener('click',()=>location.reload());
  };
  const timer=setTimeout(showFailure,15000);
  window.addEventListener('ototr-task-v2-ready',()=>{
    root.dataset.bootReady='true';
    clearTimeout(timer);
  },{once:true});
  window.addEventListener('error',event=>{
    if(root.dataset.bootReady!=='true'&&event?.filename)showFailure();
  });
})();
