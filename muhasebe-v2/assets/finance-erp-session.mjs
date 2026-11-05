const sessionKey = 'ototr-dealer-supabase-session-v1';
const configKey = 'ototr-dealer-supabase-config-v1';
const selectionKey = 'ototr-finance-selected-scope-v1';

function storedJson(key) {
  return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
}

function erpSession() {
  if (location.hostname === 'samivolkan.github.io') {
    const native = storedJson('sb-bsjkohwbtrfwrqcyhsfz-auth-token');
    return native?.currentSession || native?.session || native;
  }
  return storedJson(sessionKey);
}

async function connectErpSession() {
  if (window.OTOTR_FINANCE_AUTH) return;
  const button = document.querySelector('[data-finance-connect]');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  button.before(status);

  try {
    const session = erpSession();
    const expiry = Number(session?.expires_at) || 0;
    const expiresAt = expiry < 1e12 ? expiry * 1000 : expiry;
    if (!session?.access_token || (expiresAt && expiresAt <= Date.now())) {
      const loginLink = document.createElement('a');
      loginLink.href = '../index.html?financeReturn=1#dealer';
      loginLink.textContent = 'ERP girişini aç';
      status.append('Muhasebe V2 için ERP oturumu gerekli. ', loginLink);
      return;
    }

    const configured = window.OTOTR_SUPABASE_CONFIG || storedJson(configKey) || {};
    const url = new URL(configured.url || 'https://bsjkohwbtrfwrqcyhsfz.supabase.co');
    if (url.origin !== 'https://bsjkohwbtrfwrqcyhsfz.supabase.co') {
      throw new Error('Invalid finance endpoint');
    }
    const publishableKey = configured.publishableKey || configured.key || 'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
    const response = await fetch(new URL('/rest/v1/rpc/list_session_branch_scopes', url), {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Profile': 'finance_api',
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!response.ok) throw new Error('Finance scope discovery failed');
    const rows = await response.json();
    if (!rows.length) {
      status.textContent = 'Bu ERP kullanıcısına finans şubesi tanımlanmamış.';
      return;
    }

    const scopeKey = row => [row.legal_entity_id, row.dealer_account_id, row.branch_id].join('/');
    const saved = sessionStorage.getItem(selectionKey);
    const selected = rows.find(row => scopeKey(row) === saved) || rows[0];
    window.OTOTR_SUPABASE_CONFIG = {url: url.origin, publishableKey};
    window.OTOTR_FINANCE_AUTH = {getAccessToken: () => erpSession()?.access_token ?? null};
    window.OTOTR_FINANCE_CONTEXT = {
      legalEntityId: selected.legal_entity_id,
      dealerAccountId: selected.dealer_account_id,
      branchId: selected.branch_id
    };

    const label = document.createElement('label');
    label.textContent = 'Finans şubesi ';
    const select = document.createElement('select');
    for (const row of rows) select.add(new Option(row.branch_code, scopeKey(row)));
    select.value = scopeKey(selected);
    select.addEventListener('change', () => {
      sessionStorage.setItem(selectionKey, select.value);
      location.reload();
    });
    label.append(select);
    status.replaceWith(label);
    window.OTOTRFinance?.refreshContext();
  } catch {
    status.textContent = 'Yetkili finans şubeleri alınamadı. ERP oturumunu kontrol edin.';
  }
}

void connectErpSession();
