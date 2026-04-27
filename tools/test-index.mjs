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
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#page-dashboard.active");

const title = await page.title();
const navCount = await page.locator("#nav button").count();

await page.locator('#nav button[data-route="franchise"]').click();
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

await page.locator('#nav button[data-route="branches"]').click();
await page.waitForSelector("#page-branches.active");
await page.locator('#page-branches.active tr[data-detail^="branch:"]').first().click();
await page.waitForSelector("#drawer.open");
const drawerTitle = await page.locator("#drawerContent .card-title").first().innerText();

await browser.close();

const result = {
  title,
  navCount,
  leadBefore,
  leadAfter,
  drawerTitle,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  throw new Error("Sayfada console/page error bulundu.");
}

if (leadAfter !== leadBefore + 1) {
  throw new Error("Yeni lead ekleme testi basarisiz.");
}
