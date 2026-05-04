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
const ignoredConsoleError = (text) => text.includes("net::ERR_CERT_COMMON_NAME_INVALID");

page.on("console", (msg) => {
  if (msg.type() === "error" && !ignoredConsoleError(msg.text())) errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));

const url = "file:///" + htmlPath.replace(/\\/g, "/");
await page.addInitScript(() => localStorage.clear());
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#page-dashboard.active");
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "Acil Durum Merkezi" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "OTOTR" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "10" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "Lead Funnel" }).first().waitFor();
await page.locator("#page-dashboard.active .card-title").filter({ hasText: "CEO Academy" }).first().waitFor();
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
await page.locator("#revenueAiInsight").waitFor();

const title = await page.title();
const navCount = await page.locator("#nav button").count();
const revenueChartReady = await page.locator("#chartRevenue").evaluate((canvas) => canvas.width > 0 && canvas.height > 0);
const academyCeoChartReady = await page.locator("#chartDashboardAcademyRegion").evaluate((canvas) => canvas.width > 0 && canvas.height > 0);
await page.locator("#dashboardAcademyBreakdown").selectOption("branch");
await page.waitForTimeout(350);
const academyCeoBreakdownReady = await page.evaluate(() => {
  const title = document.getElementById("dashboardAcademyBreakdownTitle")?.textContent || "";
  const chart = window.Chart?.getChart(document.getElementById("chartDashboardAcademyRegion"));
  return (title.includes("Şube") || title.includes("Åube")) && (chart?.data?.labels?.length || 0) > 1;
});
await page.locator("#dashboardAcademyBreakdown").selectOption("region");
await page.waitForTimeout(350);
const academyCeoRegionBreakdownReady = await page.evaluate(() => {
  const title = document.getElementById("dashboardAcademyBreakdownTitle")?.textContent || "";
  const chart = window.Chart?.getChart(document.getElementById("chartDashboardAcademyRegion"));
  return title.includes("Bölgesel") && (chart?.data?.labels?.length || 0) > 1;
});
await page.locator("#commandDockToggle").click();
await page.locator("[data-dock-pin]").click();
await page.locator('[data-dashboard-jump="dashboardRevenueTrend"]').click();
await page.waitForTimeout(700);
const dashboardQuickNavReady = await page.evaluate(() => {
  const target = document.getElementById("dashboardRevenueTrend");
  const dock = document.getElementById("commandDock");
  if (!target) return false;
  const rect = target.getBoundingClientRect();
  return document.getElementById("page-dashboard")?.classList.contains("active") &&
    rect.top >= -20 &&
    rect.top < 220 &&
    target.classList.contains("dashboard-jump-highlight") &&
    dock?.classList.contains("pinned") &&
    dock?.classList.contains("open");
});
await page.locator("[data-dock-pin]").click();
await page.locator('[data-dashboard-jump="dashboardComplaintsCeo"]').click();
await page.waitForTimeout(1200);
const dashboardComplaintPanelReady = await page.evaluate(() => {
  const target = document.getElementById("dashboardComplaintsCeo");
  const menuLabels = [...document.querySelectorAll("[data-dashboard-jump]")].map((el) => el.textContent || "");
  if (!target) return false;
  const rect = target.getBoundingClientRect();
  return target.textContent.includes("tibar") &&
    menuLabels.some((text) => text.includes("Müşteri Şikayet Takip")) &&
    document.querySelector('[data-dashboard-jump="dashboardRiskImpact"]') &&
    document.querySelector('[data-dashboard-jump="dashboardActionTasks"]') &&
    target.textContent.includes("Kuyru") &&
    rect.top >= -180 &&
    rect.top < 220 &&
    target.classList.contains("dashboard-jump-highlight");
});
const navRoutes = await page.$$eval("#nav [data-nav-route]", (buttons) =>
  buttons.map((button) => button.getAttribute("data-nav-route"))
);

for (const route of navRoutes) {
  await page.locator(`#nav [data-nav-route="${route}"]`).click();
  const pageRoute = route.split("/")[0] === "ik" ? "hr" : route.split("/")[0];
  await page.waitForSelector(`#page-${pageRoute}.active`);
}

