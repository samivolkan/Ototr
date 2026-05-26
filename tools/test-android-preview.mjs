import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "ototr-android-preview.html");
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
if(!executablePath) throw new Error("Chrome veya Edge bulunamadi.");

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1360, height: 920 } });
const errors = [];
page.on("pageerror", err => errors.push(err.message));

await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "load" });
await page.waitForSelector("#screen");
assert.equal(await page.title(), "OTOTR Android Usta MVP");
assert.equal(await page.locator("text=İş Emri Açılışı").count(), 0, "Mobil preview sekreterya is emri acma dili kullanmamali");

await page.locator('[data-screen="intake"]').first().click();
await page.locator("#screen-title", { hasText: "Usta İşe Başlama" }).waitFor();
assert.equal(await page.locator("text=İş Emrini Aç").count(), 0, "Usta ekraninda is emrini ac ifadesi olmamali");

await page.locator('[data-screen="matrix"]').first().click();
await page.locator("#screen-title", { hasText: "Kapsam Matrisi" }).waitFor();
await page.locator("text=Paket → Görev → Usta").waitFor();
await page.locator("text=Rapor Alan Eşleşmesi").waitFor();
await page.locator("text=Fotoğraf / Kanıt Kuralları").waitFor();

await page.locator('[data-screen="intake"]').first().click();
await page.locator("#screen-title", { hasText: "Usta İşe Başlama" }).waitFor();
await page.locator('[data-intake-photo="chassisPhoto"]').click();
await page.locator('[data-intake-photo="platePhoto"]').click();
await page.locator("[data-intake-km]").fill("128000abc");
assert.equal(await page.locator("[data-intake-km]").inputValue(), "128000", "KM sadece rakam olmali");
await page.locator('[data-intake-photo="kmPhoto"]').click();
await page.locator("[data-open-technical]").click();
await page.locator("#screen-title", { hasText: "Görevlerim" }).waitFor();
await page.locator(".task-card", { hasText: "Kaporta / Boya 0-58" }).first().waitFor();

await page.locator('[data-task-open="kaporta"]').click();
await page.locator("#screen-title", { hasText: "Kontrol Formu" }).waitFor();
await page.locator('[data-screen="evidence"]').first().click();
const kaportaEvidenceCount = await page.locator('[data-evidence^="kaporta|"]').count();
for(let index = 0; index < kaportaEvidenceCount; index += 1){
  await page.locator('[data-evidence^="kaporta|"]').nth(index).click();
}
await page.locator('[data-screen="form"]').first().click();
await page.locator('[data-submit-task="kaporta"]').click();
await page.locator("text=Başlık tamamlandı.").waitFor();

await browser.close();
assert.deepEqual(errors, [], "Android preview runtime hatasi uretmemeli");
console.log("Android preview tests passed");
