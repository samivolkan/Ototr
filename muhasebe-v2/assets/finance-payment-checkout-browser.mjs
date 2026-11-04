const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createFinancePaymentCheckoutBrowserClient({
  endpoint = '/api/finance/card-checkout',
  fetchImpl = globalThis.fetch,
  returnUrlFactory = () => `${globalThis.location.origin}${globalThis.location.pathname}#finance`,
} = {}) {
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//') || typeof fetchImpl !== 'function') {
    throw new Error('checkout browser client configuration is invalid');
  }
  return Object.freeze({
    async createCheckout(externalInvoiceId) {
      if (!UUID.test(externalInvoiceId || '')) throw new Error('Geçerli GM fatura kimliği zorunludur.');
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ externalInvoiceId: externalInvoiceId.toLowerCase(), returnUrl: returnUrlFactory() }),
      });
      const payload = (response.headers.get('content-type') || '').includes('application/json')
        ? await response.json().catch(() => null) : null;
      const data = payload?.data;
      if (response.status !== 200 || !UUID.test(data?.checkoutSessionId || '')
        || !['CREATED', 'REPLAY'].includes(data?.outcome) || typeof data?.redirectUrl !== 'string') {
        throw new Error(payload?.error?.message || 'Kredi kartı ödeme sayfası başlatılamadı.');
      }
      let redirect;
      try { redirect = new URL(data.redirectUrl); } catch { throw new Error('Ödeme kuruluşu yönlendirmesi geçersiz.'); }
      if (redirect.protocol !== 'https:' || redirect.username || redirect.password) throw new Error('Güvensiz ödeme yönlendirmesi reddedildi.');
      return Object.freeze({ ...data, redirectUrl: redirect.href });
    },
  });
}

export function bindFinancePaymentCheckoutForm({ form, state, submit, client, navigate = url => globalThis.location.assign(url) } = {}) {
  if (!form || !state || !submit || !client || typeof client.createCheckout !== 'function' || typeof navigate !== 'function') {
    throw new Error('checkout form ports are required');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const externalInvoiceId = form.elements.namedItem('externalInvoiceId')?.value?.trim();
    submit.disabled = true;
    state.textContent = 'Fatura kapsamı ve açık tutar sunucuda doğrulanıyor…';
    try {
      const checkout = await client.createCheckout(externalInvoiceId);
      form.dataset.outcome = checkout.outcome;
      state.textContent = `Güvenli ödeme sayfasına yönlendiriliyorsunuz · ${checkout.amount} ${checkout.currencyCode}`;
      navigate(checkout.redirectUrl);
    } catch (error) {
      form.dataset.outcome = 'ERROR';
      state.textContent = error?.message || 'Kredi kartı ödeme sayfası başlatılamadı.';
      submit.disabled = false;
    }
  });
}

const form = globalThis.document?.querySelector?.('[data-finance-card-checkout]');
if (form) bindFinancePaymentCheckoutForm({
  form,
  state: form.querySelector('[data-finance-card-checkout-state]'),
  submit: form.querySelector('[data-finance-card-checkout-submit]'),
  client: createFinancePaymentCheckoutBrowserClient(),
});
