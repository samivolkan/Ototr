(function mountGmFranchiseNavigation() {
  'use strict';

  const marker = 'data-gm-franchise-link';
  const moduleUrl = new URL('gm-franchise/', document.baseURI).href;

  function mount() {
    const nav = document.getElementById('nav');
    if (!nav || nav.querySelector(`[${marker}]`)) return;

    const heading = document.createElement('div');
    heading.className = 'nav-title';
    heading.textContent = 'GM Franchise Sistemi';
    heading.setAttribute('data-gm-franchise-heading', '');

    const node = document.createElement('div');
    node.className = 'nav-node';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(marker, '');
    button.setAttribute('aria-label', 'GM Franchise Yönetim Merkezi pilotunu aç');
    button.innerHTML = '<i data-lucide="handshake" aria-hidden="true"></i><span>Franchise Yönetim Merkezi</span>';
    button.addEventListener('click', () => window.location.assign(moduleUrl));
    node.appendChild(button);

    nav.append(heading, node);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function start() {
    mount();
    const nav = document.getElementById('nav');
    if (!nav) return;
    const observer = new MutationObserver(mount);
    observer.observe(nav, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  window.addEventListener('load', mount, { once: true });
})();
