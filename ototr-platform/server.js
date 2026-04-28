const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 5177);
const root = __dirname;
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const schemaPath = path.join(root, "database", "schema.sql");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function now() {
  return new Date().toISOString();
}

const seed = {
  meta: {
    company: "OTOTR",
    product: "ERP + CRM Genel Merkez Platformu",
    version: "0.1.0",
    updatedAt: now()
  },
  roles: [
    { id: "ceo", name: "CEO / Genel Müdür", scope: "all", description: "Tüm modüller, karar odaları, finans, hukuk ve kriz ekranları açık." },
    { id: "franchise_owner", name: "Franchise Sahibi", scope: "own_branches", description: "Kendi şubeleri, personeli, ciro ve kalite kayıtları." },
    { id: "branch_manager", name: "Şube Müdürü", scope: "branch", description: "Şube operasyonu, randevu, personel, rapor ve müşteri takibi." },
    { id: "expert", name: "Eksper", scope: "operation", description: "Ekspertiz operasyonu, test akışı ve rapor yazımı." },
    { id: "call_center", name: "Çağrı Merkezi", scope: "crm", description: "CRM, lead, randevu, WhatsApp ve takip görevleri." },
    { id: "finance", name: "Muhasebe / Finans", scope: "finance", description: "Tahsilat, royalty, kasa, bütçe ve prim kayıtları." },
    { id: "quality", name: "Kalite Denetçi", scope: "quality", description: "Denetim, gizli müşteri, rapor kalite puanı ve düzeltme planları." },
    { id: "legal", name: "Hukuk", scope: "legal", description: "Sözleşme, KVKK, tazmin, itiraz ve marka koruma dosyaları." }
  ],
  navigation: [
    { id: "dashboard", label: "CEO Dashboard", room: "Ana Merkez Room" },
    { id: "appointments", label: "Randevular", room: "CRM Room" },
    { id: "crm", label: "CRM / Leads", room: "CRM Room" },
    { id: "customers", label: "Müşteriler", room: "CRM Room" },
    { id: "vehicles", label: "Araçlar", room: "Operasyon Room" },
    { id: "operations", label: "Ekspertiz Operasyon", room: "Operasyon Room" },
    { id: "reports", label: "Raporlar", room: "Operasyon Room" },
    { id: "finance", label: "Finans", room: "Finance Room" },
    { id: "franchise", label: "Franchise Yönetimi", room: "Franchise Büyüme Room" },
    { id: "hr", label: "Personel / İK", room: "Operasyon Room" },
    { id: "marketing", label: "Pazarlama", room: "Satış & Pazarlama Room" },
    { id: "support", label: "Destek Talepleri", room: "Kriz Merkezi" },
    { id: "academy", label: "Eğitim Merkezi", room: "Legacy Room" },
    { id: "settings", label: "Ayarlar", room: "Sistem Mimarisi" }
  ],
  rooms: [
    { id: "main", title: "Ana Merkez Room", owner: "CEO", firstMessage: "OTOTR ana merkez sohbetidir. Tüm büyük kararları burada yöneteceğiz.", scope: ["marka vizyonu", "büyük yatırımlar", "franchise stratejisi", "yeni şehir açılışları", "yıllık plan", "kriz kararları"] },
    { id: "crm", title: "CRM Room", owner: "Müşteri Deneyimi", firstMessage: "OTOTR CRM odası. Müşteri, bayi ve operasyon verisini tek sistemde yöneteceğiz.", scope: ["müşteri CRM", "bayi CRM", "operasyon CRM", "finans CRM", "pazarlama CRM"] },
    { id: "franchise", title: "Franchise Büyüme Room", owner: "Franchise Satış", firstMessage: "OTOTR franchise büyüme odası. Türkiye’nin en güçlü ekspertiz franchise modelini kuracağız.", scope: ["bayi bulma", "bayi satış sistemi", "royalty modeli", "eğitim", "sözleşme", "yeni şehir planı"] },
    { id: "marketing", title: "Satış & Pazarlama Room", owner: "Pazarlama", firstMessage: "OTOTR satış ve pazarlama odası. Lead üretim ve satış makinesi kuracağız.", scope: ["Google Ads", "Meta Ads", "WhatsApp satış", "SEO", "kampanya", "yerel dominasyon"] },
    { id: "finance", title: "Finance Room", owner: "Finans", firstMessage: "OTOTR finans odası. Kurumsal finans sistemi kuracağız.", scope: ["ciro", "EBITDA", "royalty", "cashflow", "yatırımcı sunumu"] },
    { id: "operation", title: "Operasyon Room", owner: "Operasyon", firstMessage: "OTOTR operasyon odası. Türkiye’nin en disiplinli ekspertiz operasyonunu kuracağız.", scope: ["şube süreçleri", "ekspertiz akışı", "personel performansı", "rapor kalitesi", "memnuniyet"] },
    { id: "legacy", title: "Legacy Room", owner: "Kurucu Ofisi", firstMessage: "OTOTR kültür ve miras odası. Kazançtan önce itibarı, büyümeden önce sistemi, tabeladan önce güveni kuracağız.", scope: ["manifesto", "şirket kültürü", "aile vizyonu", "kurucu değerler", "çalışan yemini"] }
  ],
  branches: [
    { id: "BR-001", name: "Bursa Nilüfer", city: "Bursa", region: "Marmara", status: "Aktif", manager: "Kadir Başaran", revenue: 1425000, royalty: 128250, reports: 872, nps: 72, googleScore: 4.8, googleReviewUrl: "https://g.page/r/ototr-bursa-nilufer/review", qualityScore: 94, riskLevel: "Düşük", growthRate: 18 },
    { id: "BR-002", name: "İstanbul Ataşehir", city: "İstanbul", region: "Marmara", status: "Aktif", manager: "Selin Aras", revenue: 1880000, royalty: 169200, reports: 1094, nps: 68, googleScore: 4.6, googleReviewUrl: "https://g.page/r/ototr-atasehir/review", qualityScore: 90, riskLevel: "Orta", growthRate: 11 },
    { id: "BR-003", name: "Ankara Çukurambar", city: "Ankara", region: "İç Anadolu", status: "Aktif", manager: "Emre Sarı", revenue: 1186000, royalty: 106740, reports: 741, nps: 61, googleScore: 4.4, googleReviewUrl: "https://g.page/r/ototr-cukurambar/review", qualityScore: 84, riskLevel: "Orta", growthRate: -4 },
    { id: "BR-004", name: "Kocaeli İzmit", city: "Kocaeli", region: "Marmara", status: "Aktif", manager: "Mehmet Aydın", revenue: 965000, royalty: 86850, reports: 612, nps: 74, googleScore: 4.9, googleReviewUrl: "https://g.page/r/ototr-izmit/review", qualityScore: 96, riskLevel: "Düşük", growthRate: 22 },
    { id: "BR-005", name: "İzmir Bornova", city: "İzmir", region: "Ege", status: "Açılış", manager: "Derya Koç", revenue: 0, royalty: 0, reports: 0, nps: 0, googleScore: 0, googleReviewUrl: "https://g.page/r/ototr-bornova/review", qualityScore: 81, riskLevel: "Orta", growthRate: 0 },
    { id: "BR-006", name: "Antalya Kepez", city: "Antalya", region: "Akdeniz", status: "Kurulum", manager: "Atama bekliyor", revenue: 0, royalty: 0, reports: 0, nps: 0, googleScore: 0, googleReviewUrl: "https://g.page/r/ototr-kepez/review", qualityScore: 68, riskLevel: "Yüksek", growthRate: 0 }
  ],
  branchMetrics: {
    "BR-001": { capacity: 78, averageTicket: 1634, premiumConversion: 41, averageWait: "18 dk", sla: 96, complaints: 4, staff: 9, trainingCompletion: 88, inventoryStatus: "%94 hazır", profit: 382000, actions: ["EV Full paketi Bursa pilotunda agresif satılmalı", "Bölge ikinci şube fizibilitesi Q3 içinde açılmalı", "Google yorum yanıt standardı örnek şube olarak dokümante edilmeli"] },
    "BR-002": { capacity: 86, averageTicket: 1718, premiumConversion: 38, averageWait: "24 dk", sla: 91, complaints: 9, staff: 11, trainingCompletion: 81, inventoryStatus: "%89 hazır", profit: 506000, actions: ["Araç kabul süreci kamera denetimiyle tekrar kontrol edilmeli", "Kurumsal filo trafiği için ayrı teslim bankosu önerilir", "Ataşehir fiyat esnekliği premium paket lehine test edilmeli"] },
    "BR-003": { capacity: 63, averageTicket: 1601, premiumConversion: 34, averageWait: "31 dk", sla: 84, complaints: 13, staff: 7, trainingCompletion: 69, inventoryStatus: "%92 hazır", profit: 214000, actions: ["Rapor anlatımı eğitimi zorunlu tekrar atanmalı", "Royalty gecikmesi için finans görüşmesi açılmalı", "Google puanı 4.5 altı alarmı 7 günlük aksiyon planına bağlanmalı"] }
  },
  leads: [
    { id: "LD-2401", name: "Murat Demir", city: "Konya", type: "Franchise adayı", stage: "Ön Görüşme", score: 82, budget: "5M - 7M TL", source: "Franchise formu", owner: "Franchise Satış", nextStep: "Finansal yeterlilik görüşmesi", phone: "0532 444 18 42" },
    { id: "LD-2402", name: "Ayşe Karaca", city: "Kayseri", type: "Franchise adayı", stage: "Yatırımcı Sunumu", score: 76, budget: "3.5M - 5M TL", source: "Referans", owner: "CEO Ofisi", nextStep: "Lokasyon dosyası", phone: "0544 182 90 11" },
    { id: "LD-2403", name: "Mert Otomotiv", city: "İstanbul", type: "Kurumsal müşteri", stage: "Teklif", score: 88, budget: "Aylık 180 araç", source: "B2B satış", owner: "Kurumsal Satış", nextStep: "Pilot fiyat onayı", phone: "0216 555 33 10" },
    { id: "LD-2404", name: "Akdeniz Rent A Car", city: "Antalya", type: "Filo anlaşması", stage: "Sözleşme", score: 91, budget: "Aylık 260 araç", source: "Google", owner: "Kurumsal Satış", nextStep: "Hukuk revizyonu", phone: "0242 333 19 88" }
  ],
  leadScores: {
    "LD-2401": { finance: 86, characterScore: 78, location: 91, brandFit: 84, closingProbability: 72, investment: "6.2M TL", district: "Konya Selçuklu", notes: ["Yerel otomotiv çevresi güçlü", "Lokasyon için iki alternatif sundu", "Finansal evrak ön kontrol bekliyor"], risks: ["İlk kez franchise işletmesi yönetecek"], actions: ["Finansal yeterlilik görüşmesi", "Lokasyon keşif randevusu", "CEO kısa tanışma araması"] },
    "LD-2402": { finance: 74, characterScore: 88, location: 79, brandFit: 82, closingProbability: 66, investment: "4.4M TL", district: "Kayseri Melikgazi", notes: ["Aile işletmesi tecrübesi var", "Operasyon disiplinine yatkın"], risks: ["Tabela ve kira maliyeti hassas"], actions: ["Yatırımcı sunumu gönder", "Bölge koruma koşullarını anlat"] }
  },
  customers: [
    { id: "CU-1001", name: "Hasan Kaya", phone: "0532 118 20 16", type: "Bireysel", city: "Bursa", segment: "Premium alıcı", visits: 3, nps: 9, loyaltyPoints: 420, source: "Google Maps", nextAction: "30 gün sonra tekrar satış kontrolü" },
    { id: "CU-1002", name: "Duru Lojistik", phone: "0216 552 44 19", type: "Filo", city: "İstanbul", segment: "Kurumsal filo", visits: 18, nps: 8, loyaltyPoints: 1280, source: "Kurumsal satış", nextAction: "Aylık filo raporu gönder" },
    { id: "CU-1003", name: "Elif Yaman", phone: "0543 901 33 61", type: "Bireysel", city: "Ankara", segment: "İlk kez gelen", visits: 1, nps: 7, loyaltyPoints: 80, source: "Instagram", nextAction: "Memnuniyet araması" },
    { id: "CU-1004", name: "Mert Otomotiv", phone: "0216 555 33 10", type: "Galeri", city: "Kocaeli", segment: "B2B partner", visits: 42, nps: 8, loyaltyPoints: 2200, source: "B2B satış", nextAction: "Toplu teklif yenileme" }
  ],
  appointments: [
    { id: "AP-901", customerId: "CU-1001", branchId: "BR-001", time: "09:30", vehicle: "34 EFL 918 - BMW 320i", package: "Full + Güven Paketi", status: "Devam ediyor" },
    { id: "AP-902", customerId: "CU-1002", branchId: "BR-002", time: "10:15", vehicle: "34 DLR 022 - Ford Transit", package: "Filo Kontrol", status: "Randevu geldi" },
    { id: "AP-903", customerId: "CU-1003", branchId: "BR-003", time: "11:00", vehicle: "06 BYN 404 - Toyota Corolla", package: "Standart", status: "Bekliyor" },
    { id: "AP-904", customerId: "CU-1004", branchId: "BR-004", time: "13:30", vehicle: "41 MOT 081 - Audi A4", package: "Kurumsal Full", status: "Tamamlandı" }
  ],
  reports: [
    { id: "RP-9021", customerId: "CU-1001", branchId: "BR-001", plate: "16 AKS 842", model: "Mercedes C200 2021", score: 8.7, result: "Satın alınabilir", riskLevel: "Düşük", estimatedPrice: 1720000, expert: "Onur Çelik" },
    { id: "RP-9022", customerId: "CU-1003", branchId: "BR-003", plate: "06 KRL 114", model: "Volkswagen Passat 2019", score: 6.4, result: "Pazarlıkla alınabilir", riskLevel: "Orta", estimatedPrice: 1145000, expert: "Emre Sarı" },
    { id: "RP-9023", customerId: "CU-1004", branchId: "BR-002", plate: "34 HSR 771", model: "Renault Megane 2020", score: 4.8, result: "Riskli", riskLevel: "Yüksek", estimatedPrice: 780000, expert: "Barış Ünver" }
  ],
  vehicles: [
    { id: "VH-771", plate: "16 AKS 842", brand: "Mercedes", model: "C200", year: 2021, km: 64000, branchId: "BR-001", customerId: "CU-1001", lastReportId: "RP-9021", riskLevel: "Düşük", repeatWarning: "Yok" },
    { id: "VH-772", plate: "06 KRL 114", brand: "Volkswagen", model: "Passat", year: 2019, km: 118000, branchId: "BR-003", customerId: "CU-1003", lastReportId: "RP-9022", riskLevel: "Orta", repeatWarning: "Boya kalınlığı tekrar ölçülsün" },
    { id: "VH-773", plate: "34 HSR 771", brand: "Renault", model: "Megane", year: 2020, km: 146000, branchId: "BR-002", customerId: "CU-1004", lastReportId: "RP-9023", riskLevel: "Yüksek", repeatWarning: "Şasi işlem riski" },
    { id: "VH-774", plate: "34 DLR 022", brand: "Ford", model: "Transit", year: 2022, km: 82000, branchId: "BR-002", customerId: "CU-1002", lastReportId: null, riskLevel: "Düşük", repeatWarning: "Filo periyodik kontrol" }
  ],
  staff: [
    { id: "ST-101", name: "Onur Çelik", role: "Baş Eksper", branchId: "BR-001", productivity: 92, vehiclesToday: 7, errorRate: 1.4, nps: 9.3, attendance: 98, bonus: 18500 },
    { id: "ST-102", name: "Selin Aras", role: "Şube Müdürü", branchId: "BR-002", productivity: 88, vehiclesToday: 9, errorRate: 2.1, nps: 8.7, attendance: 96, bonus: 22200 },
    { id: "ST-103", name: "Emre Sarı", role: "Eksper", branchId: "BR-003", productivity: 71, vehiclesToday: 5, errorRate: 4.8, nps: 7.4, attendance: 91, bonus: 7200 },
    { id: "ST-104", name: "Ayhan Koç", role: "Kaporta Uzmanı", branchId: "BR-004", productivity: 94, vehiclesToday: 8, errorRate: 1.1, nps: 9.1, attendance: 99, bonus: 19100 }
  ],
  operations: [
    { id: "OP-1001", branchId: "BR-001", vehicle: "BMW 320i", station: "Kaporta", expert: "Onur Çelik", startedAt: "09:35", eta: "10:20", status: "Devam ediyor", delayRisk: "Düşük" },
    { id: "OP-1002", branchId: "BR-002", vehicle: "Ford Transit", station: "Dyno", expert: "Barış Ünver", startedAt: "10:12", eta: "11:05", status: "Rapor bekliyor", delayRisk: "Orta" },
    { id: "OP-1003", branchId: "BR-003", vehicle: "Toyota Corolla", station: "OBD", expert: "Emre Sarı", startedAt: "10:50", eta: "11:35", status: "Testte", delayRisk: "Yüksek" },
    { id: "OP-1004", branchId: "BR-004", vehicle: "Audi A4", station: "Teslim", expert: "Ayhan Koç", startedAt: "13:28", eta: "14:05", status: "Tamamlandı", delayRisk: "Düşük" }
  ],
  marketingCampaigns: [
    { id: "MK-301", name: "Bursa 30 Gün Lead Yağmuru", channel: "Google Ads", branchId: "BR-001", spend: 186000, leads: 612, appointments: 286, sales: 219, cpl: 304, roas: 5.8, status: "Aktif" },
    { id: "MK-302", name: "Türkiye Franchise Başvuru Hunisi", channel: "Meta + Landing", branchId: null, spend: 242000, leads: 184, appointments: 42, sales: 8, cpl: 1315, roas: 9.4, status: "Aktif" },
    { id: "MK-303", name: "Hafta İçi Boş Saat Doldurma", channel: "WhatsApp", branchId: "BR-003", spend: 28000, leads: 146, appointments: 91, sales: 64, cpl: 192, roas: 4.2, status: "Optimizasyon" }
  ],
  legalCases: [
    { id: "LG-801", title: "Ataşehir rapor itirazı", type: "Rapor itirazı", branchId: "BR-002", risk: "Yüksek", owner: "Hukuk + Kalite", status: "Delil toplama", dueDate: "2026-04-29", exposure: 185000 },
    { id: "LG-802", title: "Konya franchise ön sözleşme", type: "Franchise sözleşme", branchId: null, risk: "Orta", owner: "Hukuk", status: "Revizyon", dueDate: "2026-05-05", exposure: 0 },
    { id: "LG-803", title: "KVKK açık rıza metni güncelleme", type: "Uyum", branchId: null, risk: "Orta", owner: "Uyum", status: "Yönetim onayı", dueDate: "2026-05-02", exposure: 0 },
    { id: "LG-804", title: "Marka kullanım ihlali taraması", type: "Marka koruma", branchId: null, risk: "Düşük", owner: "Hukuk", status: "Takip", dueDate: "2026-05-12", exposure: 45000 }
  ],
  trainingItems: [
    { id: "TR-401", title: "Rapor dili ve hukuki koruma", audience: "Eksper", completion: 74, passRate: 88, owner: "Kalite", status: "Zorunlu" },
    { id: "TR-402", title: "Franchise açılış SOP", audience: "Bayi sahibi", completion: 61, passRate: 91, owner: "Operasyon", status: "Aktif" },
    { id: "TR-403", title: "WhatsApp satış scriptleri", audience: "Çağrı merkezi", completion: 83, passRate: 94, owner: "CRM", status: "Aktif" },
    { id: "TR-404", title: "Luxury müşteri teslim deneyimi", audience: "Şube müdürü", completion: 58, passRate: 86, owner: "Müşteri Deneyimi", status: "Pilot" }
  ],
  businessIntelligence: {
    revenueTrend: [3.8, 4.1, 4.4, 4.2, 4.8, 5.1, 5.46],
    funnel: [
      { label: "Görüldü", value: 84200 },
      { label: "Tıkladı", value: 12640 },
      { label: "Lead", value: 942 },
      { label: "Randevu", value: 419 },
      { label: "Geldi", value: 336 },
      { label: "Satın aldı", value: 278 }
    ],
    cityScores: [
      { city: "Konya", demand: 91, competition: 54, investment: 86, priority: "Aç" },
      { city: "Kayseri", demand: 78, competition: 48, investment: 74, priority: "Pilot" },
      { city: "Samsun", demand: 72, competition: 41, investment: 69, priority: "Araştır" },
      { city: "Gaziantep", demand: 88, competition: 63, investment: 82, priority: "Aç" }
    ],
    ceoAlerts: [
      "Ankara Çukurambar Google puanı 4.5 altı; 7 günlük aksiyon planı açılmalı.",
      "Ataşehir rapor itirazı hukuki risk limitini aşıyor; kalite denetimi CEO gündemine alınmalı.",
      "Konya franchise adayı finans ve lokasyon skoru yüksek; ön onay toplantısı önerilir."
    ]
  },
  complaints: [
    { id: "CP-1001", customerId: "CU-1004", branchId: "BR-002", source: "Google review detection", category: "Wrong report claim", priority: "Critical", stage: "Investigating", owner: "Legal Team", regionalOwner: "Marmara Bölge", createdAt: "2026-04-28T09:12:00+03:00", firstResponseMinutes: 18, resolutionHours: 36, slaStatus: "At Risk", reopened: false, summary: "Müşteri şasi işlem riskinin raporda yeterince anlatılmadığını belirtti.", requestedAction: "Legal review", reputationRisk: 92 },
    { id: "CP-1002", customerId: "CU-1003", branchId: "BR-003", source: "WhatsApp complaint intake", category: "Delay / waiting time", priority: "High", stage: "Assigned", owner: "Branch Manager", regionalOwner: "İç Anadolu Bölge", createdAt: "2026-04-28T10:06:00+03:00", firstResponseMinutes: 42, resolutionHours: 18, slaStatus: "Breached", reopened: true, summary: "Randevu saati geçmesine rağmen teslimin 35 dakika uzadığı bildirildi.", requestedAction: "Manager callback", reputationRisk: 71 },
    { id: "CP-1003", customerId: "CU-1001", branchId: "BR-001", source: "QR feedback form", category: "Pricing issue", priority: "Medium", stage: "Waiting Customer", owner: "HQ Customer Experience Team", regionalOwner: "Marmara Bölge", createdAt: "2026-04-27T16:20:00+03:00", firstResponseMinutes: 9, resolutionHours: 8, slaStatus: "On Track", reopened: false, summary: "Ek paket fiyatı satış öncesi daha net anlatılmalıydı.", requestedAction: "Explanation accepted", reputationRisk: 34 },
    { id: "CP-1004", customerId: "CU-1002", branchId: "BR-002", source: "Call center entry", category: "Communication issue", priority: "Low", stage: "Resolved", owner: "HQ Customer Experience Team", regionalOwner: "Marmara Bölge", createdAt: "2026-04-26T11:10:00+03:00", firstResponseMinutes: 6, resolutionHours: 3, slaStatus: "On Track", reopened: false, summary: "Filo müşterisine aylık rapor e-postası gecikmişti.", requestedAction: "Goodwill gift", reputationRisk: 19 }
  ],
  complaintMessages: [
    { id: "CM-901", complaintId: "CP-1001", author: "Mert Otomotiv", channel: "Google", visibility: "public", message: "Raporda kritik riskin anlatımı yetersiz kaldı.", createdAt: "2026-04-28T09:12:00+03:00" },
    { id: "CM-902", complaintId: "CP-1001", author: "Hukuk + Kalite", channel: "Internal note", visibility: "private", message: "Kamera kaydı, fotoğraf kanıtı ve eksper notu birlikte incelenecek.", createdAt: "2026-04-28T09:24:00+03:00" },
    { id: "CM-903", complaintId: "CP-1002", author: "Elif Yaman", channel: "WhatsApp", visibility: "customer", message: "Randevu saatimde geldim ama çok bekledim.", createdAt: "2026-04-28T10:06:00+03:00" }
  ],
  complaintActions: [
    { id: "CA-701", complaintId: "CP-1001", action: "Legal review", owner: "Hukuk", status: "Open", dueAt: "2026-04-28T18:00:00+03:00" },
    { id: "CA-702", complaintId: "CP-1001", action: "Re-inspection free", owner: "Ataşehir Şube", status: "Pending Customer", dueAt: "2026-04-29T12:00:00+03:00" },
    { id: "CA-703", complaintId: "CP-1002", action: "Manager callback", owner: "Ankara Çukurambar", status: "Open", dueAt: "2026-04-28T13:00:00+03:00" },
    { id: "CA-704", complaintId: "CP-1004", action: "Goodwill gift", owner: "Müşteri Deneyimi", status: "Done", dueAt: "2026-04-26T15:00:00+03:00" }
  ],
  complaintSatisfaction: [
    { id: "CS-601", complaintId: "CP-1004", stars: 5, nps: 9, comment: "Hızlı dönüş yapıldı, filo raporu aynı gün gönderildi." },
    { id: "CS-602", complaintId: "CP-1003", stars: 4, nps: 7, comment: "Açıklama yeterliydi, fiyat bilgilendirmesi daha erken olmalı." }
  ],
  googleReviews: [
    { id: "GR-501", branchId: "BR-002", customerId: "CU-1004", complaintId: "CP-1001", reviewer: "Mert Otomotiv", rating: 2, previousRating: 1, status: "Recovered", reviewDate: "2026-04-28", responseMinutes: 34, text: "Merkez aradı, tekrar inceleme ve hukuki açıklama süreci başladı." },
    { id: "GR-502", branchId: "BR-003", customerId: "CU-1003", complaintId: "CP-1002", reviewer: "Elif Yaman", rating: 2, previousRating: 2, status: "Negative", reviewDate: "2026-04-28", responseMinutes: 128, text: "Bekleme süresi uzundu, dönüş bekliyorum." },
    { id: "GR-503", branchId: "BR-001", customerId: "CU-1001", complaintId: null, reviewer: "Hasan Kaya", rating: 5, previousRating: 5, status: "Positive", reviewDate: "2026-04-27", responseMinutes: 22, text: "Rapor anlatımı çok netti, teşekkürler." },
    { id: "GR-504", branchId: "BR-004", customerId: "CU-1004", complaintId: null, reviewer: "Mert Otomotiv", rating: 5, previousRating: 4, status: "Updated", reviewDate: "2026-04-26", responseMinutes: 16, text: "Kurumsal süreç hızlı ilerledi." }
  ],
  reviewChanges: [
    { id: "RC-401", reviewId: "GR-501", branchId: "BR-002", fromRating: 1, toRating: 2, changeType: "updated", changedAt: "2026-04-28T12:10:00+03:00" },
    { id: "RC-402", reviewId: "GR-504", branchId: "BR-004", fromRating: 4, toRating: 5, changeType: "updated", changedAt: "2026-04-26T18:42:00+03:00" }
  ],
  reviewRecoveryRewards: [
    { id: "RR-301", reviewId: "GR-501", branchId: "BR-002", fromRating: 1, toRating: 4, rewardPoints: 18, rewardStatus: "Pending verification", reason: "Complaint resolved and review improved" },
    { id: "RR-302", reviewId: "GR-504", branchId: "BR-004", fromRating: 4, toRating: 5, rewardPoints: 6, rewardStatus: "Approved", reason: "Fast response and positive update" }
  ],
  whatsappConversations: [
    { id: "WA-201", phone: "0532 118 20 16", customerId: "CU-1001", leadId: null, branchId: "BR-001", owner: "Bursa Nilüfer Satış", team: "Branch", stage: "Booked", tags: ["VIP", "Repeat customer"], firstReplyMinutes: 4, messagesCount: 12, status: "Open", lastMessageAt: "2026-04-28T10:38:00+03:00", lostReason: null },
    { id: "WA-202", phone: "0543 901 33 61", customerId: "CU-1003", leadId: null, branchId: "BR-003", owner: "Complaint Desk", team: "HQ Complaint", stage: "Complaint follow-up", tags: ["Complaint risk", "Price sensitive"], firstReplyMinutes: 22, messagesCount: 9, status: "Escalated", lastMessageAt: "2026-04-28T10:44:00+03:00", lostReason: null },
    { id: "WA-203", phone: "0555 120 44 22", customerId: null, leadId: "LD-2405", branchId: "BR-005", owner: "Franchise Sales", team: "HQ Sales", stage: "New Inquiry", tags: ["Hot lead"], firstReplyMinutes: 7, messagesCount: 5, status: "Open", lastMessageAt: "2026-04-28T11:02:00+03:00", lostReason: null },
    { id: "WA-204", phone: "0216 555 33 10", customerId: "CU-1004", leadId: "LD-2403", branchId: "BR-002", owner: "Kurumsal Satış", team: "Sales", stage: "Won", tags: ["Fleet customer", "VIP"], firstReplyMinutes: 3, messagesCount: 18, status: "Closed", lastMessageAt: "2026-04-27T17:16:00+03:00", lostReason: null }
  ],
  whatsappMessages: [
    { id: "WM-1001", conversationId: "WA-201", direction: "in", message: "Bugün 13:30 randevum kesin mi?", templateId: null, createdAt: "2026-04-28T10:34:00+03:00" },
    { id: "WM-1002", conversationId: "WA-201", direction: "out", message: "Randevunuz kesinleşti. Konum ve hazırlık bilgisini iletiyorum.", templateId: "WT-01", createdAt: "2026-04-28T10:38:00+03:00" },
    { id: "WM-1003", conversationId: "WA-202", direction: "in", message: "Şikayetim için müdür dönüşü bekliyorum.", templateId: null, createdAt: "2026-04-28T10:44:00+03:00" },
    { id: "WM-1004", conversationId: "WA-203", direction: "in", message: "İzmir franchise için şartları öğrenmek istiyorum.", templateId: null, createdAt: "2026-04-28T11:02:00+03:00" }
  ],
  whatsappTemplates: [
    { id: "WT-01", name: "Appointment reminder", useCase: "Randevu hatırlatma", status: "Approved", avgConversion: 42 },
    { id: "WT-02", name: "Inspection ready", useCase: "Rapor hazır", status: "Approved", avgConversion: 68 },
    { id: "WT-03", name: "Review request", useCase: "Google yorum talebi", status: "Approved", avgConversion: 31 },
    { id: "WT-04", name: "Complaint follow-up", useCase: "Şikayet çözüm takibi", status: "Approved", avgConversion: 54 },
    { id: "WT-05", name: "Win-back campaign", useCase: "Kaybedilen lead geri kazanım", status: "Draft", avgConversion: 18 }
  ],
  reputationScores: [
    { branchId: "BR-001", officialReviewUrl: "https://g.page/r/ototr-bursa-nilufer/review", averageRating: 4.8, totalReviews: 1284, newReviews: 42, negativeReviews: 1, updatedReviews: 3, deletedReviews: 0, responseSpeedMinutes: 22, recoveryCount: 3, reviewsGrowth: 8.2, positiveScore: 94, riskLevel: "Low" },
    { branchId: "BR-002", officialReviewUrl: "https://g.page/r/ototr-atasehir/review", averageRating: 4.18, totalReviews: 1760, newReviews: 58, negativeReviews: 6, updatedReviews: 4, deletedReviews: 1, responseSpeedMinutes: 48, recoveryCount: 2, reviewsGrowth: 6.1, positiveScore: 71, riskLevel: "High" },
    { branchId: "BR-003", officialReviewUrl: "https://g.page/r/ototr-cukurambar/review", averageRating: 4.38, totalReviews: 940, newReviews: 31, negativeReviews: 4, updatedReviews: 1, deletedReviews: 0, responseSpeedMinutes: 86, recoveryCount: 1, reviewsGrowth: 3.8, positiveScore: 66, riskLevel: "Medium" },
    { branchId: "BR-004", officialReviewUrl: "https://g.page/r/ototr-izmit/review", averageRating: 4.92, totalReviews: 712, newReviews: 27, negativeReviews: 0, updatedReviews: 2, deletedReviews: 0, responseSpeedMinutes: 16, recoveryCount: 4, reviewsGrowth: 9.5, positiveScore: 97, riskLevel: "Low" }
  ],
  executiveAlerts: [
    { id: "EA-001", type: "Branch rating below threshold", branchId: "BR-002", severity: "Critical", metric: "Google rating 4.18", threshold: "4.2", message: "İstanbul Ataşehir puanı 4.2 altına indi; şikayet ve yorum kurtarma planı açılmalı.", owner: "CEO + Müşteri Deneyimi", status: "Open", createdAt: "2026-04-28T09:20:00+03:00" },
    { id: "EA-002", type: "Complaint surge", branchId: "BR-003", severity: "High", metric: "+38%", threshold: "+30%", message: "Ankara Çukurambar şikayet hacmi haftalık bazda %38 arttı.", owner: "Operasyon", status: "Open", createdAt: "2026-04-28T10:15:00+03:00" },
    { id: "EA-003", type: "WhatsApp response above SLA", branchId: "BR-003", severity: "Medium", metric: "22 dk", threshold: "15 dk", message: "Şikayet masası WhatsApp ilk yanıt SLA üstünde.", owner: "CRM", status: "Investigating", createdAt: "2026-04-28T10:48:00+03:00" },
    { id: "EA-004", type: "Royalty overdue", branchId: "BR-003", severity: "High", metric: "1 gün gecikme", threshold: "0 gün", message: "Royalty ödeme planı finans gündemine alınmalı.", owner: "Finans", status: "Open", createdAt: "2026-04-28T08:40:00+03:00" },
    { id: "EA-005", type: "Report error spike", branchId: "BR-002", severity: "Critical", metric: "+24%", threshold: "+15%", message: "Rapor itirazları ve kalite düzeltmeleri birlikte yükseldi.", owner: "Kalite + Hukuk", status: "Open", createdAt: "2026-04-28T11:05:00+03:00" }
  ],
  tickets: [
    { id: "TK-501", title: "Google puanı 4.5 altı alarmı", branchId: "BR-003", severity: "Orta", sla: "18 saat", owner: "Müşteri Deneyimi" },
    { id: "TK-502", title: "Yanlış yorumlanan rapor itirazı", branchId: "BR-002", severity: "Yüksek", sla: "3 saat", owner: "Hukuk + Kalite" }
  ],
  decisions: [
    { id: "DC-001", roomId: "main", title: "Konya franchise adayı finansal yeterlilik görüşmesine alınacak", owner: "CEO", status: "Açık", dueDate: "2026-05-03", evidence: "Lead skoru 82/100" },
    { id: "DC-002", roomId: "finance", title: "Ankara royalty gecikmesi için ödeme planı hazırlanacak", owner: "Finans", status: "Açık", dueDate: "2026-04-30", evidence: "1 gün gecikme" }
  ],
  auditLogs: []
};

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf8");
    return;
  }
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  let changed = false;
  for (const [key, value] of Object.entries(seed)) {
    if (db[key] === undefined) {
      db[key] = value;
      changed = true;
    }
  }
  if (changed) {
    db.meta = { ...seed.meta, ...db.meta, updatedAt: now() };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
  }
  const branchDefaults = Object.fromEntries(seed.branches.map(branch => [branch.id, branch]));
  let branchChanged = false;
  db.branches.forEach(branch => {
    const defaults = branchDefaults[branch.id];
    if (defaults?.googleReviewUrl && !branch.googleReviewUrl) {
      branch.googleReviewUrl = defaults.googleReviewUrl;
      branchChanged = true;
    }
  });
  if (branchChanged) {
    db.meta = { ...seed.meta, ...db.meta, updatedAt: now() };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  db.meta.updatedAt = now();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function send(res, status, payload, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
    return res.end(payload);
  }
  res.end(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (err) { reject(err); }
    });
  });
}

