import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const htmlPath = path.join(root, "karar-merkezi", "index.html");
const backupDir = path.join(root, "karar-merkezi", "backups");
const reportDir = path.join(root, "karar-merkezi", "migration-reports");
const backupStamp = "2026-08-03-kaporta-sasi-routing-before";

const LEGACY_GROUP_ID = "kaporta-boya-ekspertiz-ve-check-up";
const STRUCTURAL_GROUP_ID = "sasi-podye-yapisal-govde-kontrolu";
const ACCEPTANCE_GROUP_ID = "is-emri-arac-kabul-formu";
const AIRBAG_GROUP_ID = "airbag-hava-yastiklari-kontrol-testi";

const routing = {
  kaporta: [
    ["n962-tavanda-gocuk-mevcut-mu", "genel-kozmetik-yuzey", "Tavanda Göçük Mevcut mu?"],
    ["n311-aracta-noktasal-ezik-cizik-mevcut-mu-fotograf", "genel-kozmetik-yuzey", "Araçta Noktasal Ezik-Çizik Mevcut mu? Fotoğraf"],
    ["n1256-arac-genelinde-dolu-hasari-mevcut-mu", "genel-kozmetik-yuzey", "Araç Genelinde Dolu Hasarı Mevcut mu?"],
    ["n1875-arac-genelinde-dolu-onarimi-mevcut-mu", "genel-kozmetik-yuzey", "Araç Genelinde Dolu Onarımı Mevcut mu?"],
    ["n1879-arac-genelinde-kus-pisligi-ve-boya-bozulmalari-mev", "genel-kozmetik-yuzey", "Araç Genelinde Kuş Pisliği veya Boya Bozulması Mevcut mu?"],
    ["n1229-on-panjur", "dis-paneller-plastik", "Ön Panjur"],
    ["n11-on-tampon", "dis-paneller-plastik", "Ön Tampon"],
    ["n23-arka-tampon", "dis-paneller-plastik", "Arka Tampon"],
    ["n18-tavan", "dis-paneller-plastik", "Tavan"],
    ["n15-on-kaput", "dis-paneller-plastik", "Ön Kaput"],
    ["n6-sol-on-camurluk", "dis-paneller-plastik", "Sol Ön Çamurluk"],
    ["n7-sol-on-kapi", "dis-paneller-plastik", "Sol Ön Kapı"],
    ["n9-sol-arka-kapi", "dis-paneller-plastik", "Sol Arka Kapı"],
    ["n10-sol-arka-camurluk", "dis-paneller-plastik", "Sol Arka Çamurluk"],
    ["n31-sag-arka-camurluk", "dis-paneller-plastik", "Sağ Arka Çamurluk"],
    ["n30-sag-arka-kapi", "dis-paneller-plastik", "Sağ Arka Kapı"],
    ["n28-sag-on-kapi", "dis-paneller-plastik", "Sağ Ön Kapı"],
    ["n27-sag-on-camurluk", "dis-paneller-plastik", "Sağ Ön Çamurluk"],
    ["n20-arka-bagaj", "dis-paneller-plastik", "Bagaj Kapağı"],
    ["n1250-sol-on-kapi-ici", "kapi-icleri-baglantilar", "Sol Ön Kapı İçi"],
    ["n472-sol-arka-kapi-ici", "kapi-icleri-baglantilar", "Sol Arka Kapı İçi"],
    ["n1251-sag-on-kapi-ici", "kapi-icleri-baglantilar", "Sağ Ön Kapı İçi"],
    ["n471-sag-arka-kapi-ici", "kapi-icleri-baglantilar", "Sağ Arka Kapı İçi"],
    ["n692-kapi-fitil-lastikleri-ve-kapi-gergileri", "kapi-icleri-baglantilar", "Kapı Fitil Lastikleri ve Kapı Gergileri"],
    ["n187-tavan-tipi", "cam-tavan-donanimi", "Tavan Tipi"],
    ["n16-on-cam", "cam-tavan-donanimi", "Ön Cam"],
    ["n19-arka-cam", "cam-tavan-donanimi", "Arka Cam"],
    ["n17-sunroof", "cam-tavan-donanimi", "Sunroof"],
  ],
  structuralInspection: [
    ["n12-on-panel", "on-yapisal-bolum", "Ön Panel"],
    ["n1-sol-on-sasi", "on-yapisal-bolum", "Sol Ön Şasi"],
    ["n24-sag-on-sasi", "on-yapisal-bolum", "Sağ Ön Şasi"],
    ["n2-sol-on-podye-saci", "on-yapisal-bolum", "Sol Ön Podye"],
    ["n25-sag-on-podye-saci", "on-yapisal-bolum", "Sağ Ön Podye"],
    ["n5-sol-on-kule", "on-yapisal-bolum", "Sol Ön Amortisör Kulesi"],
    ["n26-sag-on-kule", "on-yapisal-bolum", "Sağ Ön Amortisör Kulesi"],
    ["n8-sol-on-ic-direk", "on-yapisal-bolum", "Sol Ön İç Direk"],
    ["n29-sag-on-ic-direk", "on-yapisal-bolum", "Sağ Ön İç Direk"],
    ["n327-sol-frangart-sol-ust-direk", "on-yapisal-bolum", "Sol Frangart / Üst Şasi Kolu"],
    ["n328-sag-frangart-sag-ust-direk", "on-yapisal-bolum", "Sağ Frangart / Üst Şasi Kolu"],
    ["n1578-sol-on-sasi-ucu", "on-yapisal-bolum", "Sol Ön Şasi Ucu"],
    ["n1577-sag-on-sasi-ucu", "on-yapisal-bolum", "Sağ Ön Şasi Ucu"],
    ["n470-sol-orta-ic-direk", "orta-yapisal-bolum", "Sol Orta İç Direk"],
    ["n469-sag-orta-ic-direk", "orta-yapisal-bolum", "Sağ Orta İç Direk"],
    ["n277-sol-marsbiyel", "orta-yapisal-bolum", "Sol Marşpiyel"],
    ["n276-sag-marsbiyel", "orta-yapisal-bolum", "Sağ Marşpiyel"],
    ["n313-arac-alt-tabani-kontrolu", "orta-yapisal-bolum", "Araç Alt Tabanı"],
    ["n275-arka-sol-sasi", "arka-yapisal-bolum", "Arka Sol Şasi"],
    ["n274-arka-sag-sasi", "arka-yapisal-bolum", "Arka Sağ Şasi"],
    ["n21-arka-ic-panel", "arka-yapisal-bolum", "Arka İç Panel"],
    ["n22-arka-havuz-ici", "arka-yapisal-bolum", "Arka Havuz İçi"],
  ],
  structuralEvidence: [
    ["n889-arac-alt-on-kisim-fotografi", "yapisal-kanitlar", "Araç Alt Ön Kısım Fotoğrafı"],
    ["n888-arac-alt-orta-kisim-fotografi", "yapisal-kanitlar", "Araç Alt Orta Kısım Fotoğrafı"],
    ["n887-arac-alt-arka-kisim-fotografi", "yapisal-kanitlar", "Araç Alt Arka Kısım Fotoğrafı"],
  ],
  computedSummary: [
    ["n296-arac-fiilen-agir-islemli-kategorisinde-mi-bu-yorum", "yapisal-sonuc", "Araç Fiilen Ağır İşlemli Kategorisinde mi?"],
  ],
  movedToOtherModules: [
    ["n315-araca-kirli-halde-mi-ekspertiz-yapildi", ACCEPTANCE_GROUP_ID, "inceleme-kosullari", "inspection_condition", "Araca Kirli Halde mi Ekspertiz Yapıldı?"],
    ["n304-karalama-kagidi", ACCEPTANCE_GROUP_ID, "dahili-notlar-ve-ekler", "internal_evidence", "Karalama Kağıdı"],
    ["n990-bu-araci-kendinize-ya-da-bir-akrabaniza-alir-misin", ACCEPTANCE_GROUP_ID, "nihai-eksper-kanaati", "internal_opinion", "Bu aracı kendinize ya da bir akrabanıza alır mısınız?"],
    ["n997-gosterge-panelinde-airbag-isigi-yaniyor-mu", AIRBAG_GROUP_ID, "airbag-legacy-alias", "legacy_alias", "Gösterge Panelinde Airbag Işığı Yanıyor mu?"],
    ["n1066-airbag-hava-yastiklari-usta-kanaati", AIRBAG_GROUP_ID, "airbag-genel-degerlendirme", "expert_opinion", "Airbag (Hava Yastıkları) Usta Kanaati"],
  ],
};

