import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  BrainCircuit,
  Building2,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudCog,
  Coins,
  DatabaseZap,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  Megaphone,
  Menu,
  MessageSquareText,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

const branches = [
  { code: "IST-01", name: "Istanbul Merkez", city: "Istanbul", score: 94, revenue: "8.42M", jobs: 184, nps: 72, risk: "dusuk" },
  { code: "ANK-02", name: "Ankara Balgat", city: "Ankara", score: 88, revenue: "5.18M", jobs: 129, nps: 68, risk: "orta" },
  { code: "IZM-03", name: "Izmir Bornova", city: "Izmir", score: 91, revenue: "4.74M", jobs: 116, nps: 75, risk: "dusuk" },
  { code: "ANT-04", name: "Antalya Lara", city: "Antalya", score: 82, revenue: "3.96M", jobs: 98, nps: 61, risk: "orta" },
  { code: "BUR-05", name: "Bursa Nilüfer", city: "Bursa", score: 79, revenue: "3.21M", jobs: 76, nps: 59, risk: "yuksek" },
];

const stages = [
  { label: "Hazirlik", value: 100 },
  { label: "MVP", value: 86 },
  { label: "Pilot", value: 64 },
  { label: "Yayginlasma", value: 42 },
];

const executiveKpis = [
  { label: "Toplam ciro", value: "25.51M TL", delta: "+18.4%", tone: "good" },
  { label: "Aktif ekspertiz", value: "603", delta: "+42", tone: "good" },
  { label: "Sube skoru", value: "87.8", delta: "+4.1", tone: "good" },
  { label: "Bekleyen risk", value: "18", delta: "-7", tone: "warn" },
];

const alerts = [
  "Bursa Nilüfer icin denetim tekrari planlanmali",
  "Istanbul Merkez arsiv aktarim SLA seviyesi %96",
  "Satis kampanyasi lead maliyeti Ankara'da %12 iyilesti",
  "Academy zorunlu egitim tamamlama orani %91",
];

