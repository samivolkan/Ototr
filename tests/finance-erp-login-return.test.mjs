import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const handlerStart = html.lastIndexOf("document.addEventListener('submit'", html.indexOf("const form=e.target.closest('[data-dealer-live-login-form]')"));
const handlerEnd = html.indexOf('function academyChartsPanel()', handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);

async function submit(search, loginFails = false) {
  const events = [];
  let handler;
  vm.runInNewContext(html.slice(handlerStart, handlerEnd), {
    document: {addEventListener(_, callback) { handler = callback; }},
    FormData: class { entries() { return [['email', 'demo'], ['password', 'fixture']]; } },
    URL, URLSearchParams,
    location: {
      search,
      href: 'https://erp.example.test/Ototr/index.html' + search + '#dealer',
      replace(url) { events.push(String(url)); }
    },
    async dealerSupabaseSignIn() { events.push('sign-in'); if (loginFails) throw Error('login rejected'); },
    async dealerSyncSupabaseWorkOrders() { events.push('sync'); },
    dealerScrubSensitiveUrlParams() {},
    isDealerStandaloneRoute() { return false; },
    renderAll() {},
    route(value) { events.push(value); },
    toast() {},
    saveDealerSupabaseSyncState() {}
  });
  await handler({
    target: {closest(selector) { return selector === '[data-dealer-live-login-form]' ? {} : null; }},
    preventDefault() {},
    stopImmediatePropagation() {}
  });
  return events;
}

test('finance entry returns to the same ERP after successful sign-in', async () => {
  assert.deepEqual(await submit('?financeReturn=1&returnTo=https://other.example'), [
    'sign-in', 'https://erp.example.test/Ototr/muhasebe-v2/'
  ]);
});

test('failed sign-in stays in the ERP and ordinary login still syncs work orders', async () => {
  assert.deepEqual(await submit('?financeReturn=1', true), ['sign-in', 'dealer']);
  assert.deepEqual(await submit(''), ['sign-in', 'sync', 'dealer']);
});
