(() => {
  'use strict';
  const destination = new URL('ajan-ofisi/', document.baseURI);
  function mount() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    let item = nav.querySelector('[data-agent-office]');
    if (!item) {
      item = document.createElement('div');
      item.className = 'nav-node';
      item.dataset.agentOffice = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Ajan Ofisi — salt-okunur geliştirme merkezi');
      button.innerHTML = '<i data-lucide="building-2" aria-hidden="true"></i><span>Ajan Ofisi</span>';
      button.addEventListener('click', () => window.location.assign(destination.href));
      item.append(button);
      nav.prepend(item);
      window.lucide?.createIcons?.();
    } else if (nav.firstElementChild !== item) {
      nav.prepend(item);
    }
  }
  mount();
  new MutationObserver(mount).observe(document.documentElement, {childList: true, subtree: true});
})();
