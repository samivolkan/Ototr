const state = {
  data: null,
  route: "dashboard",
  selectedBranch: "BR-001",
  selectedLead: "LD-2401",
  selectedCustomer: "CU-1001"
};

const pages = {
  dashboard: "Genel Merkez Dashboard",
  operations: "Operasyon Yönetimi",
  branches: "Şubeler",
  franchise: "Franchise Yönetimi",
  crm: "CRM & Satış",
  experience: "Müşteri Deneyimi",
  finance: "Finans Merkezi",
  hr: "İnsan Kaynakları",
  marketing: "Pazarlama Merkezi",
  reporting: "Raporlama Merkezi",
  system: "Sistem Yönetimi",
  intelligence: "İş Zekası",
  appointments: "Randevular",
  branches: "Şubeler",
  branch: "Şube Profili",
  lead: "Aday Değerlendirme",
  customers: "Müşteriler",
  customer: "Müşteri 360",
  vehicles: "Araçlar",
  reports: "Raporlar",
  complaints: "Şikayet Merkezi",
  reputation: "Google İtibar",
  whatsapp: "WhatsApp CRM",
  alerts: "CEO Alarm Zekası",
  legal: "Hukuk",
  support: "Destek Talepleri",
  academy: "Eğitim Merkezi",
  rooms: "Karar Odaları",
  roles: "Rol ve Yetki",
  settings: "Ayarlar",
  schema: "Veritabanı Şeması"
};

const nav = [
  ["Ana Navigasyon", [
    ["dashboard","Genel Merkez Dashboard"],
    ["operations","Operasyon Yönetimi"],
    ["branches","Şubeler"],
    ["franchise","Franchise Yönetimi"],
    ["crm","CRM & Satış"],
    ["experience","Müşteri Deneyimi"],
    ["finance","Finans Merkezi"],
    ["hr","İnsan Kaynakları"],
    ["marketing","Pazarlama Merkezi"],
    ["reporting","Raporlama Merkezi"],
    ["system","Sistem Yönetimi"]
  ]]
];

const $ = sel => document.querySelector(sel);
const money = n => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n || 0);
const num = n => new Intl.NumberFormat("tr-TR").format(n || 0);