const moduleBlueprints = [
  {
    id: "dashboard",
    title: "Grup Dashboard",
    icon: LayoutDashboard,
    owner: "Genel Mudurluk",
    summary: "Tum subeler, gelir, operasyon, kalite ve risk ekranlarini tek karar merkezinde toplar.",
    submenus: [
      "Yonetici Kokpiti",
      "Sube Karsilastirma",
      "Gunluk Nabiz",
      "Risk Is Haritasi",
      "Aksiyon Takip",
      "Haftalik Ozet",
    ],
  },
  {
    id: "branches",
    title: "Sube Yonetimi",
    icon: Building2,
    owner: "Operasyon",
    summary: "Sube hedefleri, vardiyalar, kasa, stok, ekip ve yerel performans yonetimi.",
    submenus: [
      "Sube Kartlari",
      "Hedef ve Primler",
      "Vardiya Planlama",
      "Kasa ve Mutabakat",
      "Yerel Yetkiler",
      "Acilis Kapanis Kontrolu",
    ],
  },
  {
    id: "inspection",
    title: "Ekspertiz Operasyon",
    icon: CarFront,
    owner: "Teknik Operasyon",
    summary: "Randevudan rapor teslimine kadar paket, istasyon, teknisyen ve kalite akislarini yonetir.",
    submenus: [
      "Randevu Panosu",
      "Arac Kabul",
      "Paket ve Kontrol Listeleri",
      "Istasyon Akisi",
      "Teknisyen Atama",
      "Rapor Onay",
      "Garanti ve Itiraz",
    ],
  },
  {
    id: "inventory",
    title: "Arac Filo Stok",
    icon: Boxes,
    owner: "Lojistik",
    summary: "Arac, ekipman, sarf, demirbas ve subeler arasi transfer gorunurlugu saglar.",
    submenus: [
      "Arac Havuzu",
      "Ekipman Envanteri",
      "Sarf Stok",
      "Transfer Talepleri",
      "Demirbas Zimmet",
      "Bakim Takvimi",
    ],
  },
  {
    id: "crm",
    title: "Musteri CRM",
    icon: HeartHandshake,
    owner: "Musteri Deneyimi",
    summary: "Bireysel, bayi, filo ve kurumsal musterilerin tum temas gecmisini merkezilestirir.",
    submenus: [
      "Musteri 360",
      "Lead Havuzu",
      "Teklifler",
      "Sadakat Programi",
      "Sikayet ve Talep",
      "NPS ve Geri Bildirim",
    ],
  },
  {
    id: "sales",
    title: "Satis Pazarlama",
    icon: Megaphone,
    owner: "Buyume",
    summary: "Kampanya, bayi is ortakligi, saha satisi, teklif, performans ve gelir hunisini izler.",
    submenus: [
      "Kampanya Takvimi",
      "Lead Performansi",
      "Bayi Anlasmalari",
      "Kurumsal Teklifler",
      "Satis Hedefleri",
      "Pazarlama ROI",
      "Rakip Izleme",
    ],
  },
  {
    id: "callcenter",
    title: "Cagri ve Randevu",
    icon: Headphones,
    owner: "Operasyon Destek",
    summary: "Telefon, WhatsApp, web formu ve bayi portalindan gelen randevu ve talepleri birlestirir.",
    submenus: [
      "Cagri Kuyrugu",
      "Randevu Optimizasyonu",
      "WhatsApp Gelen Kutusu",
      "Geri Donus Listesi",
      "SLA Takibi",
      "Hazir Cevaplar",
    ],
  },
  {
    id: "finance",
    title: "Finans Muhasebe",
    icon: Landmark,
    owner: "Finans",
    summary: "Gelir, gider, fatura, tahsilat, kasa, vergi ve sube karliligi kontrolunu saglar.",
    submenus: [
      "Gelir Tablosu",
      "Fatura ve E-Arsiv",
      "Tahsilat Takibi",
      "Gider Merkezi",
      "Banka Mutabakati",
      "Prim ve Komisyon",
      "Butce Senaryo",
    ],
  },
  {
    id: "hr",
    title: "IK ve Performans",
    icon: UsersRound,
    owner: "Insan Kaynaklari",
    summary: "Personel, izin, vardiya, prim, hedef, yetkinlik ve performans sureclerini yurutur.",
    submenus: [
      "Personel Kartlari",
      "Izin ve Mesai",
      "Performans Skorlari",
      "Ise Alim Havuzu",
      "Bordro Hazirlik",
      "Yetkinlik Matrisi",
    ],
  },
  {
    id: "academy",
    title: "Academy",
    icon: GraduationCap,
    owner: "Egitim",
    summary: "Teknisyen, satis, operasyon ve yonetici gelisim programlarini olculebilir hale getirir.",
    submenus: [
      "Egitim Katalogu",
      "Zorunlu Sertifikalar",
      "Sinav ve Quiz",
      "Usta Cirak Takibi",
      "Video Kutuphane",
      "Gelisim Yol Haritasi",
    ],
  },
  {
    id: "archive",
    title: "Arsiv DMS",
    icon: Archive,
    owner: "Dokuman Kontrol",
    summary: "Ekspertiz raporu, sozlesme, fatura, fotograf ve hukuki dokumanlari guvenli arsivler.",
    submenus: [
      "Rapor Arsivi",
      "Sozlesmeler",
      "Fotograf Kasasi",
      "Versiyon Gecmisi",
      "Imha Takvimi",
      "Yetkili Paylasim",
    ],
  },
  {
    id: "procurement",
    title: "Satin Alma",
    icon: ShoppingCart,
    owner: "Tedarik",
    summary: "Tedarikci, talep, teklif, satin alma emri, teslimat ve kalite sureclerini takip eder.",
    submenus: [
      "Tedarikci Kartlari",
      "Talep Onaylari",
      "Teklif Karsilastirma",
      "Siparis Takibi",
      "Teslim Alma",
      "Tedarikci Skoru",
    ],
  },
  {
    id: "reports",
    title: "Raporlama BI",
    icon: BarChart3,
    owner: "Veri Ekibi",
    summary: "Yonetsel, finansal, operasyonel ve sube bazli tum raporlarin tek merkezidir.",
    submenus: [
      "Canli KPI",
      "Sube Karnesi",
      "Karlilik Analizi",
      "Operasyon Raporlari",
      "Denetim Raporlari",
      "Ozel Rapor Tasarimi",
      "Power BI Aktarim",
    ],
  },
  {
    id: "quality",
    title: "Kalite Denetim",
    icon: ClipboardCheck,
    owner: "Kalite",
    summary: "SOP, kontrol listesi, uygunsuzluk, duzeltici faaliyet ve gizli musteri surecleri.",
    submenus: [
      "SOP Kutuphanesi",
      "Denetim Planlari",
      "Uygunsuzluklar",
      "Duzeltici Faaliyet",
      "Gizli Musteri",
      "Kalite Skoru",
    ],
  },
  {
    id: "legal",
    title: "Hukuk Uyum",
    icon: ShieldCheck,
    owner: "Uyum",
    summary: "KVKK, sozlesme, dava, mevzuat, yetki ve denetim izlerini kayit altina alir.",
    submenus: [
      "KVKK Envanteri",
      "Dava ve Ihtarlar",
      "Sozlesme Onay",
      "Yetki Denetimi",
      "Uyum Takvimi",
      "Olay Bildirimi",
    ],
  },
  {
    id: "it",
    title: "IT Guvenlik",
    icon: LockKeyhole,
    owner: "Bilgi Teknolojileri",
    summary: "Kullanici, rol, cihaz, entegrasyon, log, yedekleme ve siber risk kontrol paneli.",
    submenus: [
      "Kullanici Rolleri",
      "Cihaz Envanteri",
      "Oturum Loglari",
      "Yedekleme Durumu",
      "Guvenlik Alarmi",
      "API Anahtarlari",
    ],
  },
  {
    id: "integrations",
    title: "Entegrasyonlar",
    icon: CloudCog,
    owner: "Platform",
    summary: "E-fatura, SMS, WhatsApp, banka, muhasebe, harita ve veri aktarim baglantilari.",
    submenus: [
      "E-Fatura",
      "SMS ve WhatsApp",
      "Banka POS",
      "Muhasebe Aktarim",
      "Harita ve Lokasyon",
      "Webhook Merkezi",
    ],
  },
  {
    id: "settings",
    title: "Sistem Ayarlari",
    icon: Settings,
    owner: "Admin",
    summary: "Tenant, marka, paket, rol, bildirim, dil ve uygulama parametreleri burada yonetilir.",
    submenus: [
      "Sirket Ayarlari",
      "Paket Tanimlari",
      "Bildirim Kurallari",
      "Onay Akislari",
      "Tema ve Marka",
      "Veri Sozlugu",
    ],
  },
];

