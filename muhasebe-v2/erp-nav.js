(() => {
  'use strict';

  const moduleUrl = new URL('muhasebe-v2/', document.baseURI);
  const nav = document.getElementById('nav');
  if (!nav) return;

  function mount() {
    if (nav.querySelector('[data-accounting-v2]')) return;

    const item = document.createElement('div');
    item.className = 'nav-node';
    item.dataset.accountingV2 = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = '<i data-lucide="wallet" aria-hidden="true"></i><span>Muhasebe V2</span>';
    button.addEventListener('click', () => window.location.assign(moduleUrl.href));
    item.append(button);

    const finance = nav.querySelector('[data-nav-route="finance"]')?.closest('.nav-node');
    if (finance) finance.after(item);
    else nav.append(item);
    window.lucide?.createIcons?.();
  }

  mount();
  new MutationObserver(mount).observe(nav, {childList: true});
})();
