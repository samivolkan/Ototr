(function () {
  'use strict';
  function install() {
    if (typeof GoogleScreenshotDashboard !== 'function' || typeof googleReputationState === 'undefined') return setTimeout(install,120);
    googleReputationState.demoMode=true;
    googleDashboardState.branchId='all';
    // Every Google review subroute uses the supplied DeepSeek document.
    window.GoogleScreenshotDashboard=function () {
      return '<iframe class="google-management-frame" src="google-review-management.html?embedded=1&v=20261116-19" title="OTOTR Google Yorum Yönetim Sistemi" loading="eager" referrerpolicy="same-origin"></iframe>';
    };
    const originalRefresh=window.refreshGoogleReputationPage;
    window.refreshGoogleReputationPage=function (...args) {
      const frame=document.querySelector('.google-management-frame');
      if(frame){frame.contentWindow?.postMessage({type:'ototr-google-refresh'},location.origin);return;}
      return originalRefresh.apply(this,args);
    };
    window.OTOTRGoogleReputation.render=window.refreshGoogleReputationPage;
    setTimeout(()=>window.refreshGoogleReputationPage(),60);
  }
  install();
})();