const moduleTones = ["#e30613", "#0f766e", "#2563eb", "#ca8a04", "#475569", "#16a34a"];

function makeSubmenu(module, title, index) {
  const seed = module.id.length * 19 + index * 11;
  return {
    id: `${module.id}-${index}`,
    title,
    health: 72 + (seed % 25),
    workload: 18 + (seed % 48),
    records: 120 + seed * 7,
    sla: 82 + (seed % 15),
    automation: 44 + (seed % 41),
    workflows: [
      `${title} icin yeni kayit / talep acma`,
      `Sube ve rol bazli onay akisi`,
      `SLA, sorumlu ve hedef tarih takibi`,
      `Arsiv, rapor ve audit log baglantisi`,
    ],
    reports: [
      `${title} gunluk durum raporu`,
      `${title} sube karsilastirma raporu`,
      `${title} risk ve gecikme raporu`,
      `${title} excel / PDF yonetici ozeti`,
    ],
    automations: [
      "Geciken kayitlarda sorumluya bildirim",
      "Haftalik yonetici ozetini otomatik gonder",
      "Kritik sapmada kalite ve bolum mudurune alarm",
    ],
  };
}

const modules = moduleBlueprints.map((module, moduleIndex) => ({
  ...module,
  tone: moduleTones[moduleIndex % moduleTones.length],
  submenus: module.submenus.map((title, index) => makeSubmenu(module, title, index)),
}));

