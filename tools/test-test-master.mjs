import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const master = JSON.parse(fs.readFileSync("data/ototr_test_master_final_v1.json", "utf8"));
const indexHtml = fs.readFileSync("index.html", "utf8");
const seedScript = fs.readFileSync("data/ototr_test_master_final_v1.js", "utf8");
const adminScript = fs.readFileSync("src/test-master-admin.js", "utf8");

assert.equal(master.schemaVersion, "1.0.0");
assert.equal(master.masterVersion, "2026.08.24-FINAL-1");
assert.equal(master.sections.length, 15);
assert.equal(master.stats.categories, 87);
assert.equal(master.stats.treeItems, 405);
assert.equal(master.stats.mainRows, 359);
assert.equal(master.stats.countedControls, 250);
assert.equal(master.stats.evidenceDefinitions, 23);
assert.equal(master.stats.finalDecisionRules, 23);

const items = master.sections.flatMap(section => section.categories.flatMap(category => category.items));
assert.equal(items.length, master.stats.treeItems);
assert.equal(new Set(items.map(item => item.code)).size, items.length, "Alt madde kodları tekil olmalı");
assert.equal(items.filter(item => item.active && item.rowType === "CONTROL" && item.countInTotal).length, 250);
assert.equal(items.filter(item => item.countInTotal && item.rowType !== "CONTROL").length, 0);
assert.equal(items.filter(item => item.active && /yanal kayma \/ hizalama test değeri|FSL-05/i.test(`${item.code} ${item.label}`)).length, 0);

const storage = new Map();
const window = {};
const context = {
  window,
  console,
  structuredClone,
  Blob,
  URL,
  Date,
  Math,
  JSON,
  String,
  Number,
  Array,
  Set,
  Map,
  Object,
  RegExp,
  Error,
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  },
  navigator: {},
  document: {},
  confirm: () => true,
  setTimeout,
  clearTimeout,
};

vm.createContext(context);
vm.runInContext(seedScript, context, { filename: "ototr_test_master_final_v1.js" });
assert.equal(
  JSON.stringify(context.window.OTOTR_TEST_MASTER_SEED),
  JSON.stringify(master),
  "Tarayıcı seed'i ile dışa aktarılabilir JSON aynı olmalı",
);
vm.runInContext(adminScript, context, { filename: "test-master-admin.js" });

const page = context.window.TestMasterAdminPage();
const issues = context.window.OTOTRTestMasterAdmin.validate();
const exported = context.window.OTOTRTestMasterAdmin.exportJson();

assert.ok(page.includes("Ekspertiz Test Masterı"));
assert.ok(page.includes('data-tm-action="add-section"'));
assert.ok(page.includes('data-tm-action="add-category"'));
assert.ok(page.includes('data-tm-action="add-item"'));
assert.ok(page.includes('data-tm-action="export"'));
assert.ok(page.includes('data-tm-action="import"'));
assert.ok(page.includes('draggable="true"'));
assert.ok(page.includes('data-tm-filter="allSections"'));
assert.equal(issues.filter(issue => issue.tone === "error").length, 0);
assert.equal(exported.stats.countedControls, 250);

assert.ok(indexHtml.includes('data/ototr_test_master_final_v1.js'));
assert.ok(indexHtml.includes('src/test-master-admin.js'));
assert.ok(indexHtml.includes('src/test-master-admin.css'));
assert.ok(indexHtml.includes("['test-master','Ekspertiz Test Masterı','list-tree']"));
assert.ok(indexHtml.includes("pageShell('test-master', TestMasterAdminPage())"));
assert.ok(indexHtml.includes("bindTestMasterAdmin"));

console.log(JSON.stringify({
  status: "ok",
  sections: master.stats.sections,
  categories: master.stats.categories,
  treeItems: master.stats.treeItems,
  countedControls: master.stats.countedControls,
  validationErrors: 0,
}, null, 2));
