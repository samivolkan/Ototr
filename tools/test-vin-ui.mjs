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
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#page-dealer.active");
await page.locator('#page-dealer.active [data-dealer-tab="is-emirleri"]').first().click();
await page.waitForSelector("#page-dealer.active #dealerWorkOrderForm.dealer-wo-form");
await page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-fast-open").waitFor();
assert.equal(await page.locator("#page-dealer.active .dealer-top-branch").locator("text=Aktif iş emri").count(), 0, "Ust bantta aktif is emri bilgisi yer kaplamamali");
await page.locator("#page-dealer.active .dealer-erp-brand-text", { hasText: "Aktif Şube" }).waitFor();
await page.locator("#page-dealer.active .dealer-top-branch [data-dealer-gate-nav]").waitFor();
await page.locator('#page-dealer.active .dealer-top-mode-switch [data-dealer-wo-mode="fast"].active').waitFor();
await page.locator('#page-dealer.active .dealer-top-mode-switch [data-dealer-wo-mode="full"]').click();
await page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-full-open").waitFor();
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="customer"]').fill("ELIF YAMAN");
await page.locator('#page-dealer.active .dealer-top-mode-switch [data-dealer-wo-mode="fast"]').click();
await page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-fast-open").waitFor();
await page.locator('#page-dealer.active .dealer-top-mode-switch [data-dealer-wo-mode="full"]').click();
await page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-full-open").waitFor();
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm [name="customer"]').inputValue(), "ELIF YAMAN", "Tam/Hizli mod gecisinde girilen bilgiler korunmali");
await page.locator('#page-dealer.active .dealer-top-mode-switch [data-dealer-wo-mode="fast"]').click();
await page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-fast-open").waitFor();
await page.locator("#page-dealer.active .dealer-top-branch", { hasText: "3 Günlük Takvim" }).waitFor();
await page.locator("#page-dealer.active .dealer-top-branch", { hasText: "Basım Kuyruğu" }).waitFor();

const form = page.locator("#page-dealer.active #dealerWorkOrderForm.dealer-wo-form");
await form.locator('[name="vin"]').fill(" wau-zzz8k-9aa123456 ");
assert.equal(await form.locator('[name="vin"]').inputValue(), "WAUZZZ8K9AA123456", "VIN alani buyuk harf, temiz ve 17 karakter ile sinirli olmali");
assert.equal(await page.locator("[data-dealer-vin-popup]").count(), 0, "Sasi decoder popup'i gosterilmemeli");
assert.equal(await page.locator("[data-dealer-vin-assist]").count(), 0, "Sasi kontrol karti gosterilmemeli");

await form.locator('[name="vin"]').fill(" jt-db4m-ee-30j123456 ");
const vinBeforeSubmit = await form.locator('[name="vin"]').inputValue();
assert.equal(vinBeforeSubmit, "JTDB4MEE30J123456", "VIN yazarken input 17 haneli normalize formatta kalmali");
await form.locator('[name="vehicleMake"]').fill("Toyota");
await form.locator('[name="vehicleModel"]').fill("Corolla");
await form.locator('[name="year"]').fill("2021");

await form.locator('[name="plate"]').fill("34 VIN 123");
await form.locator('[data-dealer-package-choice="Full Ekspertiz"]').click();
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
    id: wo.id,
    vin: wo.vin,
    vinNormalized: wo.vinNormalized,
    vinDecodeStatus: wo.vinDecodeStatus,
    vinManualReviewRequired: wo.vinManualReviewRequired,
    vinConfidenceScore: wo.vinConfidenceScore,
    tab: JSON.parse(localStorage.getItem("ototr-dealer-portal-ui-v1") || "{}").tab
  };
});
assert.equal(created.vinNormalized, "JTDB4MEE30J123456", "Kayitta normalize VIN saklanmali");
assert.equal(created.vinDecodeStatus, "DISABLED", "Sasi decoder kayit akisinda devre disi olmali");
assert.equal(created.vinManualReviewRequired, false, "Sasi kontrolu manuel inceleme uretmemeli");
assert.equal(created.tab, "aktif-is-emirleri", "Is emri olusunca aktif is emirleri sekmesine gecmeli");
await page.evaluate(id => {
  const data = JSON.parse(localStorage.getItem("ototr-dealer-live-workorders-v1"));
  const wo = data.workOrders.find(row => row.id === id);
  Object.assign(wo, {
    customer: "Alıcı bilgisi bekliyor",
    phone: "",
    taxNo: "",
    seller: "Satıcı bilgisi bekliyor",
    sellerPhone: "",
    sellerTaxNo: "",
    engineNo: "",
    vehicleVariant: "",
    fuel: "",
    transmission: "",
    payment: "Bekliyor",
    paymentMethod: "",
    consent: "Bekliyor",
    paidAmount: ""
  });
  localStorage.setItem("ototr-dealer-live-workorders-v1", JSON.stringify(data));
}, created.id);
const activeWorkOrdersSection = page.locator('#page-dealer.active section.dealer-form-section', { hasText: "Aktif İş Emirleri" }).first();
assert.equal(await activeWorkOrdersSection.locator('[data-dealer-tab="is-emirleri"]').count(), 0, "Aktif is emirleri kartinda ikinci yeni is emri butonu olmamali");
await page.waitForSelector(`#page-dealer.active [data-dealer-update-wo="${created.id}"]`);