function withRelations(db) {
  const branchMap = Object.fromEntries(db.branches.map(b => [b.id, b]));
  const customerMap = Object.fromEntries(db.customers.map(c => [c.id, c]));
  return {
    ...db,
    appointments: db.appointments.map(a => ({ ...a, branch: branchMap[a.branchId], customer: customerMap[a.customerId] })),
    reports: db.reports.map(r => ({ ...r, branch: branchMap[r.branchId], customer: customerMap[r.customerId] })),
    complaints: (db.complaints || []).map(c => ({ ...c, branch: branchMap[c.branchId], customer: customerMap[c.customerId] })),
    googleReviews: (db.googleReviews || []).map(r => ({ ...r, branch: branchMap[r.branchId], customer: customerMap[r.customerId] })),
    whatsappConversations: (db.whatsappConversations || []).map(c => ({ ...c, branch: branchMap[c.branchId], customer: customerMap[c.customerId] })),
    reputationScores: (db.reputationScores || []).map(s => ({ ...s, branch: branchMap[s.branchId] })),
    executiveAlerts: (db.executiveAlerts || []).map(a => ({ ...a, branch: branchMap[a.branchId] }))
  };
}

function branchProfile(db, idValue) {
  const branch = db.branches.find(b => b.id === idValue);
  if (!branch) return null;
  return {
    branch,
    metrics: db.branchMetrics[idValue] || {},
    appointments: db.appointments.filter(a => a.branchId === idValue),
    reports: db.reports.filter(r => r.branchId === idValue),
    tickets: db.tickets.filter(t => t.branchId === idValue),
    complaints: (db.complaints || []).filter(c => c.branchId === idValue),
    googleReviews: (db.googleReviews || []).filter(r => r.branchId === idValue),
    reputation: (db.reputationScores || []).find(s => s.branchId === idValue) || null,
    executiveAlerts: (db.executiveAlerts || []).filter(a => a.branchId === idValue)
  };
}