await page.locator('#nav [data-nav-route="academy"]').click();
await page.waitForSelector("#page-academy.active");
await page.waitForTimeout(800);
const academyOverviewChartsReady = await page.evaluate(() => {
  const ids = ["chartAcademyRegion", "chartAcademyCert", "chartAcademyTrend", "chartAcademyDeadline"];
  return ids.every((id) => {
    const canvas = document.getElementById(id);
    if (!canvas || !canvas.width || !canvas.height) return false;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  });
});
await page.locator("#academyChartBreakdown").selectOption("branch");
await page.waitForTimeout(350);
const academyBreakdownReady = await page.evaluate(() => {
  const title = document.getElementById("academyBreakdownTitle")?.textContent || "";
  const chart = window.Chart?.getChart(document.getElementById("chartAcademyRegion"));
  return title.includes("Şube") && (chart?.data?.labels?.length || 0) > 1;
});
await page.locator('#page-academy.active [data-academy-tab="courses"]').click();
await page.locator("#page-academy.active .micro-btn[data-academy-open-course]").first().click();
await page.waitForSelector("#academyCourseModal.open");
const academyDetailTitle = await page.locator("#academyCourseDetailBody .card-title").first().innerText();
await page.locator("#academyCourseModal [data-academy-close-course]").click();
await page.waitForSelector("#academyCourseModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-open-course="AC-04"]').first().click();
await page.waitForSelector("#academyCourseModal.open");
await page.locator("#academyCourseDetailBody").getByText("academy-pack").first().waitFor();
await page.locator("#academyCourseDetailBody").getByText("academy-pack-01-ac01-ac10.md").waitFor();
await page.locator("#academyCourseModal [data-academy-close-course]").click();
await page.waitForSelector("#academyCourseModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-open-course="AC-10"]').first().click();
await page.waitForSelector("#academyCourseModal.open");
await page.locator("#academyCourseDetailBody").getByText("academy-pack").first().waitFor();
await page.locator("#academyCourseDetailBody").getByText("academy-pack-01-ac01-ac10.md").waitFor();
await page.locator("#academyCourseModal [data-academy-close-course]").click();
await page.waitForSelector("#academyCourseModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-open-course="AC-20"]').first().click();
await page.waitForSelector("#academyCourseModal.open");
await page.locator("#academyCourseDetailBody").getByText("academy-pack").first().waitFor();
await page.locator("#academyCourseDetailBody").getByText("academy-pack-02-ac11-ac20.md").waitFor();
await page.locator("#academyCourseModal [data-academy-close-course]").click();
await page.waitForSelector("#academyCourseModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-open-course="AC-50"]').first().click();
await page.waitForSelector("#academyCourseModal.open");
await page.locator("#academyCourseDetailBody").getByText("academy-pack").first().waitFor();
await page.locator("#academyCourseDetailBody").getByText("academy-pack-05-ac41-ac50.md").waitFor();
await page.locator("#academyCourseModal [data-academy-close-course]").click();
await page.waitForSelector("#academyCourseModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-open-assign]').first().click();
await page.waitForSelector("#academyAssignModal.open");
await page.locator("#academyAssignModal [data-academy-save-assignment]").click();
await page.waitForSelector("#academyAssignModal.open", { state: "hidden", timeout: 5000 });
await page.locator('#page-academy.active [data-academy-tab="assignments"]').click();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Kalite /" }).first().waitFor();
await page.locator("#page-academy.active").getByText("Otomatik atama").first().waitFor();
await page.locator("#page-academy.active [data-academy-complete-assignment]").first().click();
page.once("dialog", async (dialog) => {
  await dialog.accept("92");
});
await page.locator("#page-academy.active [data-academy-exam-assignment]").first().click();
await page.locator("#page-academy.active [data-academy-cert-assignment]").first().click();
await page.waitForFunction(() => {
  const rows = JSON.parse(localStorage.getItem("ototr-academy-assignments") || "[]");
  return rows.some((row) => row.status === "Sertifika Verildi");
});
const academyAssignmentLifecycle = await page.evaluate(() => {
  const rows = JSON.parse(localStorage.getItem("ototr-academy-assignments") || "[]");
  const row = rows.find((item) => item.status === "Sertifika Verildi");
  return `${row?.status || ""} / ${row?.certificateStatus || ""}`;
});
await page.locator('#page-academy.active [data-academy-tab="certs"]').click();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Soru Bankas" }).first().waitFor();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Sertifika Yenileme" }).first().waitFor();
const academyRuleEngineReady = await page.evaluate(() => {
  const policy = window.academyExamPolicy?.("AC-14");
  const events = window.academyRetrainingEvents?.() || [];
  const recs = window.academyRetrainingRecommendations?.() || [];
  return Boolean(policy?.questionCount >= 15 && policy?.caseQuestionCount >= 4 && policy?.certificateMonths >= 12 && events.length && recs.length);
});
await page.locator('#page-academy.active [data-academy-tab="people"]').click();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Personel" }).first().waitFor();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Zorunlu" }).first().waitFor();
await page.locator('#page-academy.active [data-academy-tab="sla"]').click();
await page.locator("#page-academy.active").getByText("Academy Raporlama").first().waitFor();
await page.locator('#page-academy.active [data-academy-tab="certs"]').click();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Sertifika Yenileme" }).first().waitFor();
await page.locator('#page-academy.active [data-academy-tab="assignments"]').click();
await page.locator("#page-academy.active .card-title").filter({ hasText: "Kalite /" }).first().waitFor();

await page.locator('#nav [data-nav-route="franchise"]').click();
await page.waitForSelector("#page-franchise.active");
const leadBefore = await page.locator("#page-franchise.active .deal").count();

await page.locator("#openLead2").click();
await page.waitForSelector("#leadModal.open");
await page.locator('#leadModal input[name="name"]').fill("Test Franchise Adayi");
await page.locator('#leadModal input[name="phone"]').fill("05550000000");
await page.locator('#leadModal input[name="city"]').fill("Bursa");
await page.locator('#leadModal textarea[name="note"]').fill("Otomatik test kaydi");
await page.locator('#leadModal button[form="leadForm"]').click();
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

await page.locator('#nav [data-nav-route="dashboard"]').click();
await page.waitForSelector("#page-dashboard.active");
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
    const value = localStorage.getItem("ototr-demo-db-v3-consistent-live");
    return value && !value.includes("Test Franchise Adayi");
  }
);
await page.locator('#nav [data-nav-route="franchise"]').click();
await page.waitForSelector("#page-franchise.active");
const leadAfterReset = await page.locator("#page-franchise.active .deal").count();

