import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../muhasebe-v2/erp-nav.js', import.meta.url), 'utf8');
const root = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Muhasebe V2 menu mounts after ERP navigation is created asynchronously', () => {
  let nav = null;
  let observerCallback = null;
  let observedOptions = null;

  const createElement = tagName => ({
    tagName,
    dataset: {},
    children: [],
    append(child) { this.children.push(child); },
    addEventListener(name, callback) { this.listeners ??= {}; this.listeners[name] = callback; }
  });

  const context = {
    URL,
    document: {
      baseURI: 'https://samivolkan.github.io/Ototr/index.html',
      documentElement: {},
      getElementById: id => id === 'nav' ? nav : null,
      createElement
    },
    window: {location: {assign() {}}, lucide: {createIcons() {}}},
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe(_target, options) { observedOptions = options; }
    }
  };

  vm.runInNewContext(source, context);
  assert.equal(observedOptions?.childList, true);
  assert.equal(observedOptions?.subtree, true);

  nav = createElement('nav');
  nav.querySelector = selector => selector === '[data-accounting-v2]'
    ? nav.children.find(item => Object.hasOwn(item.dataset, 'accountingV2')) || null
    : null;
  observerCallback();
  observerCallback();

  assert.equal(nav.children.length, 1, 'menu item must be mounted exactly once');
  const button = nav.children[0].children[0];
  assert.equal(button.type, 'button');
  assert.match(button.innerHTML, /Muhasebe V2/);
});

test('ERP entry point cache-busts the current finance navigation asset', () => {
  assert.match(root, /muhasebe-v2\/erp-nav\.js\?v=2/);
});