function leadProfile(db, idValue) {
  const lead = db.leads.find(l => l.id === idValue);
  if (!lead) return null;
  return { lead, score: db.leadScores[idValue] || null };
}

function customerProfile(db, idValue) {
  const customer = db.customers.find(c => c.id === idValue);
  if (!customer) return null;
  return {
    customer,
    appointments: db.appointments.filter(a => a.customerId === idValue),
    reports: db.reports.filter(r => r.customerId === idValue),
    complaints: (db.complaints || []).filter(c => c.customerId === idValue),
    whatsappConversations: (db.whatsappConversations || []).filter(c => c.customerId === idValue),
    googleReviews: (db.googleReviews || []).filter(r => r.customerId === idValue)
  };
}

function serveStatic(req, res, url) {
  if (url.pathname === "/favicon.ico") return send(res, 204, "");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  send(res, 200, fs.readFileSync(filePath), mime[path.extname(filePath)] || "application/octet-stream");
}

async function handleApi(req, res, url) {
  const db = readDb();
  const parts = url.pathname.split("/").filter(Boolean);
  const method = req.method;

  if (method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, at: now() });
  if (method === "GET" && url.pathname === "/api/bootstrap") return send(res, 200, withRelations(db));
  if (method === "GET" && url.pathname === "/api/schema") return send(res, 200, fs.readFileSync(schemaPath, "utf8"), "text/plain; charset=utf-8");

  if (method === "GET" && parts[1] === "roles") return send(res, 200, db.roles);
  if (method === "GET" && parts[1] === "rooms") return send(res, 200, db.rooms);
  if (method === "GET" && parts[1] === "branches" && !parts[2]) return send(res, 200, db.branches);
  if (method === "GET" && parts[1] === "branches" && parts[2]) {
    const profile = branchProfile(db, parts[2]);
    return profile ? send(res, 200, profile) : send(res, 404, { error: "branch_not_found" });
  }
  if (method === "GET" && parts[1] === "leads" && !parts[2]) return send(res, 200, db.leads);
  if (method === "GET" && parts[1] === "leads" && parts[2]) {
    const profile = leadProfile(db, parts[2]);
    return profile ? send(res, 200, profile) : send(res, 404, { error: "lead_not_found" });
  }
  if (method === "GET" && parts[1] === "customers" && !parts[2]) return send(res, 200, db.customers);
  if (method === "GET" && parts[1] === "customers" && parts[2]) {
    const profile = customerProfile(db, parts[2]);
    return profile ? send(res, 200, profile) : send(res, 404, { error: "customer_not_found" });
  }
  if (method === "GET" && parts[1] === "appointments") return send(res, 200, withRelations(db).appointments);
  if (method === "GET" && parts[1] === "reports") return send(res, 200, withRelations(db).reports);
  if (method === "GET" && parts[1] === "vehicles") return send(res, 200, db.vehicles || []);
  if (method === "GET" && parts[1] === "staff") return send(res, 200, db.staff || []);
  if (method === "GET" && parts[1] === "operations") return send(res, 200, db.operations || []);
  if (method === "GET" && parts[1] === "marketing") return send(res, 200, db.marketingCampaigns || []);
  if (method === "GET" && parts[1] === "legal") return send(res, 200, db.legalCases || []);
  if (method === "GET" && parts[1] === "training") return send(res, 200, db.trainingItems || []);
  if (method === "GET" && parts[1] === "tickets") return send(res, 200, db.tickets || []);
  if (method === "GET" && parts[1] === "intelligence") return send(res, 200, db.businessIntelligence || {});
  if (method === "GET" && parts[1] === "complaints" && !parts[2]) return send(res, 200, withRelations(db).complaints || []);
  if (method === "GET" && parts[1] === "complaints" && parts[2]) {
    const complaint = (withRelations(db).complaints || []).find(c => c.id === parts[2]);
    if (!complaint) return send(res, 404, { error: "complaint_not_found" });
    return send(res, 200, {
      complaint,
      messages: (db.complaintMessages || []).filter(m => m.complaintId === parts[2]),
      actions: (db.complaintActions || []).filter(a => a.complaintId === parts[2]),
      satisfaction: (db.complaintSatisfaction || []).filter(s => s.complaintId === parts[2])
    });
  }
  if (method === "GET" && parts[1] === "reputation") return send(res, 200, {
    scores: withRelations(db).reputationScores || [],
    reviews: withRelations(db).googleReviews || [],
    changes: db.reviewChanges || [],
    rewards: db.reviewRecoveryRewards || []
  });
  if (method === "GET" && parts[1] === "whatsapp") return send(res, 200, {
    conversations: withRelations(db).whatsappConversations || [],
    messages: db.whatsappMessages || [],
    templates: db.whatsappTemplates || []
  });
  if (method === "GET" && parts[1] === "alerts") return send(res, 200, withRelations(db).executiveAlerts || []);
  if (method === "GET" && parts[1] === "decisions") return send(res, 200, db.decisions);

  if (method === "POST" && parts[1] === "leads") {
    const input = await body(req);
    const lead = {
      id: id("LD"),
      name: input.name || "Yeni Aday",
      city: input.city || "Belirlenecek",
      type: input.type || "Franchise adayı",
      stage: "Yeni Lead",
      score: Number(input.score || 60),
      budget: input.budget || "Belirlenecek",
      source: input.source || "Web form",
      owner: input.owner || "Franchise Satış",
      nextStep: input.nextStep || "İlk arama",
      phone: input.phone || "-"
    };
    db.leads.unshift(lead);
    db.auditLogs.unshift({ id: id("AL"), actorId: "ceo", action: "lead.created", entityType: "lead", entityId: lead.id, createdAt: now() });
    writeDb(db);
    return send(res, 201, lead);
  }

  if (method === "POST" && parts[1] === "complaints") {
    const input = await body(req);
    const complaint = {
      id: id("CP"),
      customerId: input.customerId || null,
      branchId: input.branchId || "BR-001",
      source: input.source || "Call center entry",
      category: input.category || "Other",
      priority: input.priority || "Medium",
      stage: "New",
      owner: input.owner || "HQ Customer Experience Team",
      regionalOwner: input.regionalOwner || "Genel Merkez",
      createdAt: now(),
      firstResponseMinutes: 0,
      resolutionHours: 0,
      slaStatus: "On Track",
      reopened: false,
      summary: input.summary || "Yeni şikayet kaydı",
      requestedAction: input.requestedAction || "Manager callback",
      reputationRisk: Number(input.reputationRisk || 50)
    };
    db.complaints = db.complaints || [];
    db.complaints.unshift(complaint);
    db.auditLogs.unshift({ id: id("AL"), actorId: "ceo", action: "complaint.created", entityType: "complaint", entityId: complaint.id, createdAt: now() });
    writeDb(db);
    return send(res, 201, complaint);
  }

  if (method === "PATCH" && parts[1] === "leads" && parts[2]) {
    const input = await body(req);
    const lead = db.leads.find(l => l.id === parts[2]);
    if (!lead) return send(res, 404, { error: "lead_not_found" });
    Object.assign(lead, input);
    db.auditLogs.unshift({ id: id("AL"), actorId: "ceo", action: "lead.updated", entityType: "lead", entityId: lead.id, createdAt: now() });
    writeDb(db);
    return send(res, 200, lead);
  }

  if (method === "POST" && parts[1] === "decisions") {
    const input = await body(req);
    const decision = {
      id: id("DC"),
      roomId: input.roomId || "main",
      title: input.title || "Yeni karar",
      owner: input.owner || "CEO",
      status: input.status || "Açık",
      dueDate: input.dueDate || null,
      evidence: input.evidence || ""
    };
    db.decisions.unshift(decision);
    db.auditLogs.unshift({ id: id("AL"), actorId: "ceo", action: "decision.created", entityType: "decision", entityId: decision.id, createdAt: now() });
    writeDb(db);
    return send(res, 201, decision);
  }

  return send(res, 404, { error: "not_found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (err) {
    send(res, 500, { error: "server_error", message: err.message });
  }
});

server.listen(PORT, () => {
  ensureDb();
  console.log(`OTOTR ERP + CRM running at http://localhost:${PORT}`);
});