const implementationPhases = [
  {
    title: "1. Kesif ve veri modeli",
    body: "Mevcut otoTR akislarini, sube farklarini, rol matrisini, paketleri ve rapor ihtiyaclarini tek sozlukte toplama.",
  },
  {
    title: "2. Cekirdek ERP",
    body: "Tenant, sube, kullanici, rol, musteri, arac, randevu, ekspertiz raporu, fatura ve arsiv tablolarini yayina hazirlama.",
  },
  {
    title: "3. Operasyon MVP",
    body: "Randevu, arac kabul, istasyon akisi, rapor onay, tahsilat ve sube dashboard ekranlarini canli kullanima alma.",
  },
  {
    title: "4. Kurumsal moduller",
    body: "IK, Academy, finans, satis pazarlama, satin alma, kalite, hukuk ve BI modul setlerini entegre etme.",
  },
  {
    title: "5. Pilot ve yayginlasma",
    body: "Iki pilot subede saha testi, egitim, veri migrasyonu, performans ayari ve tum subelere kademeli gecis.",
  },
];

const taskRows = [
  ["OP-1842", "Rapor onayi bekliyor", "Istanbul Merkez", "Teknik Operasyon", "22 dk", "kritik"],
  ["CRM-902", "Kurumsal teklif revizyonu", "Ankara Balgat", "Satis", "Bugun", "orta"],
  ["FIN-611", "Kasa mutabakat farki", "Antalya Lara", "Finans", "2 saat", "kritik"],
  ["HR-278", "Zorunlu egitim eksigi", "Bursa Nilüfer", "Academy", "Yarin", "orta"],
  ["QA-443", "Denetim bulgusu kapatma", "Izmir Bornova", "Kalite", "3 gun", "dusuk"],
];

function getBranchLabel(branchCode) {
  if (branchCode === "all") return "Tum Subeler";
  return branches.find((branch) => branch.code === branchCode)?.name ?? "Tum Subeler";
}

function StatusPill({ tone = "neutral", children }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function AppHeader({ query, setQuery, branch, setBranch, range, setRange, live, setLive, onOpenCommand }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">otoTR EKSPERTIZ</p>
        <h1>ERPVER2 Yonetim Sistemi</h1>
      </div>
      <div className="header-actions">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Modul, rapor veya kayit ara"
          />
        </label>
        <select value={branch} onChange={(event) => setBranch(event.target.value)} title="Sube sec">
          <option value="all">Tum subeler</option>
          {branches.map((item) => (
            <option key={item.code} value={item.code}>{item.name}</option>
          ))}
        </select>
        <select value={range} onChange={(event) => setRange(event.target.value)} title="Tarih araligi">
          <option>Bugun</option>
          <option>Bu hafta</option>
          <option>Bu ay</option>
          <option>Bu ceyrek</option>
        </select>
        <button className={`icon-button ${live ? "active" : ""}`} onClick={() => setLive((value) => !value)} title="Canli modu ac/kapat">
          <Activity size={18} />
        </button>
        <button className="primary-action" onClick={onOpenCommand}>
          <Plus size={17} />
          Yeni islem
        </button>
      </div>
    </header>
  );
}

