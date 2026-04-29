import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const require = createRequire(import.meta.url);
const packageRoots = [
  root,
  ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
];
const playwrightPath = require.resolve("playwright", { paths: packageRoots });
const { chromium } = require(playwrightPath);

const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome veya Edge bulunamadi. Headless test icin sistem tarayicisi gerekiyor.");
}

const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

const url = "file:///" + htmlPath.replace(/\\/g, "/");
await page.addInitScript(() => localStorage.clear());
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#page-dashboard.active");
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "Acil Durum Merkezi" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "OTOTR Güven Skoru" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "En İyi 10 Şube" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "Satış & Lead Funnel" }).first().waitFor();
await page.waitForFunction(() => document.querySelector('[data-revenue-year="2024"]')?.classList.contains("active"));
await page.waitForFunction(() => document.querySelector('[data-revenue-year="2026"]')?.classList.contains("active"));
await page.locator('#page-dashboard.active [data-revenue-period="quarter"]').click();
await page.waitForFunction(() => document.querySelector('[data-revenue-period="quarter"]')?.classList.contains("active"));
await page.locator('#page-dashboard.active [data-revenue-year="2024"]').click();
await page.locator('#page-dashboard.active [data-revenue-year="2025"]').click();
await page.locator('#page-dashboard.active [data-revenue-period="month"]').click();
await page.waitForFunction(() => !document.querySelector('[data-revenue-year="2024"]')?.classList.contains("active"));
await page.waitForFunction(() => !document.querySelector('[data-revenue-year="2025"]')?.classList.contains("active"));
await page.waitForFunction(() => document.querySelector('[data-revenue-year="2026"]')?.classList.contains("active"));
await page.locator("#revenueAiInsight").getByText("Geçen yıl aynı ay").waitFor();

const title = await page.title();
const navCount = await page.locator("#nav button").count();
const revenueChartReady = await page.locator("#chartRevenue").evaluate((canvas) => canvas.width > 0 && canvas.height > 0);
const navRoutes = await page.$$eval("#nav [data-nav-route]", (buttons) =>
  buttons.map((button) => button.getAttribute("data-nav-route"))
);

for (const route of navRoutes) {
  await page.locator(`#nav [data-nav-route="${route}"]`).click();
  await page.waitForSelector(`#page-${route}.active`);
}

await page.locator('#nav [data-nav-route="franchise"]').click();
await page.waitForSelector("#page-franchise.active");
const leadBefore = await page.locator("#page-franchise.active .deal").count();

await page.locator("#openLead2").click();
await page.waitForSelector("#leadModal.open");
await page.locator('input[name="name"]').fill("Test Franchise Adayi");
await page.locator('input[name="phone"]').fill("05550000000");
await page.locator('input[name="city"]').fill("Bursa");
await page.locator('textarea[name="note"]').fill("Otomatik test kaydi");
await page.locator('button[form="leadForm"]').click();
await page.waitForSelector("#leadModal.open", { state: "hidden", timeout: 5000 });

const leadAfter = await page.locator("#page-franchise.active .deal").count();

await page.locator('#nav [data-nav-route="branches"]').click();
await page.waitForSelector("#page-branches.active");
let drawerTitle = "";
const branchProfileLinks = page.locator("#page-branches.active [data-branch-profile]");
if (await branchProfileLinks.count()) {
  await branchProfileLinks.first().click();
  await page.waitForSelector("#page-branchProfile.active");
  drawerTitle = await page.locator("#page-branchProfile.active h2").first().innerText();
} else {
  await page.locator('#page-branches.active tr[data-detail^="branch:"]').first().click();
  await page.waitForSelector("#drawer.open");
  drawerTitle = await page.locator("#drawerContent .card-title").first().innerText();
  await page.locator("#drawer").click({ position: { x: 12, y: 12 } });
  await page.waitForFunction(() => !document.getElementById("drawer").classList.contains("open"));
}

await page.locator("#globalSearch").fill("Konya");
await page.waitForSelector('#searchResults.open .search-hit[data-search-type="lead"]');
await page.locator('#searchResults.open .search-hit[data-search-type="lead"]').first().click();
await page.waitForSelector("#page-franchise.active");
await page.waitForSelector("#drawer.open");
const searchRoute = await page.locator("#pageTitle").innerText();
await page.locator("#drawer").click({ position: { x: 12, y: 12 } });
await page.waitForFunction(() => !document.getElementById("drawer").classList.contains("open"));

await page.locator('#nav [data-nav-route="settings"]').click();
await page.waitForSelector("#page-settings.active");
await page.locator("#resetDemo").click();
await page.waitForFunction(
  () => {
    const value = localStorage.getItem("ototr-demo-db-v1");
    return value && !value.includes("Test Franchise Adayi");
  }
);
await page.locator('#nav [data-nav-route="franchise"]').click();
await page.waitForSelector("#page-franchise.active");
const leadAfterReset = await page.locator("#page-franchise.active .deal").count();

const mobile = await context.newPage();
const mobileErrors = [];
mobile.on("console", (msg) => {
  if (msg.type() === "error") mobileErrors.push(msg.text());
});
mobile.on("pageerror", (err) => mobileErrors.push(err.message));
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.addInitScript(() => localStorage.clear());
await mobile.goto(url, { waitUntil: "load" });
await mobile.waitForSelector("#page-dashboard.active");
const mobileNavCount = await mobile.locator("#nav [data-nav-route]").count();

await browser.close();

const result = {
  title,
  navCount,
  revenueChartReady,
  navRoutes,
  leadBefore,
  leadAfter,
  leadAfterReset,
  drawerTitle,
  searchRoute,
  mobileNavCount,
  errors,
  mobileErrors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  throw new Error("Sayfada console/page error bulundu.");
}

if (mobileErrors.length > 0) {
  throw new Error("Mobil gorunumde console/page error bulundu.");
}

if (leadAfter !== leadBefore + 1) {
  throw new Error("Yeni lead ekleme testi basarisiz.");
}

if (leadAfterReset !== leadBefore) {
  throw new Error("Demo verisini sifirlama testi basarisiz.");
}

if (searchRoute !== "Franchise Satış") {
  throw new Error("Global arama ilgili franchise ekranina gecmedi.");
}

if (mobileNavCount !== navCount) {
  throw new Error("Mobil gorunumde nav elemanlari eksik.");
}

if (!revenueChartReady) {
  throw new Error("Gelir/Royalty/EBITDA grafigi olusmadi.");
}