await page.locator(`#page-dealer.active [data-dealer-select-wo="${created.id}"]`).first().click();
await page.waitForFunction(() => document.querySelector("#dealerWorkOrderForm fieldset")?.disabled === true);
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm [name="plate"]').inputValue(), "34 VIN 123", "Ac aksiyonu is emri ekranina gitmeli");
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm fieldset').evaluate(el => el.disabled), true, "Ac aksiyonu formu kilitli getirmeli");
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm [name="packageName"]').inputValue(), "Full Ekspertiz", "Kilitli acilista paket korunmali");
await page.locator('#page-dealer.active [data-dealer-package-choice="Mini Ekspertiz"]').click();
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm [name="packageName"]').inputValue(), "Full Ekspertiz", "Kilitli goruntulemede paket karti degismemeli");
assert.equal(await page.locator('#page-dealer.active [data-dealer-package-choice="Full Ekspertiz"].selected').count(), 1, "Kilitli goruntulemede secili paket ayni kalmali");
await page.locator('#page-dealer.active .dealer-top-branch [data-dealer-gate-nav]').waitFor();
assert.equal(await page.locator('#page-dealer.active .dealer-top-branch [data-dealer-gate-nav]').evaluate(btn => !btn.disabled && btn.textContent.includes("Düzenle")), true, "Ac aksiyonu kilitli goruntulemede eksik uyarisi gostermemeli");

await page.evaluate(() => {
  saveDealerPortalState({ tab: "aktif-is-emirleri", editingWorkOrderId: "", viewingWorkOrderId: "" });
  renderDealerPageOnly();
});
await page.waitForSelector(`#page-dealer.active [data-dealer-update-wo="${created.id}"]`);
await page.locator(`#page-dealer.active [data-dealer-update-wo="${created.id}"]`).first().click();
await page.waitForFunction(() => document.querySelector("#dealerWorkOrderForm fieldset")?.disabled === false);
await page.waitForFunction(() => document.querySelector('#dealerWorkOrderForm [name="engineNo"]')?.closest('.dealer-wo-field')?.classList.contains('is-invalid'));
assert.equal(await page.locator('#page-dealer.active [data-dealer-gate-nav]').evaluate(btn => btn.disabled && btn.textContent.includes("Eksikler")), true, "Tam is emrinde eksik alanlar tamamlanmadan kaydet pasif olmali");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="customer"]').fill("ELIF YAMAN");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="phone"]').fill("05332104724");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="taxNo"]').fill("12345678901");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="seller"]').fill("DENIZ YILMAZ");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="sellerPhone"]').fill("05332104725");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="sellerTaxNo"]').fill("10987654321");
await page.locator('#page-dealer.active #dealerWorkOrderForm [name="engineNo"]').fill("M264920123456");
await page.evaluate(() => {
  const form = document.getElementById("dealerWorkOrderForm");
  const variant = dealerVehicleVariantsFor(form.elements.vehicleMake.value, form.elements.vehicleModel.value)[0] || "Baz Paket";
  Object.entries({
    vehicleVariant: variant,
    fuel: "Benzin",
    transmission: "Otomatik",
    payment: "Tahsil edildi",
    paymentMethod: "POS / Kredi Kartı",
    consent: "İmzalandı"
  }).forEach(([name, value]) => {
    if(form.elements[name]) form.elements[name].value = value;
  });
  if(form.elements.paidAmount){
    form.elements.paidAmount.value = "₺7.500";
    form.elements.paidAmount.dataset.autoPaid = "0";
  }
  form.querySelectorAll("[data-dealer-choice-group]").forEach(group => {
    const input = group.querySelector("input[type='hidden']");
    if(!input) return;
    group.querySelectorAll("[data-dealer-choice]").forEach(btn => btn.classList.toggle("active", btn.dataset.choiceValue === input.value));
  });
  dealerValidateSmartWorkOrderForm(form);
  dealerScheduleWorkOrderGateSync(form);
});
await page.locator('#page-dealer.active [data-dealer-gate-nav]', { hasText: "Değişiklikleri Kaydet" }).waitFor();
await page.locator('#page-dealer.active [data-dealer-gate-nav]', { hasText: "Değişiklikleri Kaydet" }).dispatchEvent("click");
await page.locator('[data-dealer-save-notice]', { hasText: "Güncellendi" }).waitFor();
await page.locator('#page-dealer.active [data-dealer-gate-nav].saved', { hasText: "Güncellendi" }).waitFor();
assert.equal(await page.locator('#page-dealer.active #dealerWorkOrderForm fieldset').evaluate(el => el.disabled), true, "Kaydet sonrasi form kilitli goruntulemeye donmeli");

await browser.close();
assert.deepEqual(errors, [], "Sayfa runtime hatasi uretmemeli");
console.log("VIN UI tests passed");