function Sidebar({ activeModuleId, activeSubId, setActiveModuleId, setActiveSubId, query, compact, setCompact }) {
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  return (
    <aside className={`sidebar ${compact ? "compact" : ""}`}>
      <div className="brand-block">
        <div className="brand-mark">OT</div>
        <div>
          <strong>otoTR</strong>
          <span>ERPVER2</span>
        </div>
        <button className="icon-button sidebar-toggle" onClick={() => setCompact((value) => !value)} title="Menu genisligi">
          <Menu size={18} />
        </button>
      </div>
      <nav className="module-nav">
        {modules.map((module) => {
          const Icon = module.icon;
          const active = module.id === activeModuleId;
          const visibleSubmenus = module.submenus.filter((sub) => {
            if (!normalized) return true;
            return `${module.title} ${sub.title}`.toLocaleLowerCase("tr-TR").includes(normalized);
          });
          if (normalized && visibleSubmenus.length === 0) return null;
          return (
            <section key={module.id} className={`nav-group ${active ? "active" : ""}`}>
              <button
                className="module-button"
                onClick={() => {
                  setActiveModuleId(module.id);
                  setActiveSubId(module.submenus[0].id);
                }}
              >
                <span className="module-icon" style={{ "--module-tone": module.tone }}>
                  <Icon size={18} />
                </span>
                <span>{module.title}</span>
                <ChevronRight size={16} />
              </button>
              {active && !compact ? (
                <div className="submenu-list">
                  {visibleSubmenus.map((sub) => (
                    <button
                      key={sub.id}
                      className={sub.id === activeSubId ? "selected" : ""}
                      onClick={() => setActiveSubId(sub.id)}
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

function ExecutiveOverview({ setActiveModuleId, setActiveSubId }) {
  return (
    <>
      <section className="overview-grid">
        <div className="command-panel">
          <div className="panel-heading">
            <p className="eyebrow">Canli kontrol merkezi</p>
            <h2>Subeler, operasyon ve finans ayni ekranda</h2>
          </div>
          <div className="kpi-strip">
            {executiveKpis.map((item) => (
              <article key={item.label} className="metric-tile">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em className={item.tone}>{item.delta}</em>
              </article>
            ))}
          </div>
          <div className="stage-list">
            {stages.map((stage) => (
              <div className="stage-row" key={stage.label}>
                <span>{stage.label}</span>
                <div className="progress-track">
                  <i style={{ width: `${stage.value}%` }} />
                </div>
                <b>{stage.value}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="alert-panel">
          <div className="panel-heading inline">
            <h3>Oncelikli sinyaller</h3>
            <Bell size={18} />
          </div>
          {alerts.map((alert, index) => (
            <button className="alert-row" key={alert} onClick={() => {
              const target = index % 2 === 0 ? modules[13] : modules[5];
              setActiveModuleId(target.id);
              setActiveSubId(target.submenus[0].id);
            }}>
              <span>{index + 1}</span>
              <p>{alert}</p>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="branch-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sube karnesi</p>
            <h2>Performans, is yuku ve risk dagilimi</h2>
          </div>
          <StatusPill tone="good">5 aktif sube</StatusPill>
        </div>
        <div className="branch-grid">
          {branches.map((branch) => (
            <article className="branch-card" key={branch.code}>
              <div>
                <strong>{branch.name}</strong>
                <span>{branch.city} / {branch.code}</span>
              </div>
              <div className="score-ring" style={{ "--score": `${branch.score}%` }}>{branch.score}</div>
              <dl>
                <div><dt>Ciro</dt><dd>{branch.revenue} TL</dd></div>
                <div><dt>Aktif is</dt><dd>{branch.jobs}</dd></div>
                <div><dt>NPS</dt><dd>{branch.nps}</dd></div>
              </dl>
              <StatusPill tone={branch.risk === "yuksek" ? "danger" : branch.risk === "orta" ? "warn" : "good"}>
                {branch.risk === "dusuk" ? "Dusuk risk" : branch.risk === "orta" ? "Orta risk" : "Yuksek risk"}
              </StatusPill>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ModuleWorkspace({ activeModule, activeSub, branch, range, live, setToast, openDrawer }) {
  const Icon = activeModule.icon;
  const records = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => ({
      id: `${activeModule.id.slice(0, 3).toUpperCase()}-${activeSub.records + index}`,
      name: `${activeSub.title} kaydi ${index + 1}`,
      branch: branches[(index + activeSub.title.length) % branches.length].name,
      owner: ["Sorumlu Mudur", "Operasyon Lideri", "Finans Uzmani", "Kalite Uzmani", "IK Uzmani", "CRM Temsilcisi"][index],
      status: ["Planlandi", "Islemde", "Onayda", "Tamamlandi", "Riskli", "Revizyon"][index],
      score: Math.max(61, activeSub.health - index * 3),
    }));
  }, [activeModule.id, activeSub]);

  return (
    <section className="workspace">
      <div className="workspace-hero" style={{ "--module-tone": activeModule.tone }}>
        <div className="hero-icon"><Icon size={28} /></div>
        <div>
          <p className="eyebrow">{activeModule.owner} / {getBranchLabel(branch)} / {range}</p>
          <h2>{activeModule.title} - {activeSub.title}</h2>
          <p>{activeModule.summary}</p>
        </div>
        <div className="hero-actions">
          <StatusPill tone={live ? "good" : "neutral"}>{live ? "Canli veri modu" : "Planlama modu"}</StatusPill>
          <button className="ghost-action" onClick={() => setToast(`${activeSub.title} raporu indirilmeye hazirlandi`)}>
            <Download size={16} />
            Rapor al
          </button>
          <button className="primary-action" onClick={openDrawer}>
            <Plus size={16} />
            Kayit ac
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        <article className="metric-tile">
          <Gauge size={18} />
          <span>Surec sagligi</span>
          <strong>{activeSub.health}%</strong>
          <em className="good">+{activeSub.health - 70} puan</em>
        </article>
        <article className="metric-tile">
          <Activity size={18} />
          <span>Aktif is yuku</span>
          <strong>{activeSub.workload}</strong>
          <em className="warn">SLA {activeSub.sla}%</em>
        </article>
        <article className="metric-tile">
          <DatabaseZap size={18} />
          <span>Kayit hacmi</span>
          <strong>{activeSub.records}</strong>
          <em>Son 30 gun</em>
        </article>
        <article className="metric-tile">
          <BrainCircuit size={18} />
          <span>Otomasyon</span>
          <strong>{activeSub.automation}%</strong>
          <em className="good">Hazirlik</em>
        </article>
      </div>

      <div className="two-column">
        <section className="flow-board">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Is akisi</p>
              <h3>Calisir alt baslik paneli</h3>
            </div>
            <StatusPill>4 adim</StatusPill>
          </div>
          <div className="flow-columns">
            {activeSub.workflows.map((flow, index) => (
              <article className="flow-card" key={flow}>
                <span>{index + 1}</span>
                <p>{flow}</p>
                <button onClick={() => setToast(`${flow} gorevi acildi`)}>
                  <CheckCircle2 size={15} />
                  Isle
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Raporlama</p>
              <h3>Hazir raporlar ve otomasyonlar</h3>
            </div>
            <PieChart size={20} />
          </div>
          {activeSub.reports.map((report) => (
            <button className="report-row" key={report} onClick={() => setToast(`${report} olusturuldu`)}>
              <FileText size={16} />
              <span>{report}</span>
              <Download size={15} />
            </button>
          ))}
          <div className="automation-box">
            {activeSub.automations.map((item) => (
              <p key={item}><Sparkles size={15} /> {item}</p>
            ))}
          </div>
        </section>
      </div>

      <section className="records-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Kayitlar</p>
            <h3>{activeSub.title} is listesi</h3>
          </div>
          <button className="ghost-action" onClick={() => setToast("Liste filtreleri uygulandi")}>
            <Filter size={16} />
            Filtrele
          </button>
        </div>
        <div className="records-table" role="table" aria-label={`${activeSub.title} kayitlari`}>
          <div className="table-row table-head" role="row">
            <span>Kod</span>
            <span>Kayit</span>
            <span>Sube</span>
            <span>Sorumlu</span>
            <span>Durum</span>
            <span>Skor</span>
          </div>
          {records.map((row) => (
            <button className="table-row" key={row.id} role="row" onClick={() => setToast(`${row.id} detay ekrani acildi`)}>
              <span>{row.id}</span>
              <span>{row.name}</span>
              <span>{row.branch}</span>
              <span>{row.owner}</span>
              <span><StatusPill tone={row.status === "Riskli" ? "danger" : row.status === "Onayda" ? "warn" : "good"}>{row.status}</StatusPill></span>
              <span>{row.score}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function RightRail({ activeModule, activeSub, setActiveModuleId, setActiveSubId }) {
  return (
    <aside className="right-rail">
      <section className="rail-section">
        <div className="panel-heading inline">
          <h3>Bugunun isleri</h3>
          <CalendarClock size={18} />
        </div>
        {taskRows.map((row) => (
          <button key={row[0]} className="task-row" onClick={() => {
            const module = row[3] === "Finans" ? modules[7] : row[3] === "Satis" ? modules[5] : row[3] === "Academy" ? modules[9] : modules[2];
            setActiveModuleId(module.id);
            setActiveSubId(module.submenus[0].id);
          }}>
            <b>{row[0]}</b>
            <span>{row[1]}</span>
            <small>{row[2]} / {row[4]}</small>
          </button>
        ))}
      </section>
      <section className="rail-section">
        <div className="panel-heading inline">
          <h3>Modul hazirligi</h3>
          <BadgeCheck size={18} />
        </div>
        {implementationPhases.map((phase, index) => (
          <div className="phase-item" key={phase.title}>
            <span>{index + 1}</span>
            <div>
              <strong>{phase.title}</strong>
              <p>{phase.body}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="rail-section emphasis">
        <LineChart size={22} />
        <strong>{activeModule.title}</strong>
        <p>{activeSub.title} ekraninda veri modeli, rapor, onay, arsiv ve yetki kurgusu birlikte hazir.</p>
      </section>
    </aside>
  );
}

function CommandDrawer({ open, onClose, activeModule, activeSub, setToast }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="command-drawer" role="dialog" aria-label="Yeni islem" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Yeni islem</p>
            <h2>{activeSub.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-grid">
          {[
            ["Kayit tipi", activeModule.title],
            ["Alt baslik", activeSub.title],
            ["Onay akisi", activeModule.owner],
            ["Arsiv baglantisi", "Otomatik"],
          ].map(([label, value]) => (
            <label key={label}>
              <span>{label}</span>
              <input value={value} readOnly />
            </label>
          ))}
        </div>
        <label className="drawer-note">
          <span>Is notu</span>
          <textarea defaultValue={`${activeSub.title} icin sube bazli yeni kayit hazirlandi.`} />
        </label>
        <div className="drawer-actions">
          <button className="ghost-action" onClick={onClose}>Vazgec</button>
          <button className="primary-action" onClick={() => {
            setToast(`${activeSub.title} kaydi simule edildi`);
            onClose();
          }}>
            <FileCheck2 size={16} />
            Kaydi olustur
          </button>
        </div>
      </aside>
    </div>
  );
}

export function App() {
  const [activeModuleId, setActiveModuleId] = useState("dashboard");
  const [activeSubId, setActiveSubId] = useState(modules[0].submenus[0].id);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [range, setRange] = useState("Bu ay");
  const [live, setLive] = useState(true);
  const [compact, setCompact] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("ERPVER2 hazirlik paneli yuklendi");

  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const activeSub = activeModule.submenus.find((sub) => sub.id === activeSubId) ?? activeModule.submenus[0];

  return (
    <main className="erp-shell">
      <Sidebar
        activeModuleId={activeModule.id}
        activeSubId={activeSub.id}
        setActiveModuleId={setActiveModuleId}
        setActiveSubId={setActiveSubId}
        query={query}
        compact={compact}
        setCompact={setCompact}
      />
      <div className="main-area">
        <AppHeader
          query={query}
          setQuery={setQuery}
          branch={branch}
          setBranch={setBranch}
          range={range}
          setRange={setRange}
          live={live}
          setLive={setLive}
          onOpenCommand={() => setDrawerOpen(true)}
        />
        <div className="content-grid">
          <div className="content-main">
            {activeModule.id === "dashboard" ? (
              <ExecutiveOverview setActiveModuleId={setActiveModuleId} setActiveSubId={setActiveSubId} />
            ) : null}
            <ModuleWorkspace
              activeModule={activeModule}
              activeSub={activeSub}
              branch={branch}
              range={range}
              live={live}
              setToast={setToast}
              openDrawer={() => setDrawerOpen(true)}
            />
          </div>
          <RightRail
            activeModule={activeModule}
            activeSub={activeSub}
            setActiveModuleId={setActiveModuleId}
            setActiveSubId={setActiveSubId}
          />
        </div>
      </div>
      <div className="toast" role="status">
        <CheckCircle2 size={16} />
        {toast}
      </div>
      <CommandDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeModule={activeModule}
        activeSub={activeSub}
        setToast={setToast}
      />
    </main>
  );
}
