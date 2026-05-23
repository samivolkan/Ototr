import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const require = createRequire(import.meta.url);
const packageRoots = [
  root,
  ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [])
];
const playwrightPath = require.resolve("playwright", { paths: packageRoots });
const { chromium } = require(playwrightPath);

const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
if(!executablePath) throw new Error("Chrome veya Edge bulunamadi. Headless test icin sistem tarayicisi gerekiyor.");

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", err => errors.push(err.message));

await page.addInitScript(() => {
  localStorage.clear();
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, options) => {
    if(String(url).includes("vpic.nhtsa.dot.gov")){
      if(window.__VIN_DECODER_DOWN) return { ok: false, async json(){ return {}; } };
      return {
        ok: true,
        async json(){
          return {
            Results: [{
              Make: "Toyota",
              Model: "Corolla",
              ModelYear: "2021",
              Manufacturer: "Toyota Motor Corporation",
              VehicleType: "PASSENGER CAR",
              BodyClass: "Sedan",
              PlantCountry: "Japan",
              ErrorCode: "0"
            }]
          };
        }
      };
    }
    if(originalFetch) return originalFetch(url, options);
    throw new Error("fetch unavailable");
  };
});

const url = "file:///" + htmlPath.replace(/\\/g, "/") + "?portal=dealer#dealer";
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#page-dealer.active");
await page.locator('#page-dealer.active [data-dealer-tab="is-emirleri"]').first().click();
await page.waitForSelector("#page-dealer.active #dealerWorkOrderForm.dealer-wo-form");
assert.equal(await page.locator("#page-dealer.active .dealer-top-branch").locator("text=Aktif iş emri").count(), 0, "Ust bantta aktif is emri bilgisi yer kaplamamali");
await page.locator("#page-dealer.active .dealer-erp-brand-text", { hasText: "Aktif Şube" }).waitFor();
await page.locator("#page-dealer.active .dealer-top-branch [data-dealer-gate-nav]").waitFor();
await page.locator("#page-dealer.active .dealer-top-branch", { hasText: "3 Günlük Takvim" }).waitFor();
await page.locator("#page-dealer.active .dealer-top-branch", { hasText: "Basım Kuyruğu" }).waitFor();

const form = page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-form");
await page.evaluate(() => { window.__VIN_DECODER_DOWN = true; });
await form.locator('[name="vin"]').fill(" wau-zzz8k-9aa123456 ");
assert.equal(await form.locator('[name="vin"]').inputValue(), "WAUZZZ8K9AA123456", "VIN alani buyuk harf, temiz ve 17 karakter ile sinirli olmali");
await page.waitForFunction(() => (document.querySelector("[data-dealer-vin-popup]")?.textContent || "").includes("VIN decoder"));
await page.locator("[data-dealer-vin-popup-close]").click();
await page.evaluate(() => { window.__VIN_DECODER_DOWN = false; });

await form.locator('[name="vin"]').fill(" jt-db4m-ee-30j123456 ");
const vinBeforeSubmit = await form.locator('[name="vin"]').inputValue();
assert.equal(vinBeforeSubmit, "JTDB4MEE30J123456", "VIN yazarken input 17 haneli normalize formatta kalmali");
await page.waitForFunction(() => (document.querySelector("[data-dealer-vin-assist]")?.textContent || "").includes("Bulunan"));
assert.equal(await form.locator('[name="vehicleMake"]').inputValue(), "Toyota", "VIN decode make alanini doldurmali");
assert.equal(await form.locator('[name="vehicleModel"]').inputValue(), "Corolla", "VIN decode model alanini doldurmali");
assert.equal(await form.locator('[name="year"]').inputValue(), "2021", "VIN decode yil alanini doldurmali");

await form.locator('[name="vehicleMake"]').fill("Renault");
await form.locator('[name="vehicleModel"]').fill("Clio");
await form.locator('[name="year"]').fill("2020");
await page.evaluate(async () => {
  const formEl = document.getElementById("dealerWorkOrderForm");
  await window.dealerResolveVinStateForForm(formEl, { decode: false, autoFill: false });
});
const mismatchText = await page.locator("[data-dealer-vin-assist]").textContent();
assert.ok(mismatchText.includes("uyuşmuyor"), "VIN-secilen arac uyusmazligi UI uyarisi gostermeli");

await form.locator('[name="plate"]').fill("34 VIN 123");
await form.locator('[name="engineNo"]').fill("M264920123456");
await form.locator('[name="mileage"]').fill("128000");
await page.evaluate(() => window.dealerCreateWorkOrder({ skipNativeValidity: true }));
await page.waitForFunction(() => {
  const raw = localStorage.getItem("ototr-dealer-live-workorders-v1");
  if(!raw) return false;
  const data = JSON.parse(raw);
  return data.workOrders?.[0]?.plate === "34 VIN 123";
});
const created = await page.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("ototr-dealer-live-workorders-v1"));
  const wo = data.workOrders[0];
  return {
    vin: wo.vin,
    vinNormalized: wo.vinNormalized,
    vinDecodeStatus: wo.vinDecodeStatus,
    vinManualReviewRequired: wo.vinManualReviewRequired,
    vinConfidenceScore: wo.vinConfidenceScore,
    tab: JSON.parse(localStorage.getItem("ototr-dealer-portal-ui-v1") || "{}").tab
  };
});
assert.equal(created.vinNormalized, "JTDB4MEE30J123456", "Kayitta normalize VIN saklanmali");
assert.equal(created.vinDecodeStatus, "VIN_DECODED", "Kayitta decode status saklanmali");
assert.equal(created.vinManualReviewRequired, true, "Uyusmazlikta manualReviewRequired true olmali");
assert.equal(created.tab, "aktif-is-emirleri", "Is emri olusunca aktif is emirleri sekmesine gecmeli");

await browser.close();
assert.deepEqual(errors, [], "Sayfa runtime hatasi uretmemeli");
console.log("VIN UI tests passed");
