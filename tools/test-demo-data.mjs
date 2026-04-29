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
  antalyaAlerts,
  bursaAlerts
}, null, 2));
