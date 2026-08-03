import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "karar-merkezi", "index.html");
const reportPath = path.join(root, "karar-merkezi", "migration-reports", "kaporta-sasi-routing-report.json");
const backupStatePath = path.join(root, "karar-merkezi", "backups", "2026-08-03-kaporta-sasi-routing-before-embedded-state.json");

const KAPORTA_GROUP = "kaporta-boya-ekspertiz-ve-check-up";
const STRUCTURAL_GROUP = "sasi-podye-yapisal-govde-kontrolu";
const STRUCTURAL_EVIDENCE = "yapisal-kanitlar";
const STRUCTURAL_COMPUTED = "yapisal-sonuc";
const LEGACY_ALIAS = "n997-gosterge-panelinde-airbag-isigi-yaniyor-mu";
const CANONICAL_AIRBAG = "n1115-airbag-isigi-yaniyor-mu";
const MIGRATION_VERSION = "kaporta-sasi-routing-v1";

const expectedKaporta = [
  "n962-tavanda-gocuk-mevcut-mu",
  "n311-aracta-noktasal-ezik-cizik-mevcut-mu-fotograf",
  "n1256-arac-genelinde-dolu-hasari-mevcut-mu",
  "n1875-arac-genelinde-dolu-onarimi-mevcut-mu",
  "n1879-arac-genelinde-kus-pisligi-ve-boya-bozulmalari-mev",
  "n1229-on-panjur",
  "n11-on-tampon",
  "n23-arka-tampon",
  "n18-tavan",
  "n15-on-kaput",
  "n6-sol-on-camurluk",
  "n7-sol-on-kapi",
  "n9-sol-arka-kapi",
  "n10-sol-arka-camurluk",
  "n31-sag-arka-camurluk",
  "n30-sag-arka-kapi",
  "n28-sag-on-kapi",
  "n27-sag-on-camurluk",
  "n20-arka-bagaj",
  "n1250-sol-on-kapi-ici",
  "n472-sol-arka-kapi-ici",
  "n1251-sag-on-kapi-ici",
  "n471-sag-arka-kapi-ici",
  "n692-kapi-fitil-lastikleri-ve-kapi-gergileri",
  "n187-tavan-tipi",
  "n16-on-cam",
  "n19-arka-cam",
  "n17-sunroof"
];

const expectedStructural = [
  "n12-on-panel",
  "n1-sol-on-sasi",
  "n24-sag-on-sasi",
  "n2-sol-on-podye-saci",
  "n25-sag-on-podye-saci",
  "n5-sol-on-kule",
  "n26-sag-on-kule",
  "n8-sol-on-ic-direk",
  "n29-sag-on-ic-direk",
  "n327-sol-frangart-sol-ust-direk",
  "n328-sag-frangart-sag-ust-direk",
  "n1578-sol-on-sasi-ucu",
  "n1577-sag-on-sasi-ucu",
  "n470-sol-orta-ic-direk",
  "n469-sag-orta-ic-direk",
  "n277-sol-marsbiyel",
  "n276-sag-marsbiyel",
  "n313-arac-alt-tabani-kontrolu",
  "n275-arka-sol-sasi",
  "n274-arka-sag-sasi",
  "n21-arka-ic-panel",
  "n22-arka-havuz-ici"
];

const expectedEvidence = [
  "n889-arac-alt-on-kisim-fotografi",
  "n888-arac-alt-orta-kisim-fotografi",
  "n887-arac-alt-arka-kisim-fotografi"
];