const decisionFields = [
  "reviewStatus",
  "approvedAt",
  "approvedBy",
  "photoPolicy",
  "evidenceType",
  "minEvidenceCount",
  "descriptionPolicy",
  "guaranteeRelevant",
  "measurementRequired",
  "customRuleText",
  "itemNote",
  "customOptions",
  "removedOptionIds",
  "optionRules",
];

const optionDecisionFields = [
  "finalLabel",
  "severity",
  "guaranteeEffect",
  "manualEvidenceRequired",
  "manualDescriptionRequired",
  "optionNote",
];

function readJsonScript(html, id) {
  const needle = `<script type="application/json" id="${id}">`;
  const start = html.indexOf(needle);
  if (start < 0) return null;
  const contentStart = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", contentStart);
  const raw = html.slice(contentStart, end).trim();
  return raw && raw !== "{}" ? JSON.parse(raw) : null;
}

function replaceJsonScript(html, id, data) {
  const needle = `<script type="application/json" id="${id}">`;
  const start = html.indexOf(needle);
  if (start < 0) throw new Error(`${id} script not found`);
  const contentStart = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", contentStart);
  return html.slice(0, contentStart) + JSON.stringify(data) + html.slice(end);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byItemId(items) {
  return new Map(items.map((item) => [item.itemId, item]));
}

function preserveRouteMeta(item, legacyGroup, target) {
  const sourceTitle = item.sourceTitle || item.title;
  Object.assign(item, {
    legacyGroupId: item.legacyGroupId || legacyGroup.groupId,
    legacyItemNo: item.legacyItemNo || item.itemNo,
    legacyGlobalIndex: item.legacyGlobalIndex || item.globalIndex,
    sourceTitle,
    displayTitle: target.displayTitle,
    title: target.displayTitle,
    targetGroupId: target.groupId,
    sectionId: target.sectionId,
    itemType: target.itemType,
    progressEligible: target.progressEligible,
    visibleInCustomerReport: target.visibleInCustomerReport,
  });
  if (target.required !== undefined) item.required = target.required;
  if (target.editable !== undefined) item.editable = target.editable;
  if (target.visibleAsSeparateTest !== undefined) item.visibleAsSeparateTest = target.visibleAsSeparateTest;
  if (target.canonicalItemId) item.canonicalItemId = target.canonicalItemId;
  if (target.legacyManualDecision) item.legacyManualDecision = target.legacyManualDecision;
  return item;
}

function normalizeUntouchedItem(item, group) {
  item.targetGroupId = item.targetGroupId || group.groupId;
  item.sectionId = item.sectionId || "varsayilan";
  item.itemType = item.itemType || "inspection";
  item.progressEligible = item.progressEligible !== false;
  item.visibleInCustomerReport = item.visibleInCustomerReport !== false;
  return item;
}

function routeSourceData(source, embeddedState) {
  const data = clone(source);
  const originalKaporta = data.groups.find((group) => group.groupId === LEGACY_GROUP_ID);
  if (!originalKaporta) throw new Error("Legacy kaporta group not found");
  if (originalKaporta.items.length !== 59) throw new Error(`Expected 59 legacy kaporta items, got ${originalKaporta.items.length}`);

  const legacyItems = byItemId(originalKaporta.items.map(clone));
  const used = new Set();
  const take = (itemId, target) => {
    const item = legacyItems.get(itemId);
    if (!item) throw new Error(`Missing legacy item: ${itemId}`);
    if (used.has(itemId)) throw new Error(`Duplicate route item: ${itemId}`);
    used.add(itemId);
    return preserveRouteMeta(item, originalKaporta, target);
  };

  const kaportaItems = routing.kaporta.map(([itemId, sectionId, displayTitle]) =>
    take(itemId, {
      groupId: LEGACY_GROUP_ID,
      sectionId,
      displayTitle,
      itemType: "inspection",
      progressEligible: true,
      visibleInCustomerReport: true,
    }),
  );

  const structuralItems = [
    ...routing.structuralInspection.map(([itemId, sectionId, displayTitle]) =>
      take(itemId, {
        groupId: STRUCTURAL_GROUP_ID,
        sectionId,
        displayTitle,
        itemType: "inspection",
        progressEligible: true,
        visibleInCustomerReport: true,
      }),
    ),
    ...routing.structuralEvidence.map(([itemId, sectionId, displayTitle]) =>
      take(itemId, {
        groupId: STRUCTURAL_GROUP_ID,
        sectionId,
        displayTitle,
        itemType: "evidence",
        progressEligible: false,
        visibleInCustomerReport: true,
        required: true,
      }),
    ),
    ...routing.computedSummary.map(([itemId, sectionId, displayTitle]) =>
      take(itemId, {
        groupId: STRUCTURAL_GROUP_ID,
        sectionId,
        displayTitle,
        itemType: "computed_summary",
        progressEligible: false,
        visibleInCustomerReport: true,
        editable: false,
        legacyManualDecision: {
          preservedInItemRules: true,
          itemId,
          source: "embedded-state.itemRules",
          reviewStatus: embeddedState?.itemRules?.[itemId]?.reviewStatus || null,
          approvedAt: embeddedState?.itemRules?.[itemId]?.approvedAt || null,
          approvedBy: embeddedState?.itemRules?.[itemId]?.approvedBy || null,
        },
      }),
    ),
  ];

  const movedItems = routing.movedToOtherModules.map(([itemId, groupId, sectionId, itemType, displayTitle]) =>
    take(itemId, {
      groupId,
      sectionId,
      displayTitle,
      itemType,
      progressEligible: false,
      visibleInCustomerReport: !["internal_evidence", "internal_opinion"].includes(itemType),
      visibleAsSeparateTest: itemType === "legacy_alias" ? false : undefined,
      canonicalItemId: itemType === "legacy_alias" ? "n1115-airbag-isigi-yaniyor-mu" : undefined,
    }),
  );

  const lostFromRouting = originalKaporta.items.filter((item) => !used.has(item.itemId)).map((item) => item.itemId);
  if (lostFromRouting.length) throw new Error(`Unrouted legacy items: ${lostFromRouting.join(", ")}`);

  const targetByGroup = new Map();
  [...movedItems].forEach((item) => {
    const list = targetByGroup.get(item.targetGroupId) || [];
    list.push(item);
    targetByGroup.set(item.targetGroupId, list);
  });

  const newGroups = [];
  data.groups.forEach((group) => {
    if (group.groupId === LEGACY_GROUP_ID) {
      newGroups.push({
        ...group,
        title: "KAPORTA & BOYA EKSPERTİZİ",
        moduleTitle: "Kaporta & Boya",
        moduleCategory: "expertise",
        items: kaportaItems,
      });
      newGroups.push({
        groupNo: group.groupNo + 1,
        groupId: STRUCTURAL_GROUP_ID,
        title: "ŞASİ / PODYE / YAPISAL GÖVDE KONTROLÜ",
        moduleTitle: "Şasi & Yapısal Gövde",
        moduleCategory: "expertise",
        items: structuralItems,
      });
      return;
    }
    const incoming = targetByGroup.get(group.groupId) || [];
    newGroups.push({
      ...group,
      items: [...group.items.map((item) => normalizeUntouchedItem(item, group)), ...incoming],
    });
  });

  let globalIndex = 1;
  newGroups.forEach((group, groupIndex) => {
    group.groupNo = groupIndex + 1;
    group.items.forEach((item, itemIndex) => {
      item.itemNo = itemIndex + 1;
      item.globalIndex = globalIndex++;
      item.groupId = group.groupId;
      item.groupTitle = group.title;
    });
  });

  data.groups = newGroups;
  data.stats.groupCount = newGroups.length;
  data.stats.itemCount = newGroups.reduce((sum, group) => sum + group.items.length, 0);
  return { data, legacyItems: originalKaporta.items, routedIds: [...used] };
}

function decisionSnapshot(state) {
  const itemRules = state?.itemRules || {};
  const snap = {};
  Object.entries(itemRules).forEach(([itemId, rule]) => {
    const itemRule = {};
    decisionFields.forEach((field) => {
      if (field === "optionRules") return;
      itemRule[field] = rule[field] === undefined ? null : rule[field];
    });
    itemRule.optionRules = {};
    Object.entries(rule.optionRules || {}).forEach(([optionId, optionRule]) => {
      itemRule.optionRules[optionId] = {};
      optionDecisionFields.forEach((field) => {
        itemRule.optionRules[optionId][field] = optionRule[field] === undefined ? null : optionRule[field];
      });
    });
    snap[itemId] = itemRule;
  });
  return snap;
}

function countDecisionDiffs(before, after) {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  ids.forEach((id) => {
    const a = JSON.stringify(before[id] ?? null);
    const b = JSON.stringify(after[id] ?? null);
    if (a !== b) changed.push(id);
  });
  return changed;
}

function reportFor(data, legacyItems, embeddedBefore, embeddedAfter) {
  const group = (id) => data.groups.find((entry) => entry.groupId === id);
  const kaporta = group(LEGACY_GROUP_ID);
  const structural = group(STRUCTURAL_GROUP_ID);
  const all = data.groups.flatMap((entry) => entry.items.map((item) => ({ ...item, actualGroupId: entry.groupId })));
  const legacyIds = legacyItems.map((item) => item.itemId);
  const routedLegacy = all.filter((item) => item.legacyGroupId === LEGACY_GROUP_ID);
  const duplicates = [...new Set(routedLegacy.map((item) => item.itemId).filter((id, index, arr) => arr.indexOf(id) !== index))];
  const lost = legacyIds.filter((id) => !routedLegacy.some((item) => item.itemId === id));
  const beforeSnap = decisionSnapshot(embeddedBefore);
  const afterSnap = decisionSnapshot(embeddedAfter);
  const decisionDiffs = countDecisionDiffs(beforeSnap, afterSnap);
  const approvalsBefore = Object.values(embeddedBefore?.itemRules || {}).filter((rule) => rule.reviewStatus === "approved").length;
  const approvalsAfter = Object.values(embeddedAfter?.itemRules || {}).filter((rule) => rule.reviewStatus === "approved").length;
  const itemRuleCountBefore = Object.keys(embeddedBefore?.itemRules || {}).length;
  const itemRuleCountAfter = Object.keys(embeddedAfter?.itemRules || {}).length;
  const optionRuleCountBefore = Object.values(embeddedBefore?.itemRules || {}).reduce((sum, rule) => sum + Object.keys(rule.optionRules || {}).length, 0);
  const optionRuleCountAfter = Object.values(embeddedAfter?.itemRules || {}).reduce((sum, rule) => sum + Object.keys(rule.optionRules || {}).length, 0);
  const alias = all.find((item) => item.itemId === "n997-gosterge-panelinde-airbag-isigi-yaniyor-mu");
  const canonical = all.find((item) => item.itemId === "n1115-airbag-isigi-yaniyor-mu");
  const legacyAliasConflict = Boolean(embeddedAfter?.itemRules?.[alias?.itemId] && embeddedAfter?.itemRules?.[canonical?.itemId]);

  return {
    legacyTotal: legacyItems.length,
    kaporta: kaporta.items.filter((item) => item.itemType === "inspection" && item.progressEligible).length,
    structuralInspection: structural.items.filter((item) => item.itemType === "inspection" && item.progressEligible).length,
    structuralEvidence: structural.items.filter((item) => item.itemType === "evidence" && item.sectionId === "yapisal-kanitlar").length,
    computedSummary: structural.items.filter((item) => item.itemType === "computed_summary").length,
    movedToOtherModules: routing.movedToOtherModules.length,
    lostItems: lost,
    duplicateItems: duplicates,
    modifiedUserDecisionCount: decisionDiffs.length,
    modifiedUserDecisionItemIds: decisionDiffs,
    approvalsBefore,
    approvalsAfter,
    itemRulesBefore: itemRuleCountBefore,
    itemRulesAfter: itemRuleCountAfter,
    optionRulesBefore: optionRuleCountBefore,
    optionRulesAfter: optionRuleCountAfter,
    legacyAlias: {
      itemId: alias?.itemId || null,
      canonicalItemId: alias?.canonicalItemId || null,
      visibleAsSeparateTest: alias?.visibleAsSeparateTest ?? null,
      technicalConflict: legacyAliasConflict,
    },
    source: {
      groupCount: data.stats.groupCount,
      itemCount: data.stats.itemCount,
    },
  };
}

function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const source = readJsonScript(html, "source-data");
  const embedded = readJsonScript(html, "embedded-state");
  if (!source) throw new Error("source-data missing");

  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });
  const indexBackupPath = path.join(backupDir, `${backupStamp}.html`);
  const stateBackupPath = path.join(backupDir, `${backupStamp}-embedded-state.json`);
  if (!fs.existsSync(indexBackupPath)) fs.writeFileSync(indexBackupPath, html, "utf8");
  if (!fs.existsSync(stateBackupPath)) fs.writeFileSync(stateBackupPath, JSON.stringify(embedded || {}, null, 2), "utf8");

  const embeddedBefore = clone(embedded || {});
  const { data, legacyItems } = routeSourceData(source, embeddedBefore);
  const embeddedAfter = clone(embeddedBefore);
  const report = reportFor(data, legacyItems, embeddedBefore, embeddedAfter);

  if (report.legacyTotal !== 59 || report.kaporta !== 28 || report.structuralInspection !== 22 || report.structuralEvidence !== 3 || report.computedSummary !== 1 || report.movedToOtherModules !== 5) {
    throw new Error(`Routing counts failed: ${JSON.stringify(report)}`);
  }
  if (report.lostItems.length || report.duplicateItems.length || report.modifiedUserDecisionCount !== 0) {
    throw new Error(`Migration safety failed: ${JSON.stringify(report)}`);
  }
  if (report.approvalsBefore !== report.approvalsAfter || report.itemRulesBefore !== report.itemRulesAfter || report.optionRulesBefore !== report.optionRulesAfter) {
    throw new Error(`Rule preservation failed: ${JSON.stringify(report)}`);
  }

  const reportPath = path.join(reportDir, "kaporta-sasi-routing-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  const nextHtml = replaceJsonScript(html, "source-data", data);
  if (sha256(nextHtml) !== sha256(html)) fs.writeFileSync(htmlPath, nextHtml, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