const mobile = await context.newPage();
const mobileErrors = [];
mobile.on("console", (msg) => {
  if (msg.type() === "error" && !ignoredConsoleError(msg.text())) mobileErrors.push(msg.text());
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
  academyCeoChartReady,
  academyCeoBreakdownReady,
  academyCeoRegionBreakdownReady,
  dashboardQuickNavReady,
  dashboardComplaintPanelReady,
  navRoutes,
  leadBefore,
  leadAfter,
  leadAfterReset,
  drawerTitle,
  searchRoute,
  academyDetailTitle,
  academyOverviewChartsReady,
  academyBreakdownReady,
  academyRuleEngineReady,
  academyAssignmentLifecycle,
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

if (!searchRoute.startsWith("Franchise")) {
  throw new Error("Global arama ilgili franchise ekranina gecmedi.");
}

if (mobileNavCount !== navCount) {
  throw new Error("Mobil gorunumde nav elemanlari eksik.");
}

if (!revenueChartReady) {
  throw new Error("Gelir/Royalty/EBITDA grafigi olusmadi.");
}

if (!academyCeoChartReady) {
  throw new Error("CEO Academy dashboard grafigi olusmadi.");
}

if (!academyCeoBreakdownReady) {
  throw new Error("CEO Academy dashboard kirilim secimi calismadi.");
}

if (!academyCeoRegionBreakdownReady) {
  throw new Error("CEO Academy dashboard bolgesel kirilim secimi calismadi.");
}

if (!dashboardQuickNavReady) {
  throw new Error("Dashboard hizli gezinme menusu ilgili bolume goturmedi.");
}

if (!dashboardComplaintPanelReady) {
  throw new Error("Dashboard musteri sikayetleri CEO paneli hazir degil.");
}

if (!academyOverviewChartsReady) {
  throw new Error("Academy ana sayfa grafikleri bos kaldi.");
}

if (!academyBreakdownReady) {
  throw new Error("Academy grafik kirilim secimi calismadi.");
}

if (!academyRuleEngineReady) {
  throw new Error("Academy sinav/sertifika veya yeniden egitim kural motoru hazir degil.");
}