const movedOther = new Map([
  ["n315-araca-kirli-halde-mi-ekspertiz-yapildi", { groupId: "is-emri-arac-kabul-formu", sectionId: "inceleme-kosullari", itemType: "inspection_condition" }],
  ["n304-karalama-kagidi", { groupId: "is-emri-arac-kabul-formu", sectionId: "dahili-notlar-ve-ekler", itemType: "internal_evidence" }],
  ["n990-bu-araci-kendinize-ya-da-bir-akrabaniza-alir-misin", { groupId: "is-emri-arac-kabul-formu", sectionId: "nihai-eksper-kanaati", itemType: "internal_opinion" }],
  [LEGACY_ALIAS, { groupId: "airbag-hava-yastiklari-kontrol-testi", sectionId: "airbag-legacy-alias", itemType: "legacy_alias" }],
  ["n1066-airbag-hava-yastiklari-usta-kanaati", { groupId: "airbag-hava-yastiklari-kontrol-testi", sectionId: "airbag-genel-degerlendirme", itemType: "expert_opinion" }]
]);

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractJson(html, id) {
  const marker = `<script type="application/json" id="${id}">`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${id} bulunamadi`);
  const bodyStart = start + marker.length;
  const end = html.indexOf("</script>", bodyStart);
  return JSON.parse(html.slice(bodyStart, end));
}

function allItems(source) {
  return source.groups.flatMap((group) => group.items.map((item) => ({ ...item, groupId: group.groupId, groupTitle: group.title })));
}

function byId(items) {
  return new Map(items.map((item) => [item.itemId, item]));
}

function countOptionRules(state) {
  return Object.values(state.itemRules || {}).reduce((total, rule) => total + Object.keys(rule.optionRules || {}).length, 0);
}

function countApproved(state) {
  return Object.values(state.itemRules || {}).filter((rule) => rule.reviewStatus === "approved").length;
}

function stringifyDecisionState(state) {
  return JSON.stringify({
    itemRules: state.itemRules,
    globalLabelOverrides: state.globalLabelOverrides || {},
    auditLog: state.auditLog || []
  });
}

const html = fs.readFileSync(htmlPath, "utf8");
const source = extractJson(html, "source-data");
const embeddedState = extractJson(html, "embedded-state");
const backupState = JSON.parse(fs.readFileSync(backupStatePath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const items = allItems(source);
const itemMap = byId(items);

const kaportaGroup = source.groups.find((group) => group.groupId === KAPORTA_GROUP);
const structuralGroup = source.groups.find((group) => group.groupId === STRUCTURAL_GROUP);

assert(source.stats.groupCount === 13, "source stats groupCount 13 olmali");
assert(source.stats.itemCount === 265, "source stats itemCount 265 korunmali");
assert(kaportaGroup?.title === "KAPORTA & BOYA EKSPERTİZİ", "Kaporta grup basligi guncellenmeli");
assert(kaportaGroup?.moduleTitle === "Kaporta & Boya", "Kaporta moduleTitle guncellenmeli");
assert(structuralGroup?.title === "ŞASİ / PODYE / YAPISAL GÖVDE KONTROLÜ", "Sasi grup basligi olusmali");
assert(structuralGroup?.moduleTitle === "Şasi & Yapısal Gövde", "Sasi moduleTitle olusmali");

assert(kaportaGroup.items.length === 28, `Kaporta ${kaportaGroup.items.length}/28`);
assert(structuralGroup.items.filter((item) => item.itemType === "inspection" && item.progressEligible === true).length === 22, "Sasi yapisal kontrol 22 olmali");
assert(structuralGroup.items.filter((item) => item.sectionId === STRUCTURAL_EVIDENCE).length === 3, "Yapisal kanit 3 olmali");
assert(structuralGroup.items.filter((item) => item.sectionId === STRUCTURAL_COMPUTED).length === 1, "Computed summary 1 olmali");

for (const itemId of expectedKaporta) {
  const item = itemMap.get(itemId);
  assert(item?.groupId === KAPORTA_GROUP, `${itemId} Kaporta grubunda olmali`);
  assert(item?.progressEligible === true, `${itemId} progressEligible true olmali`);
  assert(item?.itemType === "inspection", `${itemId} itemType inspection olmali`);
}

for (const itemId of expectedStructural) {
  const item = itemMap.get(itemId);
  assert(item?.groupId === STRUCTURAL_GROUP, `${itemId} Sasi grubunda olmali`);
  assert(item?.itemType === "inspection", `${itemId} itemType inspection olmali`);
  assert(item?.progressEligible === true, `${itemId} progressEligible true olmali`);
}

for (const itemId of expectedEvidence) {
  const item = itemMap.get(itemId);
  assert(item?.groupId === STRUCTURAL_GROUP, `${itemId} Sasi kanit grubunda olmali`);
  assert(item?.sectionId === STRUCTURAL_EVIDENCE, `${itemId} evidence section olmali`);
  assert(item?.progressEligible === false, `${itemId} progress disi olmali`);
}

const computed = structuralGroup.items.find((item) => item.sectionId === STRUCTURAL_COMPUTED);
assert(computed?.itemId === "n296-arac-fiilen-agir-islemli-kategorisinde-mi-bu-yorum", "Computed summary n296 olmali");
assert(computed?.progressEligible === false, "Computed summary progress disi olmali");
assert(computed?.itemType === "computed_summary", "Computed summary itemType olmali");

for (const [itemId, expected] of movedOther) {
  const item = itemMap.get(itemId);
  assert(item?.groupId === expected.groupId, `${itemId} ${expected.groupId} grubuna tasinmali`);
  assert(item?.sectionId === expected.sectionId, `${itemId} sectionId dogru olmali`);
  assert(item?.itemType === expected.itemType, `${itemId} itemType dogru olmali`);
  assert(item?.progressEligible === false, `${itemId} progress disi olmali`);
}

assert(itemMap.get(LEGACY_ALIAS)?.visibleAsSeparateTest === false, "Legacy airbag alias ayri test olarak gorunmemeli");
assert(itemMap.get(LEGACY_ALIAS)?.canonicalItemId === CANONICAL_AIRBAG, "Legacy airbag alias canonical n1115'e baglanmali");
assert(Boolean(itemMap.get(CANONICAL_AIRBAG)), "Canonical n1115 mevcut olmali");

assert(report.legacyTotal === 59, "Report legacyTotal 59 olmali");
assert(report.kaporta === 28, "Report kaporta 28 olmali");
assert(report.structuralInspection === 22, "Report structuralInspection 22 olmali");
assert(report.structuralEvidence === 3, "Report structuralEvidence 3 olmali");
assert(report.computedSummary === 1, "Report computedSummary 1 olmali");
assert(report.movedToOtherModules === 5, "Report movedToOtherModules 5 olmali");
assert(Array.isArray(report.lostItems) && report.lostItems.length === 0, "Report lostItems bos olmali");
assert(Array.isArray(report.duplicateItems) && report.duplicateItems.length === 0, "Report duplicateItems bos olmali");
assert(report.modifiedUserDecisionCount === 0, "Report modifiedUserDecisionCount 0 olmali");

assert(countApproved(backupState) === countApproved(embeddedState), "Onay sayisi embedded state icinde korunmali");
assert(Object.keys(backupState.itemRules || {}).length === Object.keys(embeddedState.itemRules || {}).length, "itemRules sayisi korunmali");
assert(countOptionRules(backupState) === countOptionRules(embeddedState), "optionRules sayisi korunmali");
assert(stringifyDecisionState(backupState) === stringifyDecisionState(embeddedState), "Embedded kullanici kararlari birebir korunmali");

for (const item of items) {
  assert(Object.prototype.hasOwnProperty.call(item, "targetGroupId"), `${item.itemId} targetGroupId eksik`);
  assert(Object.prototype.hasOwnProperty.call(item, "sectionId"), `${item.itemId} sectionId eksik`);
  assert(Object.prototype.hasOwnProperty.call(item, "itemType"), `${item.itemId} itemType eksik`);
  assert(Object.prototype.hasOwnProperty.call(item, "progressEligible"), `${item.itemId} progressEligible eksik`);
}

const require = createRequire(import.meta.url);
const playwrightPath = require.resolve("playwright", { paths: [root, ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [])] });
const { chromium } = require(playwrightPath);
const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error("Chrome veya Edge bulunamadi");

const browser = await chromium.launch({ headless: true, executablePath });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktop.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

const url = "file:///" + htmlPath.replace(/\\/g, "/");
await page.addInitScript(() => localStorage.clear());
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("#groupList .group-btn");

const desktopResult = await page.evaluate(({ KAPORTA_GROUP, STRUCTURAL_GROUP, LEGACY_ALIAS, MIGRATION_VERSION }) => {
  const source = window.__OTOTR_APP__.getSource();
  const state = window.__OTOTR_APP__.getState();
  const finalExport = window.__OTOTR_APP__.buildFinalExport();
  const flatRows = window.__OTOTR_APP__.buildFlatRows();
  const kaporta = source.groups.find((group) => group.groupId === KAPORTA_GROUP);
  const structural = source.groups.find((group) => group.groupId === STRUCTURAL_GROUP);
  const visibleLegacyAlias = Array.from(document.querySelectorAll("#itemList .item-btn"))
    .some((button) => button.dataset.itemId === LEGACY_ALIAS);
  const groupText = document.querySelector("#groupList")?.textContent || "";
  return {
    kaportaProgress: window.__OTOTR_APP__.groupProgress(kaporta),
    structuralProgress: window.__OTOTR_APP__.groupProgress(structural),
    visibleLegacyAlias,
    hasKaportaTitle: groupText.includes("KAPORTA & BOYA EKSPERTİZİ"),
    hasStructuralTitle: groupText.includes("ŞASİ / PODYE / YAPISAL GÖVDE KONTROLÜ"),
    hasStructuralEvidenceCounter: groupText.includes("Yapısal Kanıtlar"),
    migrationModified: state.routingMigration?.[MIGRATION_VERSION]?.modifiedUserDecisionCount,
    exportHasRoutingFields: finalExport.groups.every((group) => group.items.every((item) =>
      "targetGroupId" in item && "sectionId" in item && "itemType" in item && "progressEligible" in item
    )),
    csvHasRoutingFields: flatRows.every((row) =>
      "targetGroupId" in row && "sectionId" in row && "itemType" in row && "progressEligible" in row
    ),
    structuralSummary: finalExport.structuralComputedSummary?.shortStatus,
    validationTotal: finalExport.validation.totalItems
  };
}, { KAPORTA_GROUP, STRUCTURAL_GROUP, LEGACY_ALIAS, MIGRATION_VERSION });

assert(desktopResult.kaportaProgress.total === 28, "Desktop Kaporta progress toplam 28 olmali");
assert(desktopResult.structuralProgress.total === 22, "Desktop Sasi progress toplam 22 olmali");
assert(desktopResult.visibleLegacyAlias === false, "Desktop legacy airbag alias listede gorunmemeli");
assert(desktopResult.hasKaportaTitle, "Desktop Kaporta basligi gorunmeli");
assert(desktopResult.hasStructuralTitle, "Desktop Sasi basligi gorunmeli");
assert(desktopResult.hasStructuralEvidenceCounter, "Desktop yapisal kanit sayaci gorunmeli");
assert(desktopResult.migrationModified === 0, "Runtime migration modifiedUserDecisionCount 0 olmali");
assert(desktopResult.exportHasRoutingFields, "Final JSON export routing alanlarini tasimali");
assert(desktopResult.csvHasRoutingFields, "Flat CSV export routing alanlarini tasimali");
assert(Boolean(desktopResult.structuralSummary), "Structural computed summary exportta olmali");
assert(desktopResult.validationTotal === items.filter((item) => item.progressEligible !== false && item.visibleAsSeparateTest !== false).length, "Validation total progressEligible maddeler olmali");

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mobilePage = await mobile.newPage();
const mobileErrors = [];
mobilePage.on("console", (msg) => {
  if (msg.type() === "error") mobileErrors.push(msg.text());
});
mobilePage.on("pageerror", (error) => mobileErrors.push(error.message));
await mobilePage.addInitScript(() => localStorage.clear());
await mobilePage.goto(url, { waitUntil: "load" });
await mobilePage.waitForSelector("#groupList .group-btn");
const mobileResult = await mobilePage.evaluate(() => ({
  groupCount: document.querySelectorAll("#groupList .group-btn").length,
  itemCount: document.querySelectorAll("#itemList .item-btn").length,
  bodyWidth: document.documentElement.scrollWidth,
  viewportWidth: window.innerWidth
}));
assert(mobileResult.groupCount === 13, "Mobilde 13 grup gorunmeli");
assert(mobileResult.itemCount > 0, "Mobilde madde listesi gorunmeli");
assert(mobileErrors.length === 0, `Mobil console error olmamali: ${mobileErrors.join(" | ")}`);
assert(consoleErrors.length === 0, `Desktop console error olmamali: ${consoleErrors.join(" | ")}`);

await browser.close();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  distribution: {
    legacyTotal: 59,
    kaporta: 28,
    structuralInspection: 22,
    structuralEvidence: 3,
    computedSummary: 1,
    movedToOtherModules: 5
  },
  approvalsBefore: countApproved(backupState),
  approvalsAfter: countApproved(embeddedState),
  itemRules: Object.keys(embeddedState.itemRules || {}).length,
  optionRules: countOptionRules(embeddedState),
  modifiedUserDecisionCount: report.modifiedUserDecisionCount,
  lostItems: report.lostItems,
  duplicateItems: report.duplicateItems,
  desktopConsoleErrors: consoleErrors.length,
  mobileConsoleErrors: mobileErrors.length
}, null, 2));