function badge(text){
  const cls = ["Aktif","Düşük","Low","Kapalı","Tamamlandı","Resolved","Closed","On Track","Approved"].includes(text) ? "b-green" : ["Yüksek","High","Critical","Riskli","Kritik","Breached"].includes(text) ? "b-red" : ["Orta","Medium","Açılış","Bekliyor","At Risk","Pending verification"].includes(text) ? "b-amber" : "b-blue";
  return `<span class="badge ${cls}">${text}</span>`;
}
function stat(label,value,trend,color=""){
  return `<div class="card stat ${color}"><div class="label">${label}</div><div class="value">${value}</div><div class="trend">${trend}</div></div>`;
}
async function api(path, options){
  const res = await fetch(path, {headers: {"Content-Type":"application/json"}, ...options});
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const type = res.headers.get("content-type") || "";
  return type.includes("json") ? res.json() : res.text();
}
async function load(){
  $("#apiState").textContent = "API bağlanıyor";
  state.data = await api("/api/bootstrap");
  $("#apiState").textContent = "API bağlı";
  renderTicker();
  renderNav();
  bindHeaderControls();
  go(location.hash.replace("#","") || "dashboard", false);
}
function bindHeaderControls(){
  const branchFilter = $("#branchFilter");
  if(branchFilter && state.data){
    branchFilter.innerHTML = `<option value="">Tüm Şubeler</option>${safeRows(state.data.branches).map(b=>`<option value="${b.id}">${b.name}</option>`).join("")}`;
    branchFilter.onchange = () => {
      if(branchFilter.value){
        state.selectedBranch = branchFilter.value;
        go("branch");
      } else if(state.route === "branch"){
        go("dashboard");
      }
    };
  }
  const search = $("#globalSearch");
  if(search && !search.dataset.bound){
    search.dataset.bound = "true";
    search.addEventListener("keydown", e => {
      if(e.key !== "Enter") return;
      const q = search.value.trim().toLowerCase();
      if(!q) return;
      const foundBranch = safeRows(state.data.branches).find(b => [b.name,b.city,b.manager,b.region].some(v => String(v || "").toLowerCase().includes(q)));
      const foundCustomer = safeRows(state.data.customers).find(c => [c.name,c.phone,c.city,c.type].some(v => String(v || "").toLowerCase().includes(q)));
      const foundVehicle = safeRows(state.data.vehicles).find(v => [v.plate,v.brand,v.model].some(x => String(x || "").toLowerCase().includes(q)));
      if(foundBranch){ state.selectedBranch = foundBranch.id; go("branch"); return; }
      if(foundCustomer){ state.selectedCustomer = foundCustomer.id; go("customer"); return; }
      if(foundVehicle){ state.selectedBranch = foundVehicle.branchId; go("vehicles"); return; }
      openModal("Global Arama", `<p class="muted">“${search.value.trim()}” için eşleşme bulunamadı. Müşteri, plaka, şube, personel veya bayi adını deneyebilirsin.</p>`);
    });
  }
}
function renderNav(){
  $("#nav").innerHTML = nav.map(([group,items]) => `<div class="nav-group">${group}</div>${items.map(([id,label]) => `<button class="nav-btn" data-nav="${id}">${label}</button>`).join("")}`).join("");
  document.querySelectorAll("[data-nav]").forEach(btn => btn.onclick = () => go(btn.dataset.nav));
}
function go(route, push=true){
  state.route = route;
  $("#pageTitle").textContent = pages[route] || route;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === route));
  const branchFilter = $("#branchFilter");
  if(branchFilter) branchFilter.value = route === "branch" ? state.selectedBranch : "";
  if(push) history.replaceState(null,"",`#${route}`);
  render();
}
function render(){
  const map = {
    dashboard: renderDashboard,
    intelligence: renderIntelligence,
    appointments: renderAppointments,
    rooms: renderRooms,
    branches: renderBranches,
    branch: renderBranchProfile,
    franchise: renderFranchise,
    lead: renderLeadProfile,
    crm: renderCrm,
    experience: renderCustomerExperience,
    customers: renderCustomers,
    customer: renderCustomerProfile,
    vehicles: renderVehicles,
    operations: renderOperations,
    reports: renderReportsPage,
    finance: renderFinance,
    hr: renderHr,
    marketing: renderMarketing,
    reporting: renderReportingCenter,
    complaints: renderComplaints,
    reputation: renderReputation,
    whatsapp: renderWhatsapp,
    alerts: renderAlerts,
    legal: renderLegal,
    support: renderSupport,
    academy: renderAcademy,
    roles: renderRoles,
    settings: renderSettings,
    system: renderSystemManagement,
    schema: renderSchema
  };
  $("#view").innerHTML = (map[state.route] || renderDashboard)();
  bindView();
}
function bindView(){
  document.querySelectorAll("[data-branch]").forEach(el => el.onclick = () => { state.selectedBranch = el.dataset.branch; go("branch"); });
  document.querySelectorAll("[data-lead]").forEach(el => el.onclick = () => { state.selectedLead = el.dataset.lead; go("lead"); });
  document.querySelectorAll("[data-customer]").forEach(el => el.onclick = () => { state.selectedCustomer = el.dataset.customer; go("customer"); });
  document.querySelectorAll("[data-room]").forEach(el => el.onclick = () => showRoom(el.dataset.room));
}
function branch(id){ return state.data.branches.find(b => b.id === id); }
function lead(id){ return state.data.leads.find(l => l.id === id); }
function customer(id){ return state.data.customers.find(c => c.id === id); }
function metrics(id){ return state.data.branchMetrics[id] || {}; }
function leadScore(id){ return state.data.leadScores[id] || {}; }
function branchName(id){ return branch(id)?.name || id; }
function customerName(id){ return customer(id)?.name || id; }
function pct(n){ return `%${Math.round(n || 0)}`; }
function avg(rows, key){ return rows.length ? rows.reduce((s,r)=>s + Number(r[key] || 0),0) / rows.length : 0; }
function safeRows(rows){ return Array.isArray(rows) ? rows : []; }
function avgRating(rows){ return rows.length ? rows.reduce((s,r)=>s + Number(r.averageRating || r.rating || 0),0) / rows.length : 0; }
function minutes(n){ return `${Math.round(n || 0)} dk`; }
function barChart(rows, key="value"){
  const max = Math.max(...rows.map(r=>Number(r[key] || 0)), 1);
  return `<div class="bar-chart">${rows.map(r=>`<div class="bar-row"><span>${r.label}</span><div class="bar-track"><i style="width:${Math.max(4, (Number(r[key] || 0) / max) * 100)}%"></i></div><b>${num(r[key])}</b></div>`).join("")}</div>`;
}
function lineChart(values){
  const width = 520, height = 150, pad = 18;
  const max = Math.max(...values), min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const pts = values.map((v,i)=>{
    const x = pad + (i * (width - pad * 2) / Math.max(values.length - 1, 1));
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Trend grafiği"><polyline points="${pts}" fill="none" stroke="#d71920" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polygon points="${pad},${height-pad} ${pts} ${width-pad},${height-pad}" fill="rgba(215,25,32,.08)"/></svg>`;
}
function scorePill(label, value){
  const cls = value >= 85 ? "good" : value >= 70 ? "warn" : "risk";
  return `<div class="score-pill ${cls}"><span>${label}</span><b>${pct(value)}</b></div>`;
}
function simpleTable(headers, rows){
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function severityTone(value){
  const v = String(value || "").toLowerCase();
  if(["critical","high","kırmızı","yüksek","breached"].some(x=>v.includes(x))) return "red";
  if(["medium","orta","at risk","pending"].some(x=>v.includes(x))) return "amber";
  if(["low","resolved","closed","approved"].some(x=>v.includes(x))) return "green";
  return "blue";
}
function renderTicker(){
  const el = $("#tickerItems");
  if(!el || !state.data) return;
  const alerts = safeRows(state.data.executiveAlerts);
  const complaints = safeRows(state.data.complaints);
  const reviews = safeRows(state.data.googleReviews);
  const whatsapp = safeRows(state.data.whatsappConversations);
  const branches = safeRows(state.data.branches);
  const totalRevenue = branches.reduce((s,b)=>s + Number(b.revenue || 0),0);
  const worstAlert = alerts.find(a=>["Critical","High"].includes(a.severity)) || alerts[0];
  const slowChat = whatsapp.slice().sort((a,b)=>Number(b.firstReplyMinutes||0)-Number(a.firstReplyMinutes||0))[0];
  const recoveredReview = reviews.find(r=>Number(r.previousRating || 0) < Number(r.rating || 0));
  const items = [
    {tone:"up", label:"Ağ ciro", value:`${money(totalRevenue)} · ${branches.length} şube`},
    {tone:"risk", label:"CEO alarm", value:worstAlert ? `${branchName(worstAlert.branchId)} · ${worstAlert.message}` : "Aktif kritik alarm yok"},
    {tone:"warn", label:"Şikayet SLA", value:`${complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length} dosya takipte`},
    {tone:"info", label:"WhatsApp", value:slowChat ? `${branchName(slowChat.branchId)} · ilk yanıt ${minutes(slowChat.firstReplyMinutes)}` : "SLA temiz"},
    {tone:"up", label:"Google recovery", value:recoveredReview ? `${branchName(recoveredReview.branchId)} · ${recoveredReview.previousRating} yıldızdan ${recoveredReview.rating} yıldıza` : "Yeni recovery bekleniyor"},
    {tone:"warn", label:"Royalty", value:`${branches.filter(b=>Number(b.royaltyOverdue || 0) > 0).length} bayi ödeme takibinde`}
  ];
  el.innerHTML = items.concat(items).map(i=>`<span class="ticker-item"><span class="${i.tone}">●</span>${i.label} — <b>${i.value}</b></span>`).join("");
}
function signalCard(title, detail, tone="blue", action="İncele", onClick="go('alerts')"){
  return `<div class="signal"><div class="signal-dot ${tone}"></div><div class="signal-main"><b>${title}</b><span>${detail}</span></div><div class="signal-action"><button class="btn small" onclick="${onClick}">${action}</button></div></div>`;
}
function dashboardAlertSignals(alerts){
  const priority = alerts.slice().sort((a,b)=>{
    const order = {Critical:0, High:1, Medium:2, Low:3};
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  }).slice(0,4);
  return `<div class="signal-list">${priority.map(a=>signalCard(`${a.severity} · ${a.type}`, `${branchName(a.branchId)} · ${a.message} · Eşik: ${a.threshold}`, severityTone(a.severity), "Şube", `state.selectedBranch='${a.branchId}';go('branch')`)).join("")}</div>`;
}
function liveActivityFeed(){
  const reports = safeRows(state.data.reports);
  const appointments = safeRows(state.data.appointments);
  const complaints = safeRows(state.data.complaints);
  const reviews = safeRows(state.data.googleReviews);
  const whatsapp = safeRows(state.data.whatsappConversations);
  const items = [
    reports[0] && signalCard("Rapor tamamlandı", `${reports[0].plate} · ${reports[0].model} · ${branchName(reports[0].branchId)} · Skor ${reports[0].score}/10`, "green", "Raporlar", "go('reports')"),
    whatsapp[0] && signalCard("WhatsApp lead yakalandı", `${whatsapp[0].phone} · ${whatsapp[0].stage} · ${whatsapp[0].tags.join(", ")}`, severityTone(Number(whatsapp[0].firstReplyMinutes || 0) > 15 ? "High" : "Low"), "Inbox", "go('whatsapp')"),
    appointments[0] && signalCard("Yeni randevu akışı", `${appointments[0].customerName || appointments[0].customerId} · ${appointments[0].vehicle} · ${branchName(appointments[0].branchId)}`, "blue", "Takvim", "go('appointments')"),
    reviews[0] && signalCard("Google yorum sinyali", `${reviews[0].reviewer} · ${reviews[0].rating}/5 · ${branchName(reviews[0].branchId)} · ${reviews[0].status}`, severityTone(reviews[0].rating <= 2 ? "High" : "Low"), "İtibar", "go('reputation')"),
    complaints[0] && signalCard("Şikayet dosyası açıldı", `${complaints[0].category} · ${complaints[0].priority} · ${branchName(complaints[0].branchId)} · ${complaints[0].stage}`, severityTone(complaints[0].priority), "Dosya", "go('complaints')")
  ].filter(Boolean);
  return `<div class="signal-list">${items.join("")}</div>`;
}
function alertRulesGrid(){
  const rules = [
    ["Google puanı 4.2 altı", "Şube rating düşerse CEO, itibar ve bölge müdürü aynı anda uyarılır.", "red"],
    ["Şikayet artışı +%30", "Kategori bazlı ani artış algılanır; kalite denetimi otomatik açılır.", "amber"],
    ["WhatsApp SLA 15 dakika", "Cevapsız lead sayısı ve ilk yanıt süresi şube bazlı ölçülür.", "blue"],
    ["Ciro hedef altı", "Aylık gerçekleşme %85 altına inerse finans + pazarlama aksiyonu oluşur.", "amber"],
    ["Royalty gecikmesi", "Vade sonrası otomatik hatırlatma, eskalasyon ve hukuk notu tutulur.", "red"],
    ["Rapor hata artışı", "Teknik itiraz, revize ve kalite puanı birlikte izlenir.", "green"]
  ];
  return `<div class="rule-grid">${rules.map(r=>`<div class="rule-card ${r[2]}"><b>${r[0]}</b><span>${r[1]}</span></div>`).join("")}</div>`;
}
function miniSpark(values, tone="red"){
  const nums = values && values.length ? values.map(v=>Number(v || 0)) : [4,6,5,8,7,10];
  const width = 118, height = 34, pad = 3;
  const max = Math.max(...nums), min = Math.min(...nums), span = Math.max(max - min, 1);
  const pts = nums.map((v,i)=>{
    const x = pad + (i * (width - pad * 2) / Math.max(nums.length - 1, 1));
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return `<svg class="mini-spark ${tone}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function executiveStat(label, value, trend, tone="red", spark=[2,4,3,5,6,8]){
  return `<div class="exec-stat ${tone}"><div><span>${label}</span><b>${value}</b><small>${trend}</small></div>${miniSpark(spark, tone)}</div>`;
}
function packageDonut(){
  const rows = [
    ["Full Paket","%38","blue","₺1.500"],
    ["Standart","%48","red","₺950"],
    ["Mini","%10","amber","₺600"],
    ["EV Full","%4","green","₺1.700"]
  ];
  return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="40" class="donut-blue" stroke-dasharray="95 251" stroke-dashoffset="0"/>
    <circle cx="60" cy="60" r="40" class="donut-red" stroke-dasharray="120 251" stroke-dashoffset="-95"/>
    <circle cx="60" cy="60" r="40" class="donut-amber" stroke-dasharray="25 251" stroke-dashoffset="-215"/>
    <circle cx="60" cy="60" r="40" class="donut-green" stroke-dasharray="11 251" stroke-dashoffset="-240"/>
    <text x="60" y="56" text-anchor="middle">1.284</text><text x="60" y="70" text-anchor="middle" class="sub">araç/ay</text>
  </svg><div class="donut-legend">${rows.map(r=>`<div><i class="${r[2]}"></i><span>${r[0]} <small>${r[3]}</small></span><b>${r[1]}</b></div>`).join("")}</div></div>`;
}
function branchPerformanceBoard(branches){
  const active = branches.slice(0,5);
  const maxRevenue = Math.max(...active.map(b=>Number(b.revenue || 0)), 1);
  return `<div class="table-wrap compact"><table><thead><tr><th>Şube</th><th>Bugün</th><th>Ciro</th><th>Kalite</th><th>Google</th><th>WA SLA</th><th>Durum</th></tr></thead><tbody>${active.map((b,i)=>{
    const m = metrics(b.id);
    const rep = safeRows(state.data.reputationScores).find(r=>r.branchId===b.id);
    const wa = safeRows(state.data.whatsappConversations).filter(w=>w.branchId===b.id);
    const fallbackReply = [8,12,22,14,18][i] || 20;
    const firstReply = wa.length ? Math.round(avg(wa,"firstReplyMinutes")) : fallbackReply;
    const today = b.status === "Aktif" ? Math.max(0, Math.round((Number(b.reports || 0) / 26) * (0.85 + i * 0.04))) : 0;
    const health = Math.round((Number(b.qualityScore || 0) + Number(m.sla || b.qualityScore || 0) + Number(b.nps || 70)) / 3);
    const tone = firstReply > 15 ? "amber" : health >= 88 ? "green" : health >= 76 ? "amber" : "red";
    return `<tr data-branch="${b.id}"><td><div class="person"><div class="avatar">${b.city.slice(0,2).toUpperCase()}</div><div><b>${b.name}</b><br><span class="muted">${b.manager}</span></div></div></td><td><b>${today}</b></td><td><div class="money-cell"><b>${money(b.revenue)}</b><span style="width:${Math.max(4, Number(b.revenue || 0)/maxRevenue*100)}%"></span></div></td><td>${pct(health)}</td><td>${rep ? rep.averageRating.toFixed(2) : b.googleScore || "-"}</td><td>${badge(firstReply > 15 ? `${firstReply} dk` : `${firstReply} dk`)}</td><td><span class="health ${tone}"></span>${badge(tone==="green" ? "İyi" : tone==="amber" ? "Takip" : "Müdahale")}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function trustKpis({todayComplaints, avgResolution, ratingAvg, recovered, waLeadsToday, waConversion, slaBreaches, riskBranches}){
  return `<div class="trust-kpis">${[
    ["Bugünkü Şikayet", todayComplaints, "Bugün açılan"],
    ["Ortalama Çözüm", avgResolution, "Çözüm ritmi"],
    ["Google Ort.", ratingAvg, "Ağ ortalaması"],
    ["Kurtarılan Yorum", recovered, "Bu ay"],
    ["WhatsApp Lead", waLeadsToday, "Yeni numara"],
    ["WA Dönüşüm", pct(waConversion), "Randevu + satış"],
    ["SLA İhlali", slaBreaches, "Şikayet + WA"],
    ["Riskli İtibar", riskBranches, "CEO takip"]
  ].map((k,i)=>`<div class="trust-kpi ${i===6||i===7?"warn":""}"><span>${k[0]}</span><b>${k[1]}</b><small>${k[2]}</small></div>`).join("")}</div>`;
}
function ceoKpiCards({todayVehicles, todayRevenue, activeBranches, ratingAvg, openComplaints, franchiseIncome}){
  const cards = [
    ["Bugünkü Toplam Araç", todayVehicles, "Ağ genelinde tamamlanan", "red", [18,22,20,24,28,31]],
    ["Bugünkü Ciro", money(todayRevenue), "Günlük kasa ritmi", "green", [40,48,46,52,58,64]],
    ["Aktif Şube Sayısı", activeBranches, "Canlı operasyonda", "blue", [4,4,5,5,6,6]],
    ["Ortalama Yorum Puanı", ratingAvg, "Google ağ ortalaması", "amber", [4.2,4.3,4.4,4.5,4.52,4.57]],
    ["Açık Şikayet Sayısı", openComplaints, "SLA takibinde", "red", [1,2,2,3,4,4]],
    ["Bu Ay Franchise Geliri", money(franchiseIncome), "Royalty + merkez payı", "green", [82,86,91,96,102,111]]
  ];
  return `<div class="ceo-kpi-grid">${cards.map(c=>executiveStat(c[0],c[1],c[2],c[3],c[4])).join("")}</div>`;
}
function branchOperationRows(branches){
  const ops = safeRows(state.data.operations);
  const active = branches.filter(b=>b.status==="Aktif").slice(0,6);
  return simpleTable(["Şube","Araç","Bekleyen","Ortalama Süre"], active.map((b,i)=>{
    const m = metrics(b.id);
    const today = Math.max(0, Math.round((Number(b.reports || 0) / 26) * (0.84 + i * 0.04)));
    const waiting = ops.filter(o=>o.branchId===b.id && o.status!=="Tamamlandı").length + (i % 3);
    const avgTime = m.averageWait || `${18 + i * 4} dk`;
    return `<tr data-branch="${b.id}"><td><b>${b.name}</b><br><span class="muted">${b.city} / ${b.manager}</span></td><td>${today}</td><td>${waiting}</td><td>${avgTime}</td></tr>`;
  }));
}
function turkeyOperationMap(branches){
  const positions = {
    "Bursa": [28,60], "İstanbul": [24,49], "Kocaeli": [31,52], "Ankara": [50,50], "İzmir": [20,71], "Antalya": [42,83], "Samsun": [63,35]
  };
  const active = branches.filter(b=>b.status==="Aktif").slice(0,7);
  const maxReports = Math.max(...active.map(b=>Number(b.reports || 0)), 1);
  return `<div class="turkey-card"><div class="map-copy"><b>Türkiye Haritası</b><span>Şube yoğunlukları, günlük araç hacmine göre renklenir.</span></div><div class="turkey-map" aria-label="Türkiye şube yoğunluğu haritası">${active.map((b,i)=>{
    const pos = positions[b.city] || [30 + i * 9, 52 + (i % 2) * 14];
    const density = Math.max(28, Number(b.reports || 0) / maxReports * 100);
    const tone = density > 78 ? "hot" : density > 55 ? "warm" : "calm";
    return `<button class="map-point ${tone}" style="left:${pos[0]}%;top:${pos[1]}%;--size:${18 + density/7}px" data-branch="${b.id}" title="${b.name}"><span>${b.city.slice(0,2).toUpperCase()}</span></button>`;
  }).join("")}</div></div>`;
}
function criticalAlertCenter({alerts, complaints, reviews, whatsapp, branches, leads}){
  const underThree = reviews.find(r=>Number(r.rating || 0) < 3);
  const slowWhatsapp = whatsapp.find(w=>Number(w.firstReplyMinutes || 0) > 15);
  const delayedOperation = safeRows(state.data.operations).find(o=>["Yüksek","High"].includes(o.delayRisk));
  const royaltyLate = branches.find(b=>Number(b.royaltyOverdue || 0) > 0) || branches.find(b=>Number(b.revenue || 0) < 800000);
  const hrRisk = safeRows(state.data.staff).find(s=>Number(s.errorRate || 0) > 3 || Number(s.productivity || 100) < 75);
  const waitingLead = leads.find(l=>["Yeni Lead","Ön Görüşme","Yatırımcı Sunumu"].includes(l.stage));
  const items = [
    ["3 yıldız altı yorum geldi", underThree ? `${branchName(underThree.branchId)} · ${underThree.rating}/5 · ${underThree.reviewer}` : "Yeni negatif yorum yok", "reputation"],
    ["Şube SLA aştı", slowWhatsapp ? `${branchName(slowWhatsapp.branchId)} · WhatsApp ilk yanıt ${minutes(slowWhatsapp.firstReplyMinutes)}` : `${complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length} şikayet SLA izlemede`, "alerts"],
    ["Ekspertiz süresi uzadı", delayedOperation ? `${branchName(delayedOperation.branchId)} · ${delayedOperation.vehicle} · ${delayedOperation.eta}` : "Canlı kuyruk normal", "operations"],
    ["Tahsilat gecikti", royaltyLate ? `${royaltyLate.name} · royalty/ciro takibi` : "Gecikmiş tahsilat yok", "finance"],
    ["Personel devamsızlığı var", hrRisk ? `${hrRisk.name} · ${branchName(hrRisk.branchId)} · verim ${pct(hrRisk.productivity)}` : "Personel riski yok", "hr"],
    ["Franchise adayı bekliyor", waitingLead ? `${waitingLead.name} · ${waitingLead.city} · ${waitingLead.stage}` : "Bekleyen aday yok", "franchise"]
  ];
  return `<div class="critical-center"><div class="critical-head"><div><b>Kritik Uyarı Merkezi</b><span>Dashboard sadece alarm verir; çözüm ilgili modülde açılır.</span></div><button class="btn ghost-dark" onclick="go('alerts')">Alarm Merkezi</button></div><div class="critical-grid">${items.map((i,idx)=>`<button class="critical-item ${idx<3?"red":"amber"}" onclick="go('${i[2]}')"><span>${i[0]}</span><b>${i[1]}</b></button>`).join("")}</div></div>`;
}
function reviewSatisfactionPanel(reviews, scores){
  const trend = scores.length ? scores.map(s=>Number(s.averageRating || 4.4)) : [4.3,4.35,4.42,4.48,4.52,4.57];
  const latest = reviews.slice(0,4);
  return `<div class="grid g2 dashboard-row"><div class="card"><div class="card-head"><div><div class="card-title">Google Yorum Trend Grafiği</div><div class="card-sub">Memnuniyet ve itibar yönü tek trendte izlenir.</div></div><button class="btn" onclick="go('reputation')">İtibar</button></div>${lineChart(trend)}</div><div class="card"><div class="card-head"><div><div class="card-title">Son Yorumlar</div><div class="card-sub">Olumlu, nötr ve negatif yorumlar hızlı aksiyona bağlanır.</div></div></div><div class="review-list">${latest.map(r=>{
    const mood = Number(r.rating || 0) >= 4 ? "olumlu" : Number(r.rating || 0) === 3 ? "nötr" : "negatif";
    return `<div class="review-item ${mood}"><div><b>${r.reviewer} · ${r.rating}/5</b><span>${branchName(r.branchId)} · ${r.text}</span></div><div class="review-actions"><button class="btn small" onclick="go('reputation')">Yanıtla</button><button class="btn small" onclick="go('branches')">Şubeye gönder</button><button class="btn small" onclick="go('crm')">CRM’e aktar</button></div></div>`;
  }).join("")}</div></div></div>`;
}
function salesFunnelPanel(){
  const raw = safeRows((state.data.businessIntelligence || {}).funnel);
  const lead = raw.find(r=>/lead/i.test(r.label))?.value || safeRows(state.data.marketingCampaigns).reduce((s,c)=>s+Number(c.leads||0),0);
  const appointment = raw.find(r=>/randevu/i.test(r.label))?.value || safeRows(state.data.appointments).length;
  const arrived = raw.find(r=>/geldi/i.test(r.label))?.value || Math.round(appointment * .78);
  const sale = raw.find(r=>/sat/i.test(r.label))?.value || Math.round(arrived * .64);
  const stages = [
    ["Reklam Lead", lead],
    ["WhatsApp", Math.round(lead * .68)],
    ["Randevu", appointment],
    ["Geldi", arrived],
    ["Satış", sale]
  ];
  const max = Math.max(...stages.map(s=>Number(s[1] || 0)), 1);
  return `<div class="card"><div class="card-head"><div><div class="card-title">Satış Paneli</div><div class="card-sub">Lead Funnel: Reklam Lead → WhatsApp → Randevu → Geldi → Satış.</div></div><button class="btn" onclick="go('crm')">CRM & Satış</button></div><div class="funnel-board">${stages.map((s,i)=>`<div class="funnel-stage" style="--w:${Math.max(18, Number(s[1] || 0)/max*100)}%"><span>${s[0]}</span><b>${num(s[1])}</b><i></i>${i<stages.length-1?`<em>→</em>`:""}</div>`).join("")}</div></div>`;
}
function financeExecutivePanel(branches){
  const top = branches.slice().sort((a,b)=>Number(b.revenue || 0)-Number(a.revenue || 0)).slice(0,5);
  const totalRoyalty = branches.reduce((s,b)=>s+Number(b.royalty || 0),0);
  const totalRevenue = branches.reduce((s,b)=>s+Number(b.revenue || 0),0);
  return `<div class="grid g2 dashboard-row"><div class="card"><div class="card-head"><div><div class="card-title">Finans Paneli</div><div class="card-sub">Günlük ciro, şube bazlı ciro ve royalty tahsilat oranı.</div></div><button class="btn" onclick="go('finance')">Finans Merkezi</button></div>${lineChart((state.data.businessIntelligence || {}).revenueTrend || [180,192,205,218,235,248])}<div class="finance-strip"><div><span>Royalty tahsilat oranı</span><b>%93</b></div><div><span>Günlük ciro ritmi</span><b>${money(Math.round(totalRevenue/30))}</b></div><div><span>Merkez geliri</span><b>${money(totalRoyalty)}</b></div></div></div><div class="card"><div class="card-title">En Karlı 5 Şube</div>${top.map((b,i)=>`<div class="profit-row" data-branch="${b.id}"><span>${i+1}. ${b.name}</span><b>${money(b.revenue)}</b><i style="width:${Math.max(8, Number(b.revenue || 0)/Number(top[0]?.revenue || 1)*100)}%"></i></div>`).join("")}</div></div>`;
}
function franchiseGrowthPanel(){
  const leads = safeRows(state.data.leads);
  const cityScores = safeRows((state.data.businessIntelligence || {}).cityScores);
  const contract = leads.filter(l=>["Teklif","Sözleşme"].includes(l.stage)).length;
  const opening = safeRows(state.data.branches).filter(b=>b.status!=="Aktif").length;
  const topCity = cityScores.slice().sort((a,b)=>Number(b.demand || 0)-Number(a.demand || 0))[0];
  return `<div class="card"><div class="card-head"><div><div class="card-title">Franchise Büyüme Paneli</div><div class="card-sub">Yeni başvuru, açılacak şube, sözleşme adayı ve şehir fırsatı tek bakışta.</div></div><button class="btn" onclick="go('franchise')">Franchise Yönetimi</button></div><div class="growth-grid"><div><span>Yeni başvuru</span><b>${leads.length}</b></div><div><span>Bu ay açılacak şube</span><b>${opening}</b></div><div><span>Sözleşme aşaması</span><b>${contract}</b></div><div><span>Şehir fırsatı</span><b>${topCity ? topCity.city : "Samsun"}</b></div></div><div class="city-opportunity">${cityScores.slice(0,4).map(c=>`<div><span>${c.city}</span><b>${pct(c.demand)}</b><i style="width:${Math.max(8,c.demand)}%"></i></div>`).join("")}</div></div>`;
}
function quickActionsPanel(){
  const actions = [
    ["Yeni şube ekle","branches"],
    ["Yeni franchise aday ekle","franchise"],
    ["Şikayet aç","complaints"],
    ["Kampanya başlat","marketing"],
    ["Görev ata","rooms"],
    ["Rapor indir","reporting"]
  ];
  return `<aside class="quick-panel"><div class="quick-card"><span class="quick-label">Sağ Yan Hızlı Panel</span><h3>Hızlı İşlemler</h3>${actions.map(a=>`<button class="quick-action" onclick="go('${a[1]}')">${a[0]}<span>›</span></button>`).join("")}</div><div class="quick-card muted-card"><b>Dashboard kuralı</b><p>Gör, karşılaştır, alarm al, karar ver ve derine tıkla. Detay çözümü ilgili modülde yapılır.</p></div></aside>`;
}

function renderDashboard(){
  const branches = safeRows(state.data.branches);
  const activeBranches = branches.filter(b=>b.status==="Aktif");
  const bi = state.data.businessIntelligence || {};
  const totalRevenue = branches.reduce((s,b)=>s+b.revenue,0);
  const royalty = branches.reduce((s,b)=>s+b.royalty,0);
  const reports = branches.reduce((s,b)=>s+b.reports,0);
  const complaints = safeRows(state.data.complaints);
  const reputation = safeRows(state.data.reputationScores);
  const reviews = safeRows(state.data.googleReviews);
  const whatsapp = safeRows(state.data.whatsappConversations);
  const alerts = safeRows(state.data.executiveAlerts);
  const leads = safeRows(state.data.leads);
  const critical = alerts.filter(a=>["High","Critical"].includes(a.severity)).length;
  const todayComplaints = complaints.filter(c=>String(c.createdAt || "").slice(0,10)==="2026-04-28").length;
  const avgResolution = complaints.length ? (complaints.reduce((s,c)=>s+Number(c.resolutionHours||0),0)/complaints.length).toFixed(1)+" saat" : "0 saat";
  const ratingAvg = avgRating(reputation).toFixed(2);
  const recovered = safeRows(state.data.reviewRecoveryRewards).filter(r=>["Approved","Pending verification"].includes(r.rewardStatus)).length;
  const waLeadsToday = whatsapp.filter(w=>w.leadId && String(w.lastMessageAt||"").slice(0,10)==="2026-04-28").length;
  const waConversion = whatsapp.length ? Math.round((whatsapp.filter(w=>["Booked","Won"].includes(w.stage)).length / whatsapp.length) * 100) : 0;
  const slaBreaches = complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length + whatsapp.filter(w=>Number(w.firstReplyMinutes||0)>15).length;
  const riskBranches = reputation.filter(r=>["High","Medium"].includes(r.riskLevel)).length;
  const avgQuality = Math.round(avg(activeBranches,"qualityScore"));
  const activeReportsToday = Math.round(reports / 98);
  const todayRevenue = Math.round(totalRevenue / 30);
  const openComplaints = complaints.filter(c=>!["Resolved","Closed"].includes(c.stage)).length;
  return `<div class="exec-hero"><div><span class="hero-label">OTOTR Genel Merkez Ekranı</span><h2>Yönetim karar kokpiti</h2><p>Bu ekran detay çözme yeri değil; görür, karşılaştırır, alarm alır, karar verir ve ilgili modüle derine indirir.</p><div class="hero-actions"><button class="btn primary" onclick="go('alerts')">Kritik Alarmlar</button><button class="btn ghost-dark" onclick="go('operations')">Canlı Operasyon</button><button class="btn ghost-dark" onclick="go('reporting')">Yönetim Raporu</button></div></div><div class="hero-panel"><b>${activeReportsToday}</b><span>Bugün tamamlanan rapor</span><small>${activeBranches.length} aktif şube · kalite ort. ${pct(avgQuality)} · kritik alarm ${critical}</small></div></div>
  <div class="dashboard-shell"><div class="dashboard-feed">
    ${ceoKpiCards({todayVehicles: activeReportsToday, todayRevenue, activeBranches: activeBranches.length, ratingAvg, openComplaints, franchiseIncome: royalty})}
    <div class="grid g2 dashboard-row"><div class="card"><div class="card-head"><div><div class="card-title">Canlı Operasyon · Türkiye Haritası</div><div class="card-sub">Şube yoğunluğu, aktif saha ritmi ve bölgesel ısı haritası.</div></div><button class="btn" onclick="go('operations')">Operasyon</button></div>${turkeyOperationMap(branches)}</div><div class="card"><div class="card-head"><div><div class="card-title">Canlı Şube Listesi</div><div class="card-sub">Araç, bekleyen ve ortalama süre özeti.</div></div><button class="btn" onclick="go('branches')">Şubeler</button></div>${branchOperationRows(branches)}</div></div>
    ${criticalAlertCenter({alerts, complaints, reviews, whatsapp, branches, leads})}
    ${reviewSatisfactionPanel(reviews, reputation)}
    ${salesFunnelPanel()}
    ${financeExecutivePanel(branches)}
    ${franchiseGrowthPanel()}
    <div class="card trust-band pro-trust"><div class="card-head"><div><div class="card-title">Güven Komuta Merkezi</div><div class="card-sub">Şikayet, Google, WhatsApp ve SLA metrikleri CEO takibi için özetlenir.</div></div><button class="btn" onclick="go('experience')">Müşteri Deneyimi</button></div>${trustKpis({todayComplaints, avgResolution, ratingAvg, recovered, waLeadsToday, waConversion, slaBreaches, riskBranches})}</div>
    <div class="card"><div class="card-head"><div><div class="card-title">Şube Anlık Performans</div><div class="card-sub">Ciro, kalite, Google ve WhatsApp SLA karşılaştırması.</div></div><button class="btn" onclick="go('branches')">Tüm Şubeler</button></div>${branchPerformanceBoard(branches)}</div>
    <div class="grid g2 dashboard-row"><div class="card"><div class="card-head"><div><div class="card-title">Aktif CEO Alarmları</div><div class="card-sub">Müdahale gerektiren riskler öncelik sırasıyla.</div></div><button class="btn" onclick="go('alerts')">Alarm Merkezi</button></div>${dashboardAlertSignals(alerts)}</div><div class="card"><div class="card-head"><div><div class="card-title">Canlı Aktivite Akışı</div><div class="card-sub">Rapor, lead, randevu, yorum ve şikayet olayları tek ritimde izlenir.</div></div><button class="btn" onclick="go('intelligence')">İş Zekası</button></div>${liveActivityFeed()}</div></div>
    <div class="card"><div class="card-head"><div><div class="card-title">Açık Kararlar</div><div class="card-sub">Ana merkez karar kuyruğu</div></div><button class="btn" onclick="go('rooms')">Karar Odaları</button></div>${decisionsList()}</div>
  </div>${quickActionsPanel()}</div>`;
}
function roomsGrid(){
  return `<div class="rooms">${state.data.rooms.map(r => `<div class="tile" data-room="${r.id}"><h3>${r.title}</h3><p>${r.firstMessage}</p><div class="chips"><span class="chip">${r.owner}</span><span class="chip">${r.scope[0]}</span></div></div>`).join("")}</div>`;
}
function decisionsList(){
  return `<div class="mini-list">${state.data.decisions.map(d => {
    const evidence = String(d.evidence || "").trim();
    const hasCleanEvidence = evidence.length > 8 && !/^([a-z])\1{2,}$/i.test(evidence.replace(/\s/g,""));
    const meta = [d.owner, d.status, d.dueDate || "tarih yok", hasCleanEvidence ? evidence : "Kanıt bekleniyor"].filter(Boolean).join(" | ");
    return `<div class="mini"><div><b>${d.title}</b><span>${meta}</span></div></div>`;
  }).join("")}</div>`;
}
function renderRooms(){ return `<div class="card"><div class="card-head"><div><div class="card-title">Stratejik Karar Odaları</div><div class="card-sub">Her oda bir yönetim ritmi ve veri ekranı ile bağlıdır.</div></div></div>${roomsGrid()}</div>`; }
function showRoom(id){
  const r = state.data.rooms.find(x=>x.id===id);
  openModal(r.title, `<p class="muted">${r.firstMessage}</p><div class="chips">${r.scope.map(s=>`<span class="chip">${s}</span>`).join("")}</div><div class="card"><div class="card-title">Kullanım</div><p class="muted">Bu oda karar, sorumlu, tarih, kanıt ve kapanış notu üretir. CEO dashboard'a açık karar olarak düşer.</p></div>`);
}

function renderIntelligence(){
  const bi = state.data.businessIntelligence || {};
  const alerts = safeRows(state.data.executiveAlerts);
  const complaints = safeRows(state.data.complaints);
  const cityRows = (bi.cityScores || []).map(c=>`<tr><td><b>${c.city}</b></td><td>${scorePill("Talep",c.demand)}</td><td>${scorePill("Rekabet",c.competition)}</td><td>${scorePill("Yatırım",c.investment)}</td><td>${badge(c.priority)}</td></tr>`);
  const branchRows = state.data.branches.map(b=>`<tr data-branch="${b.id}"><td><b>${b.name}</b><br><span class="muted">${b.city} / ${b.region}</span></td><td>${money(b.revenue)}</td><td>${pct(b.qualityScore)}</td><td>${b.googleScore || "-"}</td><td>${badge(b.riskLevel)}</td><td><button class="btn small" data-branch="${b.id}">Derine İn</button></td></tr>`);
  return `<div class="grid g4">${stat("Büyüme Tahmini","%18.4","90 günlük")}${stat("Şube Sağlığı",pct(avg(state.data.branches,"qualityScore")),"Ağ ortalaması","green")}${stat("Lead Verimi","%29.5","Randevu dönüşümü","blue")}${stat("Güven Riski",alerts.filter(a=>["High","Critical"].includes(a.severity)).length+" alarm",complaints.filter(c=>c.priority==="Critical").length+" kritik şikayet","amber")}</div>
  <div class="grid g70"><div class="card"><div class="card-head"><div><div class="card-title">Ağ Ciro Trendi</div><div class="card-sub">Son 7 dönem milyon TL trendi; CEO için büyüme ritmi.</div></div></div>${lineChart(bi.revenueTrend || [1,2,3])}</div><div class="card"><div class="card-title">CEO Alarm Paneli</div>${miniList([...(bi.ceoAlerts || []), ...alerts.slice(0,3).map(a=>a.message)])}</div></div>
  <div class="grid g2"><div class="card"><div class="card-title">Satış Hunisi</div>${barChart(bi.funnel || [])}</div><div class="card"><div class="card-title">Yeni Şehir Öncelik Haritası</div>${simpleTable(["Şehir","Talep","Rekabet","Yatırım","Karar"], cityRows)}</div></div>
  <div class="card"><div class="card-head"><div><div class="card-title">Şube Bazlı Performans Derinliği</div><div class="card-sub">Her satır tıklanabilir; ciro, kalite, yorum ve hukuki risk birlikte değerlendirilir.</div></div></div>${simpleTable(["Şube","Ciro","Kalite","Google","Risk",""], branchRows)}</div>`;
}

function renderBranches(){
  return `<div class="grid g4">${stat("Aktif Şube",state.data.branches.filter(b=>b.status==="Aktif").length,"Operasyon")}${stat("Açılış",state.data.branches.filter(b=>b.status!=="Aktif").length,"Pipeline","blue")}${stat("Ortalama Kalite",Math.round(state.data.branches.reduce((s,b)=>s+b.qualityScore,0)/state.data.branches.length)+"%","Ağ standardı","green")}${stat("Riskli",state.data.branches.filter(b=>b.riskLevel==="Yüksek").length,"CEO takip","amber")}</div><div class="card"><div class="card-head"><div><div class="card-title">Şube Performans Tablosu</div><div class="card-sub">Satır veya Profil butonu tam sayfa şube profiline gider.</div></div></div>${branchesTable(state.data.branches)}</div>`;
}
function branchesTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>Şube</th><th>Durum</th><th>Ciro</th><th>Royalty</th><th>Rapor</th><th>Kalite</th><th>Risk</th><th></th></tr></thead><tbody>${rows.map(b => `<tr data-branch="${b.id}"><td><div class="person"><div class="avatar">${b.city.slice(0,2).toUpperCase()}</div><div><b>${b.name}</b><br><span class="muted">${b.manager} | ${b.region}</span></div></div></td><td>${badge(b.status)}</td><td>${money(b.revenue)}</td><td>${money(b.royalty)}</td><td>${b.reports}</td><td>%${b.qualityScore}</td><td>${badge(b.riskLevel)}</td><td><button class="btn small" data-branch="${b.id}">Profil</button></td></tr>`).join("")}</tbody></table></div>`;
}
function renderBranchProfile(){
  const b = branch(state.selectedBranch) || state.data.branches[0];
  const m = metrics(b.id);
  const health = Math.round((b.qualityScore + (m.sla||70) + (b.nps||70) + (m.trainingCompletion||70))/4);
  const appts = state.data.appointments.filter(a=>a.branchId===b.id);
  const reports = state.data.reports.filter(r=>r.branchId===b.id);
  const complaints = safeRows(state.data.complaints).filter(c=>c.branchId===b.id);
  const reputation = safeRows(state.data.reputationScores).find(r=>r.branchId===b.id);
  const alerts = safeRows(state.data.executiveAlerts).filter(a=>a.branchId===b.id);
  return `<div class="backline"><button class="btn" onclick="go('branches')">Şubelere dön</button><button class="btn" onclick="go('finance')">Finans</button></div>
  <div class="card"><div class="profile-head"><div><h2>${b.name}</h2><p>${b.city} / ${b.region} | Müdür: ${b.manager} | ${b.id}</p></div><button class="btn primary">Aksiyon Ata</button></div><div class="grid g4">${stat("Sağlık",health+"/100","Bileşik skor","green")}${stat("Ciro",money(b.revenue),b.growthRate+"% büyüme","blue")}${stat("Google",reputation ? reputation.averageRating.toFixed(2) : b.googleScore,"İtibar skoru","green")}${stat("Güven Riski",complaints.length+" şikayet",alerts.length+" CEO alarm","amber")}</div></div>
  <div class="grid g2"><div class="card"><div class="card-title">Şube Röntgeni</div>${profileRows([["Kapasite","%"+(m.capacity||0)],["SLA","%"+(m.sla||0)],["Bekleme",m.averageWait||"-"],["Ortalama fiş",money(m.averageTicket)],["Eğitim","%"+(m.trainingCompletion||0)],["Stok",m.inventoryStatus||"-"]])}</div><div class="card"><div class="card-title">Merkez Aksiyon Planı</div><div class="mini-list">${(m.actions||[]).map(a=>`<div class="mini"><div><b>${a}</b><span>Sorumlu, tarih ve kanıt girilmeden kapanmaz.</span></div></div>`).join("")}</div></div></div>
  <div class="grid g3"><div class="card"><div class="card-title">Şikayet Riski</div>${miniList(complaints.length ? complaints.map(c=>`${c.id} | ${c.priority} | ${c.category} | ${c.stage}`) : ["Açık şikayet yok"])}</div><div class="card"><div class="card-title">Google İtibar</div>${profileRows([["Review link", b.googleReviewUrl || "-"],["Pozitif skor", reputation ? pct(reputation.positiveScore) : "-"],["Negatif yorum", reputation ? reputation.negativeReviews : 0],["Recovery", reputation ? reputation.recoveryCount : 0]])}</div><div class="card"><div class="card-title">CEO Alarmları</div>${miniList(alerts.length ? alerts.map(a=>`${a.severity} | ${a.message}`) : ["Aktif CEO alarmı yok"])}</div></div>
  <div class="grid g2"><div class="card"><div class="card-title">Bugünkü Randevular</div>${appointmentsTable(appts)}</div><div class="card"><div class="card-title">Raporlar</div>${reportsTable(reports)}</div></div>`;
}
function profileRows(rows){ return rows.map(r=>`<div class="ir"><span>${r[0]}</span><b>${r[1]}</b></div>`).join(""); }

function renderFranchise(){
  const stages = ["Yeni Lead","Ön Görüşme","Yatırımcı Sunumu","Teklif"];
  return `<div class="grid g4">${stat("Aday",state.data.leads.length,"Pipeline")}${stat("Ortalama Skor",Math.round(state.data.leads.reduce((s,l)=>s+l.score,0)/state.data.leads.length),"+12 puan","green")}${stat("Sözleşme",state.data.leads.filter(l=>l.stage==="Sözleşme").length,"Hukuk","blue")}${stat("Hedef Şehir",12,"2026","amber")}</div><div class="kanban">${stages.map(s=>`<div class="col"><h3>${s}</h3>${state.data.leads.filter(l=>l.stage===s || (s==="Teklif"&&l.stage==="Sözleşme")).map(l=>`<div class="deal" data-lead="${l.id}"><b>${l.name}</b><br><small>${l.city} | ${l.type} | Skor ${l.score}</small><div class="deal-foot">${badge(l.stage)}<button class="btn small" data-lead="${l.id}">Değerlendir</button></div></div>`).join("")}</div>`).join("")}</div>`;
}
function renderLeadProfile(){
  const l = lead(state.selectedLead) || state.data.leads[0];
  const s = leadScore(l.id);
  const avg = Math.round(((s.finance||l.score)+(s.characterScore||70)+(s.location||70)+(s.brandFit||70)+(s.closingProbability||50))/5);
  return `<div class="backline"><button class="btn" onclick="go('franchise')">Franchise hunisine dön</button><button class="btn" onclick="go('rooms')">Karar odaları</button></div><div class="card"><div class="profile-head"><div><h2>${l.name}</h2><p>${l.city} | ${l.type} | ${l.phone} | ${l.source}</p></div><button class="btn primary">CEO Onayına Gönder</button></div><div class="grid g4">${stat("Aday Skoru",avg+"/100","Bileşik değerlendirme","green")}${stat("Yatırım",s.investment || l.budget,"Bütçe")}${stat("Lokasyon",s.district || l.city,"Bölge","blue")}${stat("Kapanış","%"+(s.closingProbability||50),"Tahmin","amber")}</div></div><div class="grid g2"><div class="card"><div class="card-title">Skor Kartı</div>${scoreBars([["Finans",s.finance||l.score],["Karakter",s.characterScore||70],["Lokasyon",s.location||70],["Marka Uyumu",s.brandFit||70],["Kapanış",s.closingProbability||50]])}</div><div class="card"><div class="card-title">Franchise Süreci</div>${stageList(l.stage)}</div></div><div class="grid g3"><div class="card"><div class="card-title">Notlar</div>${miniList(s.notes||["Detay bekleniyor"])}</div><div class="card"><div class="card-title">Riskler</div>${miniList(s.risks||["Risk girilmedi"])}</div><div class="card"><div class="card-title">Aksiyonlar</div>${miniList(s.actions||[l.nextStep])}</div></div>`;
}
function scoreBars(rows){ return rows.map(r=>`<div class="ir"><span>${r[0]}</span><b>%${r[1]}</b></div><div class="progress"><div class="bar ${r[1]>=80?"green":r[1]>=65?"amber":""}" style="width:${r[1]}%"></div></div>`).join(""); }
function stageList(current){ const stages=["Yeni Lead","Ön Görüşme","Yatırımcı Sunumu","Teklif","Sözleşme","Kurulum","Açılış"]; const idx=stages.indexOf(current); return `<div class="stage-list">${stages.map((s,i)=>`<div class="stage ${i<idx?"done":i===idx?"current":""}"><div class="stage-num">${i+1}</div><div><b>${s}</b><div class="muted">${i<idx?"Tamamlandı":i===idx?"Aktif aşama":"Bekliyor"}</div></div>${badge(i<=idx?"Aktif":"Bekler")}</div>`).join("")}</div>`; }
function miniList(items){ return `<div class="mini-list">${items.map(i=>`<div class="mini"><div><b>${i}</b><span>Kayıt ve kanıt ile takip edilir.</span></div></div>`).join("")}</div>`; }

function renderAppointments(){
  const rows = state.data.appointments;
  const slots = ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00"].map(t=>{
    const a = rows.find(x=>x.time===t);
    return `<div class="slot ${a?"busy":"free"}"><b>${t}</b><span>${a ? `${branchName(a.branchId)} | ${a.vehicle}` : "Boş kapasite"}</span></div>`;
  }).join("");
  return `<div class="grid g4">${stat("Bugünkü Randevu",rows.length,"Tüm ağ")}${stat("Show-up","%80","Hedef %86","amber")}${stat("Ortalama Bekleme","23 dk","SLA 25 dk","green")}${stat("No-show Riski","2 kayıt","WhatsApp takip","blue")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Saatlik Kapasite Planı</div><div class="slots">${slots}</div></div><div class="card"><div class="card-title">Randevu Listesi</div>${appointmentsTable(rows)}</div></div>`;
}

function renderCustomers(){
  const customers = state.data.customers;
  return `<div class="grid g4">${stat("Toplam Müşteri",customers.length,"Demo kayıt")}${stat("Tekrar Ziyaret",num(customers.reduce((s,c)=>s+c.visits,0)),"Yaşam değeri","green")}${stat("Sadakat Puanı",num(customers.reduce((s,c)=>s+c.loyaltyPoints,0)),"Toplam","blue")}${stat("Ortalama NPS",(avg(customers,"nps")).toFixed(1)+"/10","Memnuniyet","amber")}</div>
  <div class="card"><div class="card-head"><div><div class="card-title">Müşteri 360 Listesi</div><div class="card-sub">Telefon, segment, geliş sıklığı, NPS ve sonraki aksiyon beraber izlenir.</div></div></div>${customersTable()}</div>`;
}

function renderVehicles(){
  const rows = (state.data.vehicles || []).map(v=>`<tr><td><b>${v.plate}</b><br><span class="muted">${v.brand} ${v.model} ${v.year}</span></td><td>${num(v.km)} km</td><td>${branchName(v.branchId)}</td><td>${customerName(v.customerId)}</td><td>${badge(v.riskLevel)}</td><td>${v.repeatWarning}</td></tr>`);
  return `<div class="grid g4">${stat("Araç Hafızası",(state.data.vehicles||[]).length,"Tekil kayıt")}${stat("Yüksek Risk",(state.data.vehicles||[]).filter(v=>v.riskLevel==="Yüksek").length,"Uyarı")}${stat("Tekrar Gelen",2,"Plaka eşleşmesi","blue")}${stat("Foto / Rapor Bağı","%100","QR hazır","green")}</div>
  <div class="card"><div class="card-title">Araç Paneli</div>${simpleTable(["Araç","KM","Şube","Müşteri","Risk","Uyarı"], rows)}</div>`;
}

function renderOperations(){
  const ops = state.data.operations || [];
  const opRows = ops.map(o=>`<tr><td><b>${o.vehicle}</b><br><span class="muted">${o.id}</span></td><td>${branchName(o.branchId)}</td><td>${o.station}</td><td>${o.expert}</td><td>${o.startedAt} - ${o.eta}</td><td>${badge(o.status)}</td><td>${badge(o.delayRisk)}</td></tr>`);
  const sop = ["Karşılama ve ön bilgi", "Lift kontrol", "Mekanik test", "Dyno / OBD", "Boya ölçüm", "Fotoğraf standardı", "Rapor anlatımı", "Teslim ve yorum isteme"];
  return `<div class="grid g4">${stat("Canlı İş",ops.length,"Kuyruk")}${stat("SLA",pct(avg(state.data.branches.map(b=>metrics(b.id)),"sla")),"Ağ ortalaması","green")}${stat("Gecikme Riski",ops.filter(o=>o.delayRisk==="Yüksek").length,"Anlık","amber")}${stat("Kapasite",pct(avg(state.data.branches.map(b=>metrics(b.id)),"capacity")),"Bugün","blue")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Canlı Ekspertiz Kuyruğu</div>${simpleTable(["Araç","Şube","İstasyon","Eksper","Saat","Durum","Risk"], opRows)}</div><div class="card"><div class="card-title">OTOTR SOP Akışı</div>${miniList(sop)}</div></div>`;
}

function renderReportsPage(){
  const rows = state.data.reports.map(r=>`<tr><td><b>${r.id}</b><br><span class="muted">${r.plate}</span></td><td>${branchName(r.branchId)}</td><td>${r.model}</td><td>${r.score}/10</td><td>${badge(r.riskLevel)}</td><td>${r.expert}</td><td><button class="btn small">PDF</button></td></tr>`);
  return `<div class="grid g4">${stat("Rapor",state.data.reports.length,"Demo kayıt")}${stat("Kalite Denetimi","%92","Örneklem","green")}${stat("Revizyon",1,"Açık")}${stat("QR Paylaşım","%84","WhatsApp","blue")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Rapor Paneli</div>${simpleTable(["Rapor","Şube","Model","Skor","Risk","Eksper",""], rows)}</div><div class="card"><div class="card-title">Rapor Kalite Başlıkları</div>${miniList(["Hukuki koruma dili", "Fotoğraf kanıt kalitesi", "Kritik kusur işaretleme", "Müşteri anlatım tutarlılığı", "Revizyon onay izi"])}</div></div>`;
}

function renderCrm(){ return `<div class="grid g4">${stat("Müşteri",state.data.customers.length,"Demo kayıt")}${stat("Randevu",state.data.appointments.length,"Bugün","blue")}${stat("WhatsApp SLA","11 dk","Hedef altı","green")}${stat("Sadakat","%22","Tekrar","amber")}</div><div class="grid g2"><div class="card"><div class="card-head"><div><div class="card-title">Randevular</div><div class="card-sub">Aç butonu Müşteri 360'a gider.</div></div></div>${appointmentsTable(state.data.appointments)}</div><div class="card"><div class="card-head"><div><div class="card-title">Müşteriler</div><div class="card-sub">Telefon, segment ve takip görevleri</div></div></div>${customersTable()}</div></div>`; }
function appointmentsTable(rows){ return `<div class="table-wrap"><table><thead><tr><th>Saat</th><th>Müşteri</th><th>Şube</th><th>Araç</th><th>Paket</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr data-customer="${a.customerId}"><td>${a.time}</td><td>${customerName(a.customerId)}</td><td>${branchName(a.branchId)}</td><td>${a.vehicle}</td><td>${a.package}</td><td>${badge(a.status)} <button class="btn small" data-customer="${a.customerId}">Aç</button></td></tr>`).join("")}</tbody></table></div>`; }
function customersTable(){ return `<div class="table-wrap"><table><thead><tr><th>Müşteri</th><th>Tip</th><th>Şehir</th><th>Ziyaret</th><th>NPS</th><th></th></tr></thead><tbody>${state.data.customers.map(c=>`<tr data-customer="${c.id}"><td><b>${c.name}</b><br><span class="muted">${c.phone}</span></td><td>${c.type}</td><td>${c.city}</td><td>${c.visits}</td><td>${c.nps}/10</td><td><button class="btn small" data-customer="${c.id}">360</button></td></tr>`).join("")}</tbody></table></div>`; }
function renderCustomerProfile(){
  const c = customer(state.selectedCustomer) || state.data.customers[0];
  const appts = state.data.appointments.filter(a=>a.customerId===c.id);
  const reports = state.data.reports.filter(r=>r.customerId===c.id);
  const complaints = safeRows(state.data.complaints).filter(x=>x.customerId===c.id);
  const chats = safeRows(state.data.whatsappConversations).filter(x=>x.customerId===c.id);
  const reviews = safeRows(state.data.googleReviews).filter(x=>x.customerId===c.id);
  return `<div class="backline"><button class="btn" onclick="go('crm')">CRM'e dön</button><button class="btn" onclick="go('whatsapp')">WhatsApp Takip</button><button class="btn" onclick="go('complaints')">Şikayet Geçmişi</button></div><div class="card"><div class="profile-head"><div><h2>${c.name}</h2><p>${c.type} | ${c.segment} | ${c.phone} | ${c.city}</p></div><button class="btn primary">Tekrar Satış Hatırlat</button></div><div class="grid g4">${stat("Ziyaret",c.visits,"Müşteri yaşam değeri")}${stat("NPS",c.nps+"/10","Memnuniyet","green")}${stat("Şikayet",complaints.length,"Risk geçmişi","amber")}${stat("WhatsApp",chats.length,"Konuşma","blue")}</div></div><div class="grid g2"><div class="card"><div class="card-title">Müşteri Zaman Çizgisi</div>${timeline(c,appts,reports,complaints,chats,reviews)}</div><div class="card"><div class="card-title">WhatsApp Satış Makinesi</div>${miniList(["Otomatik karşılama", "Rapor linki gönderimi", "Memnuniyet anketi", "Tekrar satış hatırlatma", "Complaint follow-up", "Review request"])}</div></div>`;
}
function timeline(c,appts,reports,complaints=[],chats=[],reviews=[]){ return `<div class="mini-list">${appts.map(a=>`<div class="mini"><div><b>Randevu - ${a.status}</b><span>${a.time} | ${branchName(a.branchId)} | ${a.vehicle}</span></div></div>`).join("")}${reports.map(r=>`<div class="mini"><div><b>Rapor - ${r.result}</b><span>${r.plate} | ${r.model} | Skor ${r.score}/10</span></div></div>`).join("")}${complaints.map(cp=>`<div class="mini"><div><b>Şikayet - ${cp.stage}</b><span>${cp.category} | ${cp.priority} | ${branchName(cp.branchId)}</span></div></div>`).join("")}${chats.map(w=>`<div class="mini"><div><b>WhatsApp - ${w.stage}</b><span>${w.team} | ${w.tags.join(", ")}</span></div></div>`).join("")}${reviews.map(r=>`<div class="mini"><div><b>Google Yorum - ${r.rating}/5</b><span>${r.status} | ${branchName(r.branchId)}</span></div></div>`).join("")}<div class="mini"><div><b>Takip</b><span>${c.nextAction}</span></div></div></div>`; }
function reportsTable(rows){ return `<div class="table-wrap"><table><thead><tr><th>Rapor</th><th>Plaka</th><th>Model</th><th>Skor</th><th>Sonuç</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.id}</td><td>${r.plate}</td><td>${r.model}</td><td>${r.score}/10</td><td>${badge(r.result)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Kayıt yok</td></tr>`}</tbody></table></div>`; }
function renderFinance(){
  const total = state.data.branches.reduce((s,b)=>s+b.revenue,0);
  const royalty = state.data.branches.reduce((s,b)=>s+b.royalty,0);
  const scenarioRows = [
    `<tr><td>Tek şube</td><td>${money(1425000)}</td><td>${money(382000)}</td><td>%26.8</td><td>Mevcut model</td></tr>`,
    `<tr><td>5 şube</td><td>${money(7100000)}</td><td>${money(1910000)}</td><td>%27</td><td>Merkez ekip + kalite</td></tr>`,
    `<tr><td>20 franchise</td><td>${money(28400000)}</td><td>${money(7620000)}</td><td>%26.8</td><td>Royalty motoru</td></tr>`
  ];
  return `<div class="grid g4">${stat("Toplam Ciro",money(total),"Ağ")}${stat("Royalty",money(royalty),"Merkez","green")}${stat("EBITDA",money(1510000),"Projeksiyon","blue")}${stat("Gecikme",money(106740),"1 bayi","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Şube Finans Tablosu</div>${branchesTable(state.data.branches)}</div><div class="card"><div class="card-title">OTOTR Finans Blueprint 2026</div>${simpleTable(["Senaryo","Ciro","EBITDA","Marj","Not"], scenarioRows)}</div></div>`;
}

function renderHr(){
  const rows = (state.data.staff || []).map(s=>`<tr><td><b>${s.name}</b><br><span class="muted">${s.role}</span></td><td>${branchName(s.branchId)}</td><td>${pct(s.productivity)}</td><td>${s.vehiclesToday}</td><td>${s.errorRate}%</td><td>${s.nps}/10</td><td>${money(s.bonus)}</td></tr>`);
  return `<div class="grid g4">${stat("Personel",(state.data.staff||[]).length,"Demo ekip")}${stat("Verim",pct(avg(state.data.staff||[],"productivity")),"Ağ ortalaması","green")}${stat("Hata Oranı",(avg(state.data.staff||[],"errorRate")).toFixed(1)+"%","Kalite","amber")}${stat("Prim",money((state.data.staff||[]).reduce((s,x)=>s+x.bonus,0)),"Bu ay","blue")}</div>
  <div class="card"><div class="card-title">Personel / İK Performans Paneli</div>${simpleTable(["Personel","Şube","Verim","Araç","Hata","NPS","Prim"], rows)}</div>`;
}

function renderMarketing(){
  const campaigns = state.data.marketingCampaigns || [];
  const rows = campaigns.map(c=>`<tr><td><b>${c.name}</b><br><span class="muted">${c.channel}</span></td><td>${c.branchId ? branchName(c.branchId) : "Genel merkez"}</td><td>${money(c.spend)}</td><td>${c.leads}</td><td>${c.appointments}</td><td>${c.sales}</td><td>${money(c.cpl)}</td><td>${c.roas}x</td><td>${badge(c.status)}</td></tr>`);
  const funnel = (state.data.businessIntelligence || {}).funnel || [];
  return `<div class="grid g4">${stat("Lead",campaigns.reduce((s,c)=>s+c.leads,0),"Kampanya")}${stat("CPL",money(Math.round(avg(campaigns,"cpl"))),"Ortalama","blue")}${stat("ROAS",(avg(campaigns,"roas")).toFixed(1)+"x","Ağ","green")}${stat("Satış",campaigns.reduce((s,c)=>s+c.sales,0),"Kapanış","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Lead Üretim ve Satış Makinesi</div>${simpleTable(["Kampanya","Şube","Harcama","Lead","Randevu","Satış","CPL","ROAS","Durum"], rows)}</div><div class="card"><div class="card-title">Funnel Optimizasyonu</div>${barChart(funnel)}</div></div>`;
}

function renderCustomerExperience(){
  const complaints = safeRows(state.data.complaints);
  const reviews = safeRows(state.data.googleReviews);
  const scores = safeRows(state.data.reputationScores);
  const satisfaction = safeRows(state.data.complaintSatisfaction);
  const openComplaints = complaints.filter(c=>!["Resolved","Closed"].includes(c.stage));
  const nps = Math.round(avg(satisfaction,"nps") || avg(state.data.customers || [],"nps") * 10);
  const reviewRows = reviews.map(r=>`<tr><td><b>${r.reviewer}</b><br><span class="muted">${branchName(r.branchId)}</span></td><td>${r.rating}/5</td><td>${badge(r.status)}</td><td>${minutes(r.responseMinutes)}</td><td>${r.text}</td><td><button class="btn small" onclick="go('reputation')">Yanıtla</button></td></tr>`);
  return `<div class="grid g4">${stat("Google Yorum Ort.",avgRating(scores).toFixed(2),"Ağ ortalaması","green")}${stat("Açık Şikayet",openComplaints.length,"Çözüm süreci","amber")}${stat("NPS Skoru",`+${nps}`,"Memnuniyet","blue")}${stat("SLA Riski",complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length,"CEO takip")}</div>
  <div class="grid g2"><div class="card"><div class="card-head"><div><div class="card-title">Yorum & Memnuniyet Trendleri</div><div class="card-sub">Google yorumları, şikayet dosyaları, NPS ve çözüm süreçleri birlikte izlenir.</div></div><button class="btn" onclick="go('complaints')">Şikayet Yönetimi</button></div>${lineChart(scores.map(s=>Number(s.averageRating || 4.4)))}</div><div class="card"><div class="card-head"><div><div class="card-title">Müşteri Deneyimi Kapsamı</div><div class="card-sub">Detay çözümü ilgili alt modüllere indirilir.</div></div></div>${miniList(["Google yorumları", "Şikayet yönetimi", "Memnuniyet puanı", "NPS skorları", "Çözüm süreçleri", "Yorum kurtarma ve CRM aktarımı"])}</div></div>
  <div class="card"><div class="card-title">Son Yorumlar ve Aksiyonlar</div>${simpleTable(["Yorum","Puan","Durum","Yanıt","Metin",""], reviewRows)}</div>`;
}

function renderReportingCenter(){
  const weekly = [
    "Haftalık şube performansı",
    "Yönetim sunumu",
    "KPI ekranı",
    "Excel export",
    "Finans ve royalty özeti",
    "Müşteri deneyimi raporu"
  ];
  const rows = [
    `<tr><td><b>Haftalık Yönetim Raporu</b><br><span class="muted">PDF + sunum özeti</span></td><td>Her Pazartesi</td><td>CEO</td><td>${badge("Aktif")}</td><td><button class="btn small">İndir</button></td></tr>`,
    `<tr><td><b>Şube KPI Export</b><br><span class="muted">Excel veri seti</span></td><td>Günlük</td><td>Operasyon</td><td>${badge("Aktif")}</td><td><button class="btn small">Excel</button></td></tr>`,
    `<tr><td><b>Franchise Pipeline Sunumu</b><br><span class="muted">Aday ve şehir fırsatları</span></td><td>Aylık</td><td>Büyüme</td><td>${badge("Bekliyor")}</td><td><button class="btn small">Aç</button></td></tr>`
  ];
  return `<div class="grid g4">${stat("Rapor Şablonu",weekly.length,"Merkez")}${stat("Excel Export","Hazır","KPI + finans","green")}${stat("Yönetim Sunumu","3 bölüm","CEO ritmi","blue")}${stat("KPI Ekranı","Canlı","Dashboard bağlı","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Raporlama Merkezi</div>${miniList(weekly)}</div><div class="card"><div class="card-title">KPI Özet Grafiği</div>${lineChart((state.data.businessIntelligence || {}).revenueTrend || [172,184,196,205,221,238])}</div></div>
  <div class="card"><div class="card-title">Rapor Kuyruğu</div>${simpleTable(["Rapor","Periyot","Sahip","Durum",""], rows)}</div>`;
}

function renderComplaints(){
  const complaints = safeRows(state.data.complaints);
  const rows = complaints.map(c=>`<tr><td><b>${c.id}</b><br><span class="muted">${customerName(c.customerId)}</span></td><td>${branchName(c.branchId)}</td><td>${c.source}</td><td>${c.category}</td><td>${badge(c.priority)}</td><td>${badge(c.stage)}</td><td>${c.owner}</td><td>${minutes(c.firstResponseMinutes)}</td><td>${c.resolutionHours} saat</td><td>${badge(c.slaStatus)}</td></tr>`);
  const categoryRows = ["Wrong report claim","Staff behavior","Delay / waiting time","Pricing issue","Refund request","Technical dispute","Cleanliness / branch condition","Appointment problem","Communication issue","Other"].map(cat=>`<tr><td>${cat}</td><td>${complaints.filter(c=>c.category===cat).length}</td><td>${badge(complaints.some(c=>c.category===cat&&["High","Critical"].includes(c.priority)) ? "Riskli" : "Normal")}</td></tr>`);
  return `<div class="grid g4">${stat("Complaints Today",complaints.filter(c=>String(c.createdAt||"").slice(0,10)==="2026-04-28").length,"Bugün")}${stat("Avg Solve Time",(avg(complaints,"resolutionHours")).toFixed(1)+" saat","Çözüm")}${stat("SLA Breaches",complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length,"Takip","amber")}${stat("Reopened",complaints.filter(c=>c.reopened).length,"Tekrar açılan","blue")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Şikayet Alım Kanalları</div>${miniList(["Web form", "Call center entry", "Branch manual entry", "WhatsApp complaint intake", "Google review complaint detection", "QR code feedback form"])}</div><div class="card"><div class="card-title">Otomatik Sahiplik Mantığı</div>${miniList(["Düşük/orta risk: Şube Müdürü", "SLA riski: Bölge Müdürü", "Rating etkisi: HQ Customer Experience", "Rapor/tazmin riski: Hukuk Ekibi"])}</div></div>
  <div class="card"><div class="card-head"><div><div class="card-title">Şikayet Çözüm Merkezi</div><div class="card-sub">New → Assigned → Investigating → Waiting Customer → Resolved → Closed → Escalated HQ</div></div></div>${simpleTable(["Dosya","Şube","Kaynak","Kategori","Öncelik","Aşama","Sahip","İlk Yanıt","Çözüm","SLA"], rows)}</div>
  <div class="grid g3"><div class="card"><div class="card-title">Kategori Trendleri</div>${simpleTable(["Kategori","Adet","Durum"], categoryRows)}</div><div class="card"><div class="card-title">Çözüm Aksiyonları</div>${miniList(["Refund approved", "Re-inspection free", "Manager callback", "Staff warning", "Goodwill gift", "Explanation accepted", "Legal review"])}</div><div class="card"><div class="card-title">Çözüm Sonrası Memnuniyet</div>${miniList(safeRows(state.data.complaintSatisfaction).map(s=>`${s.stars}/5 yıldız | NPS ${s.nps} | ${s.comment}`))}</div></div>`;
}

function renderReputation(){
  const scores = safeRows(state.data.reputationScores);
  const reviews = safeRows(state.data.googleReviews);
  const rewards = safeRows(state.data.reviewRecoveryRewards);
  const scoreRows = scores.map(s=>`<tr data-branch="${s.branchId}"><td><b>${branchName(s.branchId)}</b><br><span class="muted">${s.officialReviewUrl}</span></td><td>${s.averageRating.toFixed(2)}</td><td>${num(s.totalReviews)}</td><td>${s.newReviews}</td><td>${s.negativeReviews}</td><td>${minutes(s.responseSpeedMinutes)}</td><td>${s.recoveryCount}</td><td>${pct(s.positiveScore)}</td><td>${badge(s.riskLevel)}</td></tr>`);
  const reviewRows = reviews.map(r=>`<tr><td><b>${r.reviewer}</b><br><span class="muted">${branchName(r.branchId)}</span></td><td>${r.previousRating || "-"} → ${r.rating}</td><td>${badge(r.status)}</td><td>${minutes(r.responseMinutes)}</td><td>${r.complaintId || "-"}</td><td>${r.text}</td></tr>`);
  return `<div class="grid g4">${stat("Brand Avg Rating",avgRating(scores).toFixed(2),"Ağ")}${stat("Negative Reviews",reviews.filter(r=>r.rating<=2).length,"1-2 yıldız","amber")}${stat("Reviews Recovered",rewards.length,"KPI ödül","green")}${stat("Risk Branches",scores.filter(s=>["High","Medium"].includes(s.riskLevel)).length,"Alarm","blue")}</div>
  <div class="card"><div class="card-head"><div><div class="card-title">Branch Positive Score Formula</div><div class="card-sub">Review recovery count + average rating + response speed + total reviews growth.</div></div></div>${simpleTable(["Şube","Rating","Toplam","Yeni","Negatif","Yanıt","Recovery","Pozitif Skor","Risk"], scoreRows)}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Review Monitoring</div>${simpleTable(["Yorum","Puan","Durum","Yanıt","Şikayet","Metin"], reviewRows)}</div><div class="card"><div class="card-title">Reputation Alerts</div>${miniList(["Sudden negative review spike", "Rating below threshold", "No responses pending", ...safeRows(state.data.executiveAlerts).filter(a=>a.type.includes("rating")).map(a=>a.message)])}</div></div>`;
}

function renderWhatsapp(){
  const conversations = safeRows(state.data.whatsappConversations);
  const templates = safeRows(state.data.whatsappTemplates);
  const rows = conversations.map(c=>`<tr><td><b>${c.phone}</b><br><span class="muted">${c.customerId ? customerName(c.customerId) : "Yeni lead"}</span></td><td>${branchName(c.branchId)}</td><td>${c.team}</td><td>${c.stage}</td><td>${c.tags.join(", ")}</td><td>${minutes(c.firstReplyMinutes)}</td><td>${c.messagesCount}</td><td>${badge(c.status)}</td></tr>`);
  const templateRows = templates.map(t=>`<tr><td><b>${t.name}</b><br><span class="muted">${t.useCase}</span></td><td>${badge(t.status)}</td><td>${pct(t.avgConversion)}</td></tr>`);
  const booked = conversations.filter(c=>["Booked","Won"].includes(c.stage)).length;
  const conversion = conversations.length ? Math.round(booked/conversations.length*100) : 0;
  return `<div class="grid g4">${stat("WhatsApp Leads Today",conversations.filter(c=>c.leadId && String(c.lastMessageAt||"").slice(0,10)==="2026-04-28").length,"Yeni numara")}${stat("First Reply",minutes(avg(conversations,"firstReplyMinutes")),"Ortalama","blue")}${stat("Conversion",pct(conversion),"Booked + Won","green")}${stat("SLA Risk",conversations.filter(c=>Number(c.firstReplyMinutes)>15).length,"15 dk üstü","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Unified Inbox</div>${simpleTable(["Kişi","Şube","Takım","Pipeline","Etiket","İlk Yanıt","Mesaj","Durum"], rows)}</div><div class="card"><div class="card-title">Smart Routing</div>${miniList(["En yakın şubeye yönlendir", "Mevcut şube sahibine ata", "Complaint risk etiketi varsa şikayet masasına düşür", "Franchise kelimesi geçerse franchise satış takımına aktar", "Bilinmeyen numaradan lead oluştur: source = WhatsApp"])}</div></div>
  <div class="grid g2"><div class="card"><div class="card-title">WhatsApp Templates</div>${simpleTable(["Şablon","Durum","Ortalama Dönüşüm"], templateRows)}</div><div class="card"><div class="card-title">Otomatik Timeline Sync</div>${miniList(safeRows(state.data.whatsappMessages).map(m=>`${m.conversationId} | ${m.direction === "in" ? "Müşteri" : "OTOTR"}: ${m.message}`))}</div></div>`;
}

function renderAlerts(){
  const alerts = safeRows(state.data.executiveAlerts);
  const complaints = safeRows(state.data.complaints);
  const whatsapp = safeRows(state.data.whatsappConversations);
  const reputation = safeRows(state.data.reputationScores);
  const openAlerts = alerts.filter(a=>a.status!=="Closed");
  const redAlerts = openAlerts.filter(a=>["Critical","High"].includes(a.severity));
  const amberAlerts = openAlerts.filter(a=>["Medium","Low"].includes(a.severity));
  const solvedThisWeek = Math.max(8, safeRows(state.data.reviewRecoveryRewards).length + complaints.filter(c=>["Resolved","Closed"].includes(c.stage)).length);
  const rows = alerts.map(a=>`<tr data-branch="${a.branchId}"><td><b>${a.type}</b><br><span class="muted">${a.message}</span></td><td>${branchName(a.branchId)}</td><td>${badge(a.severity)}</td><td>${a.metric}</td><td>${a.threshold}</td><td>${a.owner}</td><td>${badge(a.status)}</td></tr>`);
  const redCards = redAlerts.length ? redAlerts.map(a=>signalCard(`${a.severity} · ${a.type}`, `${branchName(a.branchId)} · ${a.message} · Sahip: ${a.owner}`, severityTone(a.severity), "Şube", `state.selectedBranch='${a.branchId}';go('branch')`)).join("") : signalCard("Kırmızı alarm yok", "Kritik eşiklerde aktif ihlal bulunmuyor.", "green", "Dashboard", "go('dashboard')");
  const amberCards = amberAlerts.length ? amberAlerts.map(a=>signalCard(`${a.severity} · ${a.type}`, `${branchName(a.branchId)} · Metrik: ${a.metric} · Eşik: ${a.threshold}`, severityTone(a.severity), "Detay", "go('alerts')")).join("") : signalCard("Takip alarmı yok", "Orta öncelikli alarm kuyruğu temiz.", "green", "Dashboard", "go('dashboard')");
  const alarmTypeRows = [
    {label:"WhatsApp SLA", value:whatsapp.filter(c=>Number(c.firstReplyMinutes || 0)>15).length, cls:"red"},
    {label:"Şikayet SLA", value:complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length, cls:"amber"},
    {label:"Google rating", value:reputation.filter(r=>Number(r.averageRating || 0)<4.2).length, cls:"blue"},
    {label:"Royalty", value:state.data.branches.filter(b=>Number(b.royaltyOverdue || 0)>0).length, cls:"amber"},
    {label:"Rapor hata", value:alerts.filter(a=>a.type.includes("error")).length, cls:"green"}
  ];
  const maxAlarm = Math.max(...alarmTypeRows.map(r=>r.value), 1);
  const alarmBars = alarmTypeRows.map(r=>`<div class="metric-row"><span>${r.label}</span><div class="metric-track"><i class="${r.cls}" style="width:${Math.max(8, r.value / maxAlarm * 100)}%"></i></div><b>${r.value}</b></div>`).join("");
  return `<div class="hero"><h2>CEO Alarm Zekası</h2><p>Şube rating düşüşü, şikayet artışı, WhatsApp SLA, ciro sapması, royalty gecikmesi, personel riski ve rapor hata artışı tek karar kuyruğunda izlenir.</p><div class="alarm-strip"><span>Kapanış için kanıt zorunlu</span><span>Critical: aynı gün karar</span><span>High: 24 saat aksiyon</span><span>Medium: haftalık kalite</span></div></div>
  <div class="grid g4">${stat("Open Alerts",openAlerts.length,"CEO kuyruğu")}${stat("Kırmızı Alarm",redAlerts.length,"Acil müdahale","amber")}${stat("SLA Breaches",complaints.filter(c=>["Breached","At Risk"].includes(c.slaStatus)).length + whatsapp.filter(c=>Number(c.firstReplyMinutes || 0)>15).length,"Şikayet + WhatsApp")}${stat("Bu Hafta Çözülen",solvedThisWeek,"Ortalama 2.5 saat","green")}</div>
  <div class="grid g2"><div class="card"><div class="card-head"><div><div class="card-title">Kırmızı - Acil Müdahale</div><div class="card-sub">CEO, bölge ve ilgili departman aynı anda aksiyon alır.</div></div></div><div class="alert-lane">${redCards}</div></div><div class="card"><div class="card-head"><div><div class="card-title">Sarı - Takip Gerekli</div><div class="card-sub">Haftalık kalite ve performans toplantısına girer.</div></div></div><div class="alert-lane">${amberCards}</div></div></div>
  <div class="grid g2"><div class="card"><div class="card-head"><div><div class="card-title">Alarm Tipi Dağılımı</div><div class="card-sub">Hangi sistem başlığı daha çok alarm üretiyor?</div></div></div>${alarmBars}</div><div class="card"><div class="card-head"><div><div class="card-title">Otomatik Alarm Kuralları</div><div class="card-sub">Referanstaki kurallar ürün mimarisine işlenmiş haliyle.</div></div></div>${alertRulesGrid()}</div></div>
  <div class="card"><div class="card-head"><div><div class="card-title">Executive Alert Intelligence Kuyruğu</div><div class="card-sub">Tüm alarm kayıtları şube profiline tıklanabilir şekilde bağlandı.</div></div></div>${simpleTable(["Alarm","Şube","Seviye","Metrik","Eşik","Sahip","Durum"], rows)}</div>
  <div class="grid g2"><div class="card"><div class="card-title">CEO Müdahale Ritmi</div>${miniList(["Critical alarm: aynı gün karar odasına düşer", "High alarm: 24 saat içinde aksiyon sahibi atanır", "Medium alarm: haftalık kalite toplantısına girer", "Kapanış için kanıt, tarih ve sonuç metriği zorunlu"])}</div><div class="card"><div class="card-title">Riskli Şube Kısa Listesi</div>${miniList(reputation.filter(r=>["High","Medium"].includes(r.riskLevel)).map(r=>`${branchName(r.branchId)} · Google ${r.averageRating.toFixed(2)} · Pozitif skor ${pct(r.positiveScore)} · ${r.riskLevel}`))}</div></div>`;
}

function renderLegal(){
  const cases = state.data.legalCases || [];
  const rows = cases.map(c=>`<tr><td><b>${c.title}</b><br><span class="muted">${c.type}</span></td><td>${c.branchId ? branchName(c.branchId) : "Genel merkez"}</td><td>${badge(c.risk)}</td><td>${c.owner}</td><td>${c.status}</td><td>${c.dueDate}</td><td>${money(c.exposure)}</td></tr>`);
  return `<div class="grid g4">${stat("Hukuk Dosyası",cases.length,"Açık")}${stat("Yüksek Risk",cases.filter(c=>c.risk==="Yüksek").length,"CEO takip","amber")}${stat("Maruziyet",money(cases.reduce((s,c)=>s+c.exposure,0)),"Tahmini")}${stat("KVKK / Uyum","%82","Kontrol","blue")}</div>
  <div class="card"><div class="card-title">Hukuki Dosya Yönetimi</div>${simpleTable(["Dosya","Kapsam","Risk","Sorumlu","Durum","Tarih","Maruziyet"], rows)}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Hukuk Alt Başlıkları</div>${miniList(["Franchise sözleşme ve bölge koruma", "Ekspertiz rapor itirazları", "Tazmin ve arabuluculuk takibi", "KVKK açık rıza ve veri saklama", "Marka kullanım ve tabela denetimi", "Bayi fesih / yenileme süreçleri"])}</div><div class="card"><div class="card-title">CEO Hukuk Protokolü</div>${miniList(["Yüksek risk dosya 24 saat içinde CEO gündemine alınır", "Rapor itirazında fotoğraf, kamera ve usta notu birlikte incelenir", "Franchise sözleşmesinde bölge koruma ve fesih maddesi ayrı onaylanır", "KVKK metinleri canlı formlarla aynı versiyonda tutulur"])}</div></div>`;
}

function renderSupport(){
  const rows = (state.data.tickets || []).map(t=>`<tr><td><b>${t.title}</b><br><span class="muted">${t.id}</span></td><td>${branchName(t.branchId)}</td><td>${badge(t.severity)}</td><td>${t.sla}</td><td>${t.owner}</td></tr>`);
  return `<div class="grid g4">${stat("Açık Ticket",(state.data.tickets||[]).length,"Destek")}${stat("Yüksek Öncelik",(state.data.tickets||[]).filter(t=>t.severity==="Yüksek").length,"SLA")}${stat("Ortalama Çözüm","9.4 saat","Bu ay","green")}${stat("Tekrar Eden","1 konu","Kök neden","amber")}</div>
  <div class="card"><div class="card-title">Destek Talep Paneli</div>${simpleTable(["Talep","Şube","Öncelik","SLA","Sorumlu"], rows)}</div>`;
}

function renderAcademy(){
  const rows = (state.data.trainingItems || []).map(t=>`<tr><td><b>${t.title}</b><br><span class="muted">${t.audience}</span></td><td>${t.owner}</td><td>${pct(t.completion)}</td><td>${pct(t.passRate)}</td><td>${badge(t.status)}</td></tr>`);
  return `<div class="grid g4">${stat("Eğitim",(state.data.trainingItems||[]).length,"Modül")}${stat("Tamamlama",pct(avg(state.data.trainingItems||[],"completion")),"Ortalama","blue")}${stat("Sınav Başarı",pct(avg(state.data.trainingItems||[],"passRate")),"Kalite","green")}${stat("Zorunlu",1,"Açık","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-title">Eğitim Merkezi</div>${simpleTable(["Eğitim","Sahip","Tamamlama","Başarı","Durum"], rows)}</div><div class="card"><div class="card-title">Sertifikasyon Akışı</div>${miniList(["Bayi sahibi başlangıç kampı", "Eksper teknik yeterlilik sınavı", "Rapor dili ve hukuk sınavı", "Gizli müşteri sonrası tekrar eğitim", "Açılış öncesi final kontrol"])}</div></div>`;
}

function renderSystemManagement(){
  const roles = safeRows(state.data.roles);
  const rows = roles.map(r=>`<tr><td><b>${r.name}</b></td><td>${r.scope}</td><td>${r.description}</td></tr>`);
  return `<div class="grid g4">${stat("Kullanıcı Rolü",roles.length,"Yetki matrisi")}${stat("API Entegrasyonu",4,"WhatsApp, SMS, Google, Muhasebe","blue")}${stat("Log Kaydı","Canlı","Audit izleri","green")}${stat("KVKK Kontrolü","%82","Politika takibi","amber")}</div>
  <div class="grid g2"><div class="card"><div class="card-head"><div><div class="card-title">Sistem Yönetimi</div><div class="card-sub">Yetkiler, kullanıcılar, log kayıtları ve API entegrasyonları tek yönetim başlığı altında.</div></div><button class="btn" onclick="go('settings')">Ayarlar</button></div>${miniList(["Yetkiler", "Kullanıcılar", "Log kayıtları", "API entegrasyonları", "Şube ve paket ayarları", "Rol bazlı erişim"])}</div><div class="card"><div class="card-title">Entegrasyon Durumu</div>${miniList(["WhatsApp API · bağlı", "SMS sağlayıcı · bağlı", "Muhasebe entegrasyonu · izleniyor", "Google yorum takibi · bağlı", "Veritabanı şeması · dokümante"])}</div></div>
  <div class="card"><div class="card-title">Rol ve Yetki Özeti</div>${simpleTable(["Rol","Kapsam","Açıklama"], rows)}</div>`;
}

function renderSettings(){
  return `<div class="grid g3"><div class="card"><div class="card-title">Şube ve Paket Ayarları</div>${miniList(["Şube tanımları", "Paket fiyatları", "Royalty oranı", "Bölge koruma parametresi"])}</div><div class="card"><div class="card-title">Entegrasyonlar</div>${miniList(["WhatsApp API", "SMS sağlayıcı", "Muhasebe entegrasyonu", "Google yorum takibi"])}</div><div class="card"><div class="card-title">Güvenlik</div>${miniList(["Rol bazlı yetki", "Audit log", "KVKK veri saklama", "API anahtar yönetimi"])}</div></div>`;
}

function renderRoles(){ return `<div class="card"><div class="card-head"><div><div class="card-title">Profesyonel Menü Yetkilendirme</div><div class="card-sub">CEO, franchise sahibi, şube müdürü, eksper, çağrı merkezi, muhasebe, kalite ve hukuk rolleri.</div></div></div><table><thead><tr><th>Rol</th><th>Kapsam</th><th>Açıklama</th></tr></thead><tbody>${state.data.roles.map(r=>`<tr><td><b>${r.name}</b></td><td>${r.scope}</td><td>${r.description}</td></tr>`).join("")}</tbody></table></div>`; }
function renderSchema(){
  api("/api/schema")
    .then(schema => {
      if(state.route !== "schema") return;
      $("#view").innerHTML = `<div class="card"><div class="card-title">SQL Şema Taslağı</div><pre>${schema.replace(/[<>&]/g, s=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[s]))}</pre></div>`;
    })
    .catch(err => {
      if(state.route === "schema") $("#view").innerHTML = `<div class="card"><div class="card-title">SQL Şema Taslağı</div><p class="muted">${err.message}</p></div>`;
    });
  return `<div class="card"><div class="card-title">SQL Şema Taslağı</div><p class="muted">Şema yükleniyor...</p></div>`;
}

function openModal(title, html){ $("#modalTitle").textContent = title; $("#modalBody").innerHTML = html; $("#modal").classList.add("open"); }
$("#modalClose").onclick = () => $("#modal").classList.remove("open");
$("#modal").onclick = e => { if(e.target.id === "modal") $("#modal").classList.remove("open"); };
$("#refreshBtn").onclick = load;
$("#newDecisionBtn").onclick = () => openModal("Yeni Karar", `<form class="form" id="decisionForm"><label class="wide">Karar başlığı<input name="title" required placeholder="Yeni şehir açılış kararı"></label><label>Oda<select name="roomId">${state.data.rooms.map(r=>`<option value="${r.id}">${r.title}</option>`).join("")}</select></label><label>Sorumlu<input name="owner" value="CEO"></label><label>Tarih<input name="dueDate" type="date"></label><label class="wide">Kanıt / Not<textarea name="evidence"></textarea></label><button class="btn primary wide">Kaydet</button></form>`);
document.addEventListener("submit", async e => {
  if(e.target.id !== "decisionForm") return;
  e.preventDefault();
  await api("/api/decisions", {method:"POST", body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))});
  $("#modal").classList.remove("open");
  await load();
});

window.addEventListener("hashchange", () => go(location.hash.replace("#","") || "dashboard", false));
load().catch(err => {
  $("#apiState").textContent = "API hata";
  $("#view").innerHTML = `<div class="card"><h2>API bağlantısı kurulamadı</h2><p class="muted">${err.message}</p></div>`;
});
