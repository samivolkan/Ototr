import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const packageRoots = [root, ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [])];
const { chromium } = require(require.resolve("playwright", { paths: packageRoots }));
const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error("Chrome veya Edge bulunamadi.");

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

try {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  const menu = page.locator('#nav [data-nav-route="erpver2"]');
  await menu.waitFor();
  const popupPromise = context.waitForEvent("page");
  await menu.click();
  const erp = await popupPromise;
  const errors = [];
  const failedResponses = [];
  erp.on("console", (message) => message.type() === "error" && !message.text().includes("Failed to load resource") && errors.push(message.text()));
  erp.on("pageerror", (error) => errors.push(error.message));
  erp.on("response", (response) => response.status() >= 400 && !response.url().endsWith("/favicon.ico") && failedResponses.push(`${response.status()} ${response.url()}`));
  await erp.waitForLoadState("domcontentloaded");
  await erp.getByRole("heading", { name: "ERPVER2 Yonetim Sistemi" }).waitFor();
  if ((await erp.title()) !== "otoTR ERPVER2 Yönetim Sistemi") throw new Error("ERPVER2 sayfa basligi hatali.");
  if (!erp.url().endsWith("/erpver2/index.html")) throw new Error(`ERPVER2 URL hatali: ${erp.url()}`);
  await erp.setViewportSize({ width: 390, height: 844 });
  const overflow = await erp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("ERPVER2 mobil yatay tasma olusturuyor.");
  if (failedResponses.length) throw new Error(`ERPVER2 kaynak hatasi: ${failedResponses.join(" | ")}`);
  if (errors.length) throw new Error(`ERPVER2 tarayici hatasi: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ menu: await menu.innerText(), title: await erp.title(), url: erp.url(), mobileOverflow: overflow, consoleErrors: errors.length, failedResponses: failedResponses.length }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
