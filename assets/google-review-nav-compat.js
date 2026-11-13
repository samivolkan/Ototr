/* Keeps the reputation radar visible in the shared ERP sidebar when the
   production bundle is generated from the minified app-core build. */
(function () {
  'use strict';
  function ensureReputationNav() {
    var nav = document.getElementById('nav');
    if (!nav || nav.querySelector('[data-nav-route="reputation"]')) return;
    var google = nav.querySelector('[data-nav-route="google-reviews"]');
    if (!google) return;
    var node = document.createElement('div');
    node.className = 'nav-node';
    node.innerHTML = '<button data-nav-route="reputation" type="button"><i data-lucide="radar"></i><span>İtibar Radarı</span></button>';
    google.closest('.nav-node')?.after(node);
    node.querySelector('button').addEventListener('click', function () {
      if (typeof window.route === 'function') window.route('reputation');
      else window.location.hash = '#reputation';
    });
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }
  ensureReputationNav();
  new MutationObserver(ensureReputationNav).observe(document.documentElement, { childList: true, subtree: true });
})();
