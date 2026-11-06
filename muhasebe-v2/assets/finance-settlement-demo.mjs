const staging = 'https://bsjkohwbtrfwrqcyhsfz.supabase.co';
const auth = window.OTOTRDealerFinanceAuth;
const config = auth?.getConfig();
const panel = document.querySelector('[data-finance-settlement-demo]');

if (panel && config?.url === staging && new URLSearchParams(location.search).get('settlementDemo') === '1') {
  const status = panel.querySelector('output');
  const buttons = [...panel.querySelectorAll('button')];
  panel.hidden = false;

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      buttons.forEach(control => { control.disabled = true; });
      status.textContent = 'Demo işlem işleniyor…';
      try {
        const token = await auth.getAccessToken();
        if (!token) throw new Error('ERP oturumu gerekli.');
        const response = await fetch(staging + '/functions/v1/finance-erp-demo', {
          method: 'POST',
          headers: {apikey: config.publishableKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
          body: JSON.stringify({operation: button.value})
        });
        if (!response.ok) throw new Error('Demo işlem tamamlanamadı (HTTP ' + response.status + ').');
        const result = await response.json();
        if (!['CREATED', 'REPLAY'].includes(result.outcome)) throw new Error('İşlem sonucu doğrulanamadı.');
        status.textContent = 'Demo işlem tamamlandı. Güncel bakiye için finans özetini yeniden yükleyin.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        buttons.forEach(control => { control.disabled = false; });
      }
    });
  }
}
