(function(global){
  const DAY_COUNT = 30;
  const ROYALTY_RATE = 0.10;
  const TODAY = "2026-04-29";

  const packages = [
    { id:"mini", name:"Mini Paket", price:5000, baseShare:28 },
    { id:"standard", name:"Standart Paket", price:7500, baseShare:32 },
    { id:"detail", name:"Detay Paket", price:10000, baseShare:22 },
    { id:"premium", name:"Premium Paket", price:12500, baseShare:12 },
    { id:"full", name:"Full Ekspertiz", price:15000, baseShare:6 }
  ];

  const branchProfiles = [
    { id:"BR-001", name:"İstanbul Bağcılar", displayName:"İstanbul Bağcılar", city:"İstanbul", regionId:"marmara", region:"Marmara Bölgesi", manager:"Serkan Yıldız", character:"Yüksek hacim", minCars:12, maxCars:15, ticketBias:-180, profitBias:-2, complaintBias:0.7, satisfaction:91, google:4.5, leadBias:1.05, conversionTarget:42, royaltyDelay:0, growth:8, mix:{mini:31,standard:34,detail:22,premium:9,full:4} },
    { id:"BR-002", name:"İstanbul Kadıköy", displayName:"İstanbul Kadıköy", city:"İstanbul", regionId:"marmara", region:"Marmara Bölgesi", manager:"Elif Kaya", character:"Güçlü şube", minCars:13, maxCars:15, ticketBias:850, profitBias:5, complaintBias:-0.8, satisfaction:96, google:4.8, leadBias:1.02, conversionTarget:58, royaltyDelay:0, growth:16, mix:{mini:18,standard:28,detail:25,premium:19,full:10} },
    { id:"BR-003", name:"İstanbul Pendik", displayName:"İstanbul Pendik", city:"İstanbul", regionId:"marmara", region:"Marmara Bölgesi", manager:"Murat Demir", character:"Dengeli", minCars:10, maxCars:13, ticketBias:120, profitBias:1, complaintBias:0, satisfaction:93, google:4.6, leadBias:.95, conversionTarget:47, royaltyDelay:0, growth:6, mix:{mini:27,standard:32,detail:23,premium:12,full:6} },
    { id:"BR-004", name:"Ankara Çankaya", displayName:"Ankara Çankaya", city:"Ankara", regionId:"ic_anadolu", region:"İç Anadolu Bölgesi", manager:"Burak Şahin", character:"Stabil", minCars:10, maxCars:14, ticketBias:480, profitBias:4, complaintBias:-0.2, satisfaction:94, google:4.7, leadBias:.92, conversionTarget:50, royaltyDelay:0, growth:9, mix:{mini:23,standard:31,detail:25,premium:14,full:7} },
    { id:"BR-005", name:"Ankara Etimesgut", displayName:"Ankara Etimesgut", city:"Ankara", regionId:"ic_anadolu", region:"İç Anadolu Bölgesi", manager:"Ahmet Yılmaz", character:"Orta", minCars:9, maxCars:12, ticketBias:-60, profitBias:0, complaintBias:.2, satisfaction:91, google:4.5, leadBias:.88, conversionTarget:43, royaltyDelay:2, growth:2, mix:{mini:30,standard:33,detail:21,premium:11,full:5} },
    { id:"BR-006", name:"İzmir Bornova", displayName:"İzmir Bornova", city:"İzmir", regionId:"ege", region:"Ege Bölgesi", manager:"Derya Koç", character:"Reklam iyi, dönüşüm orta", minCars:9, maxCars:13, ticketBias:-130, profitBias:-1, complaintBias:.3, satisfaction:90, google:4.4, leadBias:1.32, conversionTarget:38, royaltyDelay:0, growth:4, mix:{mini:31,standard:33,detail:21,premium:10,full:5} },
    { id:"BR-007", name:"İzmir Karşıyaka", displayName:"İzmir Karşıyaka", city:"İzmir", regionId:"ege", region:"Ege Bölgesi", manager:"Selin Arslan", character:"Premium eğilimli", minCars:10, maxCars:14, ticketBias:720, profitBias:5, complaintBias:-0.4, satisfaction:95, google:4.7, leadBias:1.03, conversionTarget:52, royaltyDelay:0, growth:12, mix:{mini:20,standard:28,detail:24,premium:18,full:10} },
    { id:"BR-008", name:"Bursa Nilüfer", displayName:"Bursa Nilüfer", city:"Bursa", regionId:"marmara", region:"Marmara Bölgesi", manager:"Kadir Başaran", character:"Düşüşte", minCars:8, maxCars:10, ticketBias:-520, profitBias:-7, complaintBias:.4, satisfaction:89, google:4.3, leadBias:.76, conversionTarget:45, royaltyDelay:0, growth:-11, targetMultiplier:1.25, mix:{mini:35,standard:34,detail:19,premium:8,full:4} },
    { id:"BR-009", name:"Antalya Kepez", displayName:"Antalya Kepez", city:"Antalya", regionId:"akdeniz", region:"Akdeniz Bölgesi", manager:"Canan Aydın", character:"Şikayet yüksek", minCars:9, maxCars:12, ticketBias:-210, profitBias:-4, complaintBias:3.5, satisfaction:84, google:4.1, leadBias:.98, conversionTarget:41, royaltyDelay:9, growth:-3, mix:{mini:32,standard:33,detail:21,premium:9,full:5} },
    { id:"BR-010", name:"Konya Selçuklu", displayName:"Konya Selçuklu", city:"Konya", regionId:"ic_anadolu", region:"İç Anadolu Bölgesi", manager:"Mehmet Aydın", character:"Fiyat hassas", minCars:8, maxCars:11, ticketBias:-780, profitBias:-3, complaintBias:.1, satisfaction:90, google:4.4, leadBias:1.10, conversionTarget:35, royaltyDelay:0, growth:1, mix:{mini:39,standard:36,detail:16,premium:6,full:3} }
  ];

  const users = [
    { id:"U-CEO", name:"Volkan Aksoy", role:"CEO" },
    { id:"U-GM", name:"Genel Merkez", role:"GENEL_MERKEZ" },
    { id:"U-RM-MAR", name:"Marmara Bolge Muduru", role:"BOLGE_MUDURU", regionId:"marmara" },
    { id:"U-BR-KAD", name:"Kadikoy Sube Muduru", role:"BAYI", branchId:"BR-002" }
  ];

  const regions = [
    { id:"marmara", name:"Marmara Bölgesi", opportunity:"EV ekspertiz kapasitesi" },
    { id:"ic_anadolu", name:"İç Anadolu Bölgesi", opportunity:"Konya fiyat stratejisi ve Ankara B2B" },
    { id:"ege", name:"Ege Bölgesi", opportunity:"Premium paket ve filo anlaşması" },
    { id:"akdeniz", name:"Akdeniz Bölgesi", opportunity:"Antalya kalite kurtarma planı" }
  ];

  const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
  const round = n => Math.round(n);
  const sum = (arr,key) => arr.reduce((s,x)=>s+(Number(typeof key === "function" ? key(x) : x[key])||0),0);
  const pct = (now, target) => target ? (now / target) * 100 : 0;
  const money = n => Math.round(n / 100) * 100;
  const dateAdd = (iso, offset) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0,10);
  };
  const monthName = index => ["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"][index];

  function pickCarCount(branch, dayIndex){
    const span = branch.maxCars - branch.minCars + 1;
    let value = branch.minCars + ((dayIndex + branch.id.charCodeAt(5)) % span);
    return clamp(value, 8, 15);
  }

  function distributePackages(totalCars, mix){
    const raw = packages.map(p => ({...p, count:Math.floor(totalCars * (mix[p.id] || p.baseShare) / 100)}));
    let used = sum(raw,"count"), i = 0;
    while(used < totalCars){ raw[i % raw.length].count += 1; used += 1; i += 1; }
    while(used > totalCars){ const row = raw.slice().reverse().find(x=>x.count>0); row.count -= 1; used -= 1; }
    return raw.map(x => ({ packageId:x.id, packageName:x.name, price:x.price, count:x.count, revenue:x.count*x.price }));
  }

  function createDailyOperation(branch, dayIndex){
    const date = dateAdd(TODAY, -(DAY_COUNT - 1 - dayIndex));
    const vehicleCount = pickCarCount(branch, dayIndex);
    const packageSales = distributePackages(vehicleCount, branch.mix);
    const packageRevenue = sum(packageSales,"revenue");
    const adjustedRevenue = money(packageRevenue + (vehicleCount * (branch.ticketBias + 1150)));
    const averageTicket = Math.round(adjustedRevenue / vehicleCount);
    const expenseRate = clamp(0.64 - (branch.profitBias/100) + ((dayIndex % 5)-2) * 0.006, 0.58, 0.72);
    const ebitdaRate = clamp(0.25 + (branch.profitBias/100) + ((dayIndex % 3)-1) * 0.008, 0.18, 0.32);
    const netProfitRate = clamp(0.18 + (branch.profitBias/120) + ((dayIndex % 4)-1.5) * 0.005, 0.12, 0.24);
    const expense = money(adjustedRevenue * expenseRate);
    const ebitda = money(adjustedRevenue * ebitdaRate);
    const netProfit = money(adjustedRevenue * netProfitRate);
    const royalty = money(adjustedRevenue * ROYALTY_RATE);
    const complaintRate = clamp(1.4 + branch.complaintBias + (dayIndex % 6 === 0 ? .8 : 0), .2, 7.5);
    const complaints = Math.round(vehicleCount * complaintRate / 100);
    const satisfaction = clamp(branch.satisfaction - complaints * 2 + (dayIndex % 5) - 2, 78, 98);
    const leadCount = Math.max(5, Math.round((vehicleCount * 2.4 + (dayIndex % 4)) * branch.leadBias));
    const conversionRate = clamp(branch.conversionTarget + ((dayIndex % 7) - 3), 25, 64);
    const salesLead = Math.round(leadCount * conversionRate / 100);
    const appointmentLead = Math.round(leadCount * clamp(conversionRate + 18, 45, 78) / 100);
    const adCost = money(leadCount * (branch.id === "BR-006" ? 380 : branch.id === "BR-002" ? 240 : 300));
    return {
      date, branchId:branch.id, branchName:branch.displayName, regionId:branch.regionId, region:branch.region,
      vehicleCount, packageSales, grossRevenue:adjustedRevenue, averageTicket, expense, ebitda, netProfit, royalty,
      royaltyCollected: branch.royaltyDelay ? 0 : royalty,
      royaltyDelayDays: branch.royaltyDelay,
      complaints, complaintRate:Number(complaintRate.toFixed(1)), customerSatisfaction:satisfaction,
      leads:leadCount, conversionRate, adCost, cpl:Math.round(adCost/leadCount), salesLead, appointmentLead
    };
  }

  function generateOperations(){
    return branchProfiles.flatMap(branch => Array.from({length:DAY_COUNT}, (_,i)=>createDailyOperation(branch,i)));
  }

  function monthlyTarget(branch){
    const avgCars = (branch.minCars + branch.maxCars) / 2;
    const vehicleTarget = Math.round(avgCars * DAY_COUNT * (branch.targetMultiplier || 1.08));
    const ticketTarget = clamp(Math.round(weightedTicket(branch.mix) + branch.ticketBias + 350), 8500, 10400);
    return {
      branchId:branch.id,
      monthlyVehicleTarget:vehicleTarget,
      monthlyRevenueTarget:money(vehicleTarget * ticketTarget),
      averageTicketTarget:ticketTarget,
      complaintRateTarget: branch.id === "BR-009" ? 3.2 : 2.5,
      royaltyPaymentTarget:"zamaninda",
      satisfactionTarget:90,
      conversionTarget:branch.conversionTarget
    };
  }

  function weightedTicket(mix){
    return packages.reduce((s,p)=>s+p.price*((mix[p.id] || p.baseShare)/100),0);
  }

  function createAlerts(operations, targets){
    const todayRows = latestRows(operations);
    const byBranchMonth = groupBy(operations, "branchId");
    const alerts = [];
    todayRows.forEach(row => {
      const target = targets.find(x=>x.branchId===row.branchId);
      const monthRows = byBranchMonth[row.branchId] || [];
      const monthRevenue = sum(monthRows,"grossRevenue");
      const monthVehicles = sum(monthRows,"vehicleCount");
      const revenuePerf = pct(monthRevenue, target.monthlyRevenueTarget);
      const vehiclePerf = pct(monthVehicles, target.monthlyVehicleTarget);
      const push = (type,severity,title,description,metricValue,threshold) => alerts.push({
        id:`AL-${String(alerts.length+1).padStart(3,"0")}`, type, severity,
        branchId:row.branchId, branchName:row.branchName, region:row.region, title, description,
        metricValue, threshold, createdAt:`${TODAY}T${String(9 + (alerts.length%7)).padStart(2,"0")}:20:00`, status:"open"
      });
      if(revenuePerf < 85) push("LOW_REVENUE", revenuePerf < 72 ? "critical" : "warning", "Ciro hedef altinda", `${row.branchName} aylik ciro hedefinin %85 altinda ilerliyor.`, Math.round(revenuePerf), 85);
      if(row.vehicleCount < 8) push("LOW_VEHICLE_COUNT", "warning", "Gunluk arac sayisi dustu", `${row.branchName} bugun 8 aracin altina indi.`, row.vehicleCount, 8);
      if(row.complaintRate > 4) push("HIGH_COMPLAINT_RATE", row.complaintRate > 5.5 ? "critical" : "warning", "Sikayet orani yuksek", `${row.branchName} sikayet orani kritik esigi asti.`, row.complaintRate, 4);
      if(row.royaltyDelayDays > 0) push("ROYALTY_DELAY", row.royaltyDelayDays > 7 ? "critical" : "warning", "Royalty cekimi gecikti", `${row.branchName} otomatik royalty cekimi ${row.royaltyDelayDays} gun gecikmede.`, row.royaltyDelayDays, 7);
      if(row.averageTicket < target.averageTicketTarget * .85) push("LOW_AVERAGE_TICKET", "warning", "Ortalama ticket dusuk", `${row.branchName} paket ortalamasi hedefin %85 altinda.`, row.averageTicket, Math.round(target.averageTicketTarget*.85));
      if(row.customerSatisfaction < 90) push("LOW_CUSTOMER_SATISFACTION", row.customerSatisfaction < 86 ? "critical" : "warning", "Memnuniyet dusuk", `${row.branchName} memnuniyet skoru %90 altina indi.`, row.customerSatisfaction, 90);
      if(row.conversionRate < target.conversionTarget) push("MARKETING_CONVERSION_DROP", "warning", "Lead donusumu hedef altinda", `${row.branchName} pazarlama donusumu hedefin altinda.`, row.conversionRate, target.conversionTarget);
      if(vehiclePerf < 85) push("LOW_VEHICLE_COUNT", "warning", "Aylik arac hedefi riskli", `${row.branchName} aylik arac hedefinde geride.`, Math.round(vehiclePerf), 85);
    });
    return alerts;
  }

  function groupBy(rows, key){
    return rows.reduce((m,row)=>{ const value = typeof key === "function" ? key(row) : row[key]; (m[value] ||= []).push(row); return m; }, {});
  }

  function latestRows(operations){
    const latest = operations.reduce((max,x)=>x.date > max ? x.date : max, operations[0]?.date || TODAY);
    return operations.filter(x=>x.date === latest);
  }

  function roleFilter(rows, role="CEO", regionId, branchId){
    const normalized = String(role || "CEO").toUpperCase();
    if(normalized.includes("BAYI") || normalized.includes("SUBE")) return rows.filter(x => (x.branchId || x.id) === branchId);
    if(normalized.includes("BOLGE")) return rows.filter(x => x.regionId === regionId || x.region === regionId);
    return rows;
  }

  function summarizeRows(rows, targets, alerts){
    const today = latestRows(rows);
    const totalRevenue = sum(rows,"grossRevenue");
    const todayRevenue = sum(today,"grossRevenue");
    const totalCars = sum(rows,"vehicleCount");
    const todayCars = sum(today,"vehicleCount");
    const totalRoyalty = sum(rows,"royalty");
    const collectedRoyalty = sum(rows,"royaltyCollected");
    const avgTicket = totalCars ? Math.round(totalRevenue / totalCars) : 0;
    const totalComplaints = sum(rows,"complaints");
    const avgSatisfaction = rows.length ? Math.round(sum(rows,"customerSatisfaction") / rows.length) : 0;
    const criticalAlerts = alerts.filter(a=>a.severity==="critical").length;
    return { totalDailyVehicles:todayCars, totalMonthlyVehicles:totalCars, totalDailyRevenue:todayRevenue, totalMonthlyRevenue:totalRevenue, averageTicket:avgTicket, totalRoyalty, collectedRoyalty, delayedRoyalty:totalRoyalty-collectedRoyalty, totalComplaints, criticalAlerts, customerSatisfaction:avgSatisfaction };
  }

  function branchPerformance(branches, operations, targets, alerts){
    const byBranch = groupBy(operations, "branchId");
    return branches.map(branch => {
      const rows = byBranch[branch.id] || [];
      const today = latestRows(rows)[0] || {};
      const revenue = sum(rows,"grossRevenue");
      const cars = sum(rows,"vehicleCount");
      const target = targets.find(x=>x.branchId===branch.id);
      const complaintRate = cars ? (sum(rows,"complaints") / cars) * 100 : 0;
      const satisfaction = rows.length ? sum(rows,"customerSatisfaction") / rows.length : branch.satisfaction;
      const revenuePerf = pct(revenue, target.monthlyRevenueTarget);
      const score = Math.round(clamp(revenuePerf*.32 + satisfaction*.28 + (100-complaintRate*10)*.18 + pct(cars,target.monthlyVehicleTarget)*.14 + (branch.royaltyDelay ? 55 : 92)*.08, 0, 100));
      return { ...branch, dailyVehicles:today.vehicleCount || 0, dailyRevenue:today.grossRevenue || 0, monthlyRevenue:revenue, monthlyVehicles:cars, averageTicket: cars ? Math.round(revenue/cars) : 0, complaints:sum(rows,"complaints"), complaintRate:Number(complaintRate.toFixed(1)), satisfaction:Number((satisfaction/20).toFixed(1)), satisfactionPercent:Math.round(satisfaction), targetCompletion:Math.round(revenuePerf), trustScore:score, status:score>=88?"Grow":score>=76?"Watch":score>=65?"Fix":"Replace", alerts:alerts.filter(a=>a.branchId===branch.id).length };
    });
  }

  function regionPerformance(branchRows){
    return regions.map(region => {
      const rows = branchRows.filter(b=>b.regionId===region.id);
      const revenue = sum(rows,"monthlyRevenue");
      const cars = sum(rows,"monthlyVehicles");
      const score = rows.length ? Math.round(sum(rows,"trustScore")/rows.length) : 0;
      const risk = rows.filter(b=>b.status==="Fix" || b.status==="Replace").length;
      return { region:region.name, regionId:region.id, cities:[...new Set(rows.map(b=>b.city))].join(", "), cars, branches:rows.length, avgSale:cars?Math.round(revenue/cars):0, regionAvg:cars?Math.round(revenue/cars):0, revenue, riskCount:risk, opportunity:region.opportunity, satisfaction:rows.length?Number((sum(rows,"satisfaction")/rows.length).toFixed(2)):0, regionScore:score, branchScore:score-2, growthScore:score+4, growthDelta: rows.length ? Number((sum(rows,"growth")/rows.length).toFixed(1)) : 0, risk:score>=84?"Yukselen":score>=74?"Dengeli":"Riskli", tone:score>=84?"good":score>=74?"warn":"bad" };
    }).filter(r=>r.branches);
  }

  function createFinanceHistory(operations){
    const monthly = groupBy(operations, x => x.date.slice(0,7));
    const current = Object.entries(monthly).map(([ym,rows]) => {
      const [year, month] = ym.split("-").map(Number);
      return { year, month:monthName(month-1), revenue:sum(rows,"grossRevenue"), royalty:sum(rows,"royalty"), ad:sum(rows,"adCost"), ebitda:sum(rows,"ebitda"), status:"actual" };
    });
    const base2026 = current[0] || { revenue:0, royalty:0, ad:0, ebitda:0 };
    const forecast2026 = Array.from({length:12}, (_,i) => {
      const factor = 0.72 + i*.045;
      return { year:2026, month:monthName(i), revenue:money(base2026.revenue*factor), royalty:money(base2026.royalty*factor), ad:money(base2026.ad*factor), ebitda:money(base2026.ebitda*factor), status:i<4?"actual":"forecast" };
    });
    const past = [2024,2025].flatMap(year => Array.from({length:12}, (_,i) => {
      const growth = year === 2024 ? .58 + i*.025 : .76 + i*.03;
      return { year, month:monthName(i), revenue:money(base2026.revenue*growth), royalty:money(base2026.royalty*growth), ad:money(base2026.ad*growth), ebitda:money(base2026.ebitda*growth) };
    }));
    return [...past, ...forecast2026];
  }

  function buildDashboardSeed(){
    const operations = generateOperations();
    const targets = branchProfiles.map(monthlyTarget);
    const alerts = createAlerts(operations, targets);
    const branchRows = branchPerformance(branchProfiles, operations, targets, alerts);
    const summary = summarizeRows(operations, targets, alerts);
    const regionsRows = regionPerformance(branchRows);
    const best = branchRows.slice().sort((a,b)=>b.trustScore-a.trustScore).slice(0,10);
    const risk = branchRows.slice().sort((a,b)=>a.trustScore-b.trustScore).slice(0,10);
    const financeHistory = createFinanceHistory(operations);
    const topRevenue = branchRows.slice().sort((a,b)=>b.dailyRevenue-a.dailyRevenue).slice(0,5).map(b=>[b.displayName,b.dailyRevenue]);
    const network = { branchCount:branchRows.length, activeBranches:branchRows.length, offlineBranches:0, todayCars:summary.totalDailyVehicles, todayRevenue:summary.totalDailyRevenue, avgTicket:summary.averageTicket, avgSatisfaction:Number((summary.customerSatisfaction/20).toFixed(2)), openComplaints:summary.totalComplaints, todayLeads:sum(latestRows(operations),"leads"), monthlyRoyalty:summary.totalRoyalty, trustScore:Math.round(sum(branchRows,"trustScore")/branchRows.length) };
    return {
      operations, kpiTargets:targets, riskAlerts:alerts, demoPackages:packages, users,
      branches: branchRows.map(b => ({ id:b.id, name:b.displayName, city:b.city, region:b.region, regionId:b.regionId, status:"Aktif", manager:b.manager, revenue:b.monthlyRevenue, royalty:Math.round(b.monthlyRevenue*ROYALTY_RATE), reports:b.monthlyVehicles, nps:b.satisfactionPercent-20, google:b.google, quality:b.trustScore, risk:b.status==="Fix"||b.status==="Replace"?"Yuksek":b.status==="Watch"?"Orta":"Dusuk", growth:b.growth, late:b.royaltyDelay ? 1 : 0 })),
      finance: financeHistory.filter(x=>x.year===2026).slice(0,4),
      financeHistory,
      marketing:[
        {channel:"Google Ads",spend:sum(operations,"adCost")*.48,leads:Math.round(sum(operations,"leads")*.42),cpl:302,roi:4.9},
        {channel:"Meta",spend:sum(operations,"adCost")*.24,leads:Math.round(sum(operations,"leads")*.24),cpl:286,roi:3.6},
        {channel:"WhatsApp",spend:sum(operations,"adCost")*.16,leads:Math.round(sum(operations,"leads")*.18),cpl:224,roi:5.1},
        {channel:"Organik",spend:sum(operations,"adCost")*.12,leads:Math.round(sum(operations,"leads")*.16),cpl:158,roi:6.4}
      ].map(x=>({...x,spend:money(x.spend)})),
      branchDetails: Object.fromEntries(branchRows.map(b => [b.id, { capacity:clamp(58+b.dailyVehicles*3,60,98), avgTicket:b.averageTicket, conversion:b.conversionTarget, wait:b.id==="BR-009"?"38 dk":b.id==="BR-002"?"16 dk":"24 dk", sla:b.id==="BR-009"?78:b.trustScore, complaints:b.complaints, staff:b.dailyVehicles>12?10:7, training:b.trustScore, inventory:"%92 hazir", profit:Math.round(b.monthlyRevenue*.18), actions:[`${b.displayName} icin ${b.status} karar plani ac`, `Paket ortalamasi ${b.averageTicket.toLocaleString("tr-TR")} TL seviyesinde takip edilecek`, b.royaltyDelay ? "Royalty otomatik cekim sorunu finans ekranina aktarildi" : "Royalty otomatik cekim normal"], mix:packages.map(p=>b.mix[p.id]||p.baseShare) }])),
      complaints:[
        {root:"Sikayet orani yuksek",count:alerts.filter(a=>a.type==="HIGH_COMPLAINT_RATE").length,trend:"+%12",risk:"Yuksek",fix:"Mudur aramasi + kok neden kaydi"},
        {root:"Ortalama ticket dusuk",count:alerts.filter(a=>a.type==="LOW_AVERAGE_TICKET").length,trend:"-%4",risk:"Orta",fix:"Paket anlatim scripti"},
        {root:"Lead donusumu dustu",count:alerts.filter(a=>a.type==="MARKETING_CONVERSION_DROP").length,trend:"+%8",risk:"Orta",fix:"Kanal ve fiyat itirazi analizi"}
      ],
      tickets: alerts.slice(0,6).map(a=>({id:a.id,title:a.title,branch:a.branchName,severity:a.severity==="critical"?"Yuksek":"Orta",sla:a.severity==="critical"?"3 saat":"24 saat",owner:a.type.includes("ROYALTY")?"Finans":a.type.includes("COMPLAINT")?"Musteri Deneyimi":"Operasyon"})),
      ceoDashboard:{
        network,
        kpis:[
          {label:"Bugunku Ekspertiz",value:String(network.todayCars),change:"+%4.8",direction:"up",icon:"car-front",tone:"good",hint:"10 sube demo"},
          {label:"Bugunku Ciro",value:formatShortTL(network.todayRevenue),change:"+%6.2",direction:"up",icon:"banknote",tone:"good",hint:"gunluk"},
          {label:"Arac Basi Ortalama Gelir",value:formatTL(network.avgTicket),change:"hedef bandi",direction:"up",icon:"receipt",tone:"info",hint:"ticket"},
          {label:"Aktif Sube",value:`${network.activeBranches}/${network.branchCount}`,change:"tam ag",direction:"up",icon:"building-2",tone:"good",hint:"demo evren"},
          {label:"Memnuniyet",value:`${network.avgSatisfaction}/5`,change:network.avgSatisfaction<4.5?"risk":"iyi",direction:network.avgSatisfaction<4.5?"down":"up",icon:"smile",tone:network.avgSatisfaction<4.5?"warn":"good",hint:"30 gun"},
          {label:"Acik Sikayet",value:String(network.openComplaints),change:`${alerts.filter(a=>a.type==="HIGH_COMPLAINT_RATE").length} alarm`,direction:"down",icon:"message-circle-warning",tone:"warn",hint:"aylik"},
          {label:"Bugunku Lead",value:String(network.todayLeads),change:"+%9",direction:"up",icon:"user-plus",tone:"good",hint:"pazarlama"},
          {label:"Royalty Sagligi",value:summary.delayedRoyalty ? "Risk var" : "Stabil",change:summary.delayedRoyalty ? formatTL(summary.delayedRoyalty) : "Sorun yok",direction:summary.delayedRoyalty ? "down" : "up",icon:"shield-check",tone:summary.delayedRoyalty ? "warn" : "good",hint:"otomatik cekim"}
        ],
        alerts: alerts.slice(0,7).map(a=>({ severity:a.severity==="critical"?"critical":a.severity==="warning"?"high":"medium", branch:a.branchName, text:a.description, time:"Bugun", route:a.type==="ROYALTY_DELAY"?"finance":a.type.includes("COMPLAINT")||a.type.includes("SATISFACTION")?"crisis":"operations", raw:a })),
        regions: regionsRows,
        bestBranches: best.map(b=>[b.displayName,b.dailyVehicles,b.dailyRevenue,b.satisfaction,b.complaints,b.trustScore,b.status,b.averageTicket]),
        riskyBranches: risk.map(b=>[b.displayName,b.dailyVehicles,b.dailyRevenue,b.satisfaction,b.complaints,b.trustScore,b.status,b.averageTicket]),
        customerExperience:{google:Number((sum(branchRows,"google")/branchRows.length).toFixed(2)),negative24h:alerts.filter(a=>a.type.includes("COMPLAINT")||a.type.includes("SATISFACTION")).length,open:summary.totalComplaints,resolved:42,avgResolution:"4s 10dk",positiveLift:"+0.04 puan",recoveredReviews:8},
        funnel:createFunnel(operations),
        financeSummary:{todayRevenue:summary.totalDailyRevenue,monthRevenue:summary.totalMonthlyRevenue,expectedMonthEnd:money(summary.totalMonthlyRevenue*1.05),royaltyHealth:summary.delayedRoyalty?91.4:99.1,royaltyRiskBranches:branchRows.filter(b=>b.royaltyDelay).length,royaltyBlockedAmount:summary.delayedRoyalty,royaltyStatus:summary.delayedRoyalty?"Royalty gecikme alarmi var":"Finans stabil",topRevenue},
        franchiseSummary:{newApplications:18,inTalks:9,contractStage:3,openingPrep:2,riskyCandidates:1},
        trustFactors:[["Musteri memnuniyeti",Math.round(summary.customerSatisfaction)],["Sikayet orani",clamp(100-summary.totalComplaints*3,40,96)],["Google puani",Math.round((sum(branchRows,"google")/branchRows.length)*20)],["Operasyon hizi",84],["Rapor kalitesi",network.trustScore],["Finansal disiplin",summary.delayedRoyalty?76:94]],
        liveOperations: branchRows.slice().sort((a,b)=>b.dailyVehicles-a.dailyVehicles).slice(0,6).map(b=>({branch:b.displayName,city:b.city,cars:b.dailyVehicles,waiting:Math.max(1,15-b.trustScore/8|0),avgTime:b.id==="BR-009"?"42 dk":"24 dk",sla:b.trustScore,status:b.status,tone:b.trustScore<70?"bad":b.trustScore<82?"warn":"good",owner:b.manager.split(" ")[0]})),
        quickActions:[],
        reviewStream:[
          {score:1,branch:"Antalya Kepez",customer:"Bekleme ve rapor anlatimi konusunda tekrar aranmak istiyorum.",tone:"bad",age:"18 dk"},
          {score:2,branch:"Bursa Nilufer",customer:"Eski hizmet kalitesi daha iyiydi, sure uzadi.",tone:"warn",age:"44 dk"},
          {score:5,branch:"Istanbul Kadikoy",customer:"Paket anlatimi netti, rapor cok profesyoneldi.",tone:"good",age:"1 sa"},
          {score:5,branch:"Izmir Karsiyaka",customer:"Premium ekspertiz fiyatini hak etti.",tone:"good",age:"2 sa"}
        ],
        managementPulse:[
          {label:"Kritik alarm",value:summary.criticalAlerts,tone:summary.criticalAlerts?"bad":"good",note:"Rol filtresine gore degisir"},
          {label:"Geciken royalty",value:formatTL(summary.delayedRoyalty),tone:summary.delayedRoyalty?"warn":"good",note:"Sadece sorun varsa alarm"},
          {label:"Ortalama ticket",value:formatTL(summary.averageTicket),tone:"good",note:"8.900-9.500 TL bandi hedef"},
          {label:"En riskli sube",value:risk[0]?.displayName || "-",tone:"bad",note:risk[0]?.status || "-"}
        ],
        actionTasks:[
          {id:"ACT-1001",title:"Antalya sikayet kurtarma plani",category:"Musteri Deneyimi",owner:"Canan Aydin",branch:"Antalya Kepez",deadline:"Bugun 15:00",status:"Acik",priority:"Kritik",note:"Sikayet orani kritik esigi asti."},
          {id:"ACT-1002",title:"Bursa hedef alti performans",category:"Operasyon",owner:"Kadir Basaran",branch:"Bursa Nilufer",deadline:"48 saat",status:"Acik",priority:"Yuksek",note:"Arac ve ciro hedefi geride."},
          {id:"ACT-1003",title:"Antalya royalty otomatik cekim",category:"Finans",owner:"Finans",branch:"Antalya Kepez",deadline:"Bugun",status:"Gecikti",priority:"Kritik",note:"Kart cekimi 9 gun gecikti."}
        ],
        aiRecommendations:[
          {title:"Antalya icin sikayet kok neden masasi ac",impact:"Memnuniyet kaybini 7 gunde durdurur",risk:"Marka riski yuksek",action:"Kriz plani ac",category:"Musteri Deneyimi"},
          {title:"Bursa hedef alti hacim icin kampanya ve vardiya kontrolu yap",impact:"Aylik arac +%12 toparlanabilir",risk:"Karlilik baskisi orta",action:"Duzeltme plani ac",category:"Operasyon"},
          {title:"Kadikoy premium paket scriptini ag standardi yap",impact:"Ticket ortalamasi yukselir",risk:"Dusuk",action:"Egitim ata",category:"Academy"}
        ]
      }
    };
  }

  function createFunnel(operations){
    const leads = sum(latestRows(operations),"leads");
    const appointments = sum(latestRows(operations),"appointmentLead");
    const sales = sum(latestRows(operations),"salesLead");
    return [
      {stage:"Reklam lead",count:leads,rate:100},
      {stage:"WhatsApp gorusme",count:Math.round(leads*.72),rate:72},
      {stage:"Randevu",count:appointments,rate:Math.round(appointments/leads*100)},
      {stage:"Subeye gelen",count:Math.round(appointments*.82),rate:82},
      {stage:"Satisa donen",count:sales,rate:Math.round(sales/Math.max(1,appointments)*100)}
    ];
  }

  function formatTL(n){ return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n); }
  function formatShortTL(n){ return n >= 1000000 ? `₺${(n/1000000).toFixed(2).replace(".",",")}M` : formatTL(n); }

  function createDemoModel(){
    const dashboardSeed = buildDashboardSeed();
    const services = {
      getVisibleBranches(role, regionId, branchId){ return roleFilter(dashboardSeed.branches, role, regionId, branchId); },
      getDashboardSummary(role="CEO", regionId, branchId){
        const visibleIds = new Set(this.getVisibleBranches(role, regionId, branchId).map(b=>b.id));
        const rows = dashboardSeed.operations.filter(x=>visibleIds.has(x.branchId));
        const alerts = dashboardSeed.riskAlerts.filter(x=>visibleIds.has(x.branchId));
        return summarizeRows(rows, dashboardSeed.kpiTargets, alerts);
      },
      getBranchPerformance(role="CEO", regionId, branchId){
        const visible = this.getVisibleBranches(role, regionId, branchId).map(b=>b.id);
        return dashboardSeed.ceoDashboard.bestBranches.concat(dashboardSeed.ceoDashboard.riskyBranches).filter((row, index, arr)=>arr.findIndex(x=>x[0]===row[0])===index).filter(row=>visible.includes(dashboardSeed.branches.find(b=>b.name===row[0])?.id));
      },
      getRegionPerformance(role="CEO", regionId){ return role && String(role).toUpperCase().includes("BOLGE") ? dashboardSeed.ceoDashboard.regions.filter(r=>r.regionId===regionId) : dashboardSeed.ceoDashboard.regions; },
      getRevenueTrend(role="CEO", regionId, branchId){ return dashboardSeed.financeHistory; },
      getPackageDistribution(role="CEO", regionId, branchId){
        const rows = roleFilter(dashboardSeed.operations, role, regionId, branchId);
        return packages.map(p=>({packageId:p.id,name:p.name,price:p.price,count:sum(rows,x=>sum(x.packageSales.filter(s=>s.packageId===p.id),"count"))}));
      },
      getRoyaltyStatus(role="CEO", regionId, branchId){ return this.getDashboardSummary(role, regionId, branchId); },
      getComplaintSummary(role="CEO", regionId, branchId){ return dashboardSeed.complaints; },
      getMarketingSummary(role="CEO", regionId, branchId){
        const rows = roleFilter(dashboardSeed.operations, role, regionId, branchId);
        return {leads:sum(rows,"leads"),conversionRate:Math.round(sum(rows,"salesLead")/Math.max(1,sum(rows,"leads"))*100),adCost:sum(rows,"adCost"),cpl:Math.round(sum(rows,"adCost")/Math.max(1,sum(rows,"leads")))};
      },
      getRiskAlerts(role="CEO", regionId, branchId){
        const visibleIds = new Set(this.getVisibleBranches(role, regionId, branchId).map(b=>b.id));
        return dashboardSeed.riskAlerts.filter(a=>visibleIds.has(a.branchId));
      }
    };
    return { packages, branches:branchProfiles, users, regions, dashboardSeed, services };
  }

  const api = { createDemoModel };
  global.OTOTR_DEMO_DATA = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
