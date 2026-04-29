import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const demo = require("../src/data/demo/demoData.js");
const model = demo.createDemoModel();
const service = model.services;
const seed = model.dashboardSeed;
const packages = model.packages;
const operations = seed.operations;

function assert(condition, message){
  if(!condition) throw new Error(message);
}

const ceoBranches = service.getVisibleBranches("CEO");
const marmaraBranches = service.getVisibleBranches("BOLGE_MUDURU", "marmara");
const kadikoyBranches = service.getVisibleBranches("BAYI", null, "BR-002");
const ceoSummary = service.getDashboardSummary("CEO");
const marmaraSummary = service.getDashboardSummary("BOLGE_MUDURU", "marmara");
const kadikoySummary = service.getDashboardSummary("BAYI", null, "BR-002");
const antalyaAlerts = service.getRiskAlerts("BAYI", null, "BR-009").map(a => a.type);
const bursaAlerts = service.getRiskAlerts("BAYI", null, "BR-008").map(a => a.type);
const ceoLegal = service.getLegalSummary("CEO");
const marmaraLegal = service.getLegalSummary("BOLGE_MUDURU", "marmara");
const antalyaLegal = service.getLegalSummary("BAYI", null, "BR-009");

assert(seed.branches.length === 10, "10 subelik demo evren olusmadi.");
assert(operations.length === 300, "30 gun x 10 sube operasyon verisi olusmadi.");
assert(ceoBranches.length === 10, "CEO tum subeleri gormuyor.");
assert(marmaraBranches.length === 4, "Marmara bolge muduru sadece 4 Marmara subesini gormeli.");
assert(kadikoyBranches.length === 1 && kadikoyBranches[0].id === "BR-002", "Bayi sadece kendi subesini gormeli.");
assert(ceoSummary.totalMonthlyRevenue > marmaraSummary.totalMonthlyRevenue, "Rol filtresi dashboard toplamlarini degistirmiyor.");
assert(kadikoySummary.totalMonthlyVehicles > 0 && kadikoySummary.totalMonthlyVehicles < ceoSummary.totalMonthlyVehicles, "Sube muduru ozet filtresi hatali.");
assert(antalyaAlerts.includes("HIGH_COMPLAINT_RATE"), "Antalya sikayet alarmi uretmiyor.");
assert(bursaAlerts.includes("LOW_REVENUE") || bursaAlerts.includes("LOW_VEHICLE_COUNT"), "Bursa dusuk performans alarmi uretmiyor.");
assert(seed.riskAlerts.some(a => a.type === "ROYALTY_DELAY"), "Royalty gecikmesi alarm olarak gorunmuyor.");
assert(JSON.stringify(packages.map(p => p.price)) === JSON.stringify([5000,7500,10000,12500,15000]), "Paket fiyatlari hatali.");
assert(Math.min(...operations.map(x => x.vehicleCount)) >= 8 && Math.max(...operations.map(x => x.vehicleCount)) <= 15, "Gunluk arac sayisi 8-15 bandinda degil.");
assert(ceoSummary.averageTicket >= 8900 && ceoSummary.averageTicket <= 9500, "Ortalama ticket 8.900-9.500 TL bandinda degil.");
assert(ceoSummary.totalRoyalty === operations.reduce((s,x)=>s+x.royalty,0), "Aylik royalty toplami hatali.");
assert(seed.legalModule.contracts.length === 10, "Legal contract yapisi 10 subeyi kapsamiyor.");
assert(seed.legalModule.legalCases.length >= 5, "Legal case demo datasi eksik.");
assert(seed.legalModule.legalComplaints.some(x => x.legalRisk), "Legal risk sikayetleri uretilmiyor.");
assert(seed.legalModule.compliance.every(x => x.complianceScore >= 0 && x.complianceScore <= 100), "Compliance skorlari 0-100 bandinda degil.");
assert(seed.legalModule.legalAlerts.length > 0, "Legal alert uretilmiyor.");
assert(ceoLegal.totalLegalCases >= marmaraLegal.totalLegalCases, "Legal CEO filtresi bolge filtresinden kucuk olamaz.");
assert(marmaraLegal.legalAlerts.every(a => a.regionId === "marmara"), "Bolge muduru legal alarmlari kendi bolgesiyle sinirli degil.");
assert(antalyaLegal.legalAlerts.every(a => a.branchId === "BR-009"), "Bayi legal alarmlari kendi subesiyle sinirli degil.");
assert(ceoSummary.totalLegalCases === ceoLegal.totalLegalCases && ceoSummary.complianceScoreAvg === ceoLegal.complianceScoreAvg, "Dashboard summary legal alanlari tasimiyor.");

console.log(JSON.stringify({
  branches: seed.branches.length,
  operations: operations.length,
  ceoBranches: ceoBranches.length,
  marmaraBranches: marmaraBranches.length,
  kadikoyBranches: kadikoyBranches.length,
  averageTicket: ceoSummary.averageTicket,
  totalMonthlyRevenue: ceoSummary.totalMonthlyRevenue,
  totalRoyalty: ceoSummary.totalRoyalty,
  delayedRoyalty: ceoSummary.delayedRoyalty,
  legal: {
    totalLegalCases: ceoLegal.totalLegalCases,
    highRiskCases: ceoLegal.highRiskCases,
    riskyBranches: ceoLegal.riskyBranches,
    complianceScoreAvg: ceoLegal.complianceScoreAvg,
    legalAlerts: ceoLegal.legalAlerts.length,
    marmaraLegalAlerts: marmaraLegal.legalAlerts.length,
    antalyaLegalAlerts: antalyaLegal.legalAlerts.length
  },
  antalyaAlerts,
  bursaAlerts
}, null, 2));
