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

function showFinanceLogin(status, auth, message) {
  const form = document.createElement('form');
  form.innerHTML = '<label>E-posta <input name="email" type="email" autocomplete="username" required></label> ' +
    '<label>Şifre <input name="password" type="password" autocomplete="current-password" required></label> ' +
    '<button class="btn primary" type="submit">Finansa giriş yap</button> <output aria-live="polite"></output>';
  form.querySelector('output').textContent = message;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button');
    const result = form.querySelector('output');
    submit.disabled = true;
    try {
      const data = new FormData(form);
      const {error} = await auth.signInWithPassword({
        email: String(data.get('email')).trim(),
        password: String(data.get('password'))
      });
      if (error) throw error;
      form.reset();
      location.reload();
    } catch {
      result.textContent = 'Finans oturumu açılamadı. Giriş bilgilerinizi kontrol edin.';
      submit.disabled = false;
    }
  });
  status.replaceChildren(form);
}
async function connectErpSession() {
  if (window.OTOTR_FINANCE_AUTH) return;
  const button = document.querySelector('[data-finance-connect]');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  button.before(status);

  try {
    const hosted = location.hostname === 'samivolkan.github.io';
    const auth = hosted ? (await import('../../saha-satis/assets/feedbackLoader-puddZXLE.js')).r.auth : null;
    const session = auth ? (await auth.getSession()).data.session : erpSession();
    const expiry = Number(session?.expires_at) || 0;
    const expiresAt = expiry < 1e12 ? expiry * 1000 : expiry;
    if (!session?.access_token || (expiresAt && expiresAt <= Date.now())) {
      if (auth) {
        showFinanceLogin(status, auth, 'Yetkili ERP hesabınızla giriş yapın.');
        return;
      }
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
      if (auth) showFinanceLogin(status, auth, 'Bu ERP kullanıcısına finans şubesi tanımlanmamış.');
      else status.textContent = 'Bu ERP kullanıcısına finans şubesi tanımlanmamış.';
      return;
    }

    const scopeKey = row => [row.legal_entity_id, row.dealer_account_id, row.branch_id].join('/');
    const saved = sessionStorage.getItem(selectionKey);
    const selected = rows.find(row => scopeKey(row) === saved) || rows[0];
    window.OTOTR_SUPABASE_CONFIG = {url: url.origin, publishableKey};
    window.OTOTR_FINANCE_AUTH = {getAccessToken: async () => auth ? (await auth.getSession()).data.session?.access_token ?? null : erpSession()?.access_token ?? null};
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
    if (auth) {
      const exit = document.createElement('button');
      exit.type = 'button';
      exit.className = 'btn';
      exit.textContent = 'Finans oturumunu kapat';
      exit.addEventListener('click', async () => {
        exit.disabled = true;
        const {error} = await auth.signOut({scope: 'local'});
        if (error) {
          exit.disabled = false;
          return;
        }
        sessionStorage.removeItem(selectionKey);
        location.reload();
      });
      label.after(exit);
    }
    window.OTOTRFinance?.refreshContext();
  } catch {
    status.textContent = 'Yetkili finans şubeleri alınamadı. ERP oturumunu kontrol edin.';
  }
}

void connectErpSession();
