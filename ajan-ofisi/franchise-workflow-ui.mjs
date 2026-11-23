import data from "./franchise-workflow-data.mjs";
import {
  SCENARIOS,
  PHASES,
  canAdvanceScenario,
  proposeAgenda,
  evaluateScenario,
  deduplicateEvents,
  observedState,
  snapshotSummary,
  evidenceUrl,
  briefing,
  planMarkdown,
} from "./franchise-workflow-model.mjs";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const host = document.getElementById("franchiseWorkbench");
let selectedStage = 0,
  tab = "map",
  scenario = { ...SCENARIOS[0] },
  step = 0,
  live = null;
const sourceLinks = (keys) =>
  keys
    .map((k) => {
      const e = data.evidence[k];
      return `<a href="${esc(evidenceUrl(e))}" target="_blank" rel="noopener">${esc(e.file)}:${e.start}–${e.end} ↗</a>`;
    })
    .join("");
const chips = () =>
  `<span class="fw-chip">4 mevcut Franchise uzmanı</span><span class="fw-chip">14 aşama</span><span class="fw-chip fw-amber">İnceleme ve plan · kod kapalı</span>`;
host.innerHTML = `<div class="fw-head"><div><p class="fw-kicker">FRANCHISE / ÇALIŞMA PLANI</p><h2>Bir sonraki adım belli.<br>Her teslimin bir sahibi var.</h2><p>Ajan kaynakları inceler, kanıtlı paket hazırlar. Yetkili insan karar verir.</p><div class="fw-chips">${chips()}</div></div><div class="fw-head-note"><b>Önce Finans devri.</b><p>Teslim edildi → kabul edildi → tahsil edildi.<br>Bu üç durumu aynı saymıyoruz.</p><button data-fw-tab="packets">İlk inceleme paketlerini aç ↗</button></div></div><nav class="fw-tabs" aria-label="Franchise çalışma planı"><button data-fw-tab="map" aria-pressed="true">01 · Akış ve ekip</button><button data-fw-tab="packets" aria-pressed="false">02 · İş paketleri</button><button data-fw-tab="simulation" aria-pressed="false">03 · Senaryo laboratuvarı</button><button data-fw-tab="brief" aria-pressed="false">04 · Koordinatör özeti</button></nav><div id="fwPanel"></div><div class="fw-foot"><span>Bu alan çalışma tasarımıdır. Otomatik ajan servisi başlatılmadı.</span><button id="fwExport">Planı indir</button></div><dialog id="fwDialog"><div class="fw-dialog-head"><span>FRANCHISE / KANITLI İNCELEME ÖNERİSİ</span><button id="fwClose" aria-label="Detayı kapat">Kapat ×</button></div><div id="fwDialogContent"></div></dialog>`;
const $ = (s) => host.querySelector(s);
function stageDetail() {
  const s = data.stages[selectedStage];
  return `<div class="fw-detail"><div class="fw-detail-top"><span class="fw-step-number">${String(selectedStage + 1).padStart(2, "0")}</span><div><p class="fw-kicker">${esc(s.agent)} · İNCELEME SAHİBİ</p><h3>${esc(s.title)}</h3><p>İnsan süreç sahibi: ${esc(s.humanOwner)}</p></div><span class="fw-risk">${esc(s.risk)} riski</span></div><div class="fw-detail-grid"><div><small>NE ZAMAN ELE ALIR?</small><p>${esc(s.trigger)}</p></div><div><small>NEYE BAKAR?</small><p>${esc(s.check)}</p></div><div><small>NE TESLİM EDER?</small><p>${esc(s.output)}</p></div><div><small>SONRAKİ BAĞIMLILIK</small><p>${esc(s.next)} · Yetkili kaynak ilerlemeden bu masa aşama değiştirmez.</p></div></div><div class="fw-stop"><b>Durma koşulu</b><span>${esc(s.stop)}</span></div><details class="fw-evidence"><summary>Kaynak kanıtlarını göster</summary>${sourceLinks(s.evidence)}</details></div>`;
}
function map() {
  return `<div class="fw-section-heading"><div><h3>Başvurudan 90. gün takibine</h3><p>Bir aşamaya dokun; tetikleyicisini, çıktısını ve sınırını gör.</p></div><span class="fw-tag">İşleyiş önerisi · canlı aşama sayacı değil</span></div><div class="fw-stage-grid" aria-label="14 aşamalı franchise akışı">${data.stages.map((s, i) => `<button class="fw-stage ${i === selectedStage ? "selected" : ""}" data-fw-stage="${i}" aria-pressed="${i === selectedStage}"><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(s.title)}</b><small>${s.agent}</small></button>`).join("")}</div><div id="fwStageDetail">${stageDetail()}</div><div class="fw-section-heading"><div><h3>Dört uzman. Tek raporlama zinciri.</h3><p>Yeni ajan kadrosu açılmadı. Mevcut sorumluluklar iş paketlerine bağlandı.</p></div></div><div class="fw-agents">${data.agents.map((a, i) => `<button class="fw-agent" data-fw-agent="${a.id}"><span class="fw-avatar" style="--agent-color:${a.color}">${String(i + 1).padStart(2, "0")}</span><small>${a.id}</small><b>${esc(a.name)}</b><p>${esc(a.mission)}</p><span class="fw-agent-link">Görev ayrıntısı ↗</span></button>`).join("")}</div><div class="fw-chain"><span>Uzman</span><i>→</i><span>MGR-FRA</span><i>→</i><span>COO-01</span><i>→</i><span>Sami</span></div><p class="fw-subtle">Bağımsız denetim kolu: BEK-01 üreticiden ayrıdır; yalnız denetim raporu verir. FRA-04 yetkiyi inceler ama bağımsız bekçinin yerine geçmez. Finans uzmanları kendi yöneticileri üzerinden raporlar.</p><details class="fw-department-matrix"><summary>13 departman / 39 teslim koşulu · insan sorumluların kapıları</summary><p class="fw-subtle">Bu liste ajan kadrosu değildir. FRA-03 kanıtları toplar; ilgili departman kendi yetkili kaynağında karar verir. Bekleyen ajanlar açılmaz.</p><div class="fw-departments">${Object.entries(
    data.departmentDeliverables,
  )
    .map(
      ([name, tasks]) =>
        `<article><b>${esc(name)}</b><ul>${tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><span>Canlı tamamlanma bu özetten doğrulanamaz</span></article>`,
    )
    .join(
      "",
    )}</div>${sourceLinks(["departments"])}</details><div class="fw-followups">${data.followUps.map((f) => `<article><span>${f.day}. GÜN</span><b>${esc(f.title)}</b><small>${esc(f.owner)}</small></article>`).join("")}</div><p class="fw-subtle">30 / 60 / 90 zamanları yetkili aktivasyon kaydına bağlıdır. Takip kapanışı, plan tarihinden değil tamamlanma kanıtından anlaşılır.</p>`;
}
function packets() {
  return `<div class="fw-section-heading"><div><h3>İlk inceleme sırası</h3><p>Yedi kaynaklı öneri. Her biri bağımsız içerik denetimi bekliyor.</p></div><span class="fw-tag">Sami kuyruğuna eklenmedi</span></div><div class="fw-priority"><span>01</span><div><b>Kaynak sözleşme → Finans devri → güncel onay</b><p>İlk odak FP07, FP02 ve FP03. İşlenmiş mesajı para hareketi sanma; eski onayı yeni dosyaya taşıma.</p></div></div><div class="fw-packets">${[
    "FP07",
    "FP02",
    "FP03",
    "FP04",
    "FP01",
    "FP05",
    "FP06",
  ]
    .map((id) => {
      const p = data.plans.find((p) => p.id === id);
      return `<button class="fw-packet" data-fw-plan="${p.id}"><div><span>${p.id} · ${p.owner}</span><em>${p.risk} riski</em></div><h3>${esc(p.title)}</h3><p>${esc(p.finding)}</p><footer><span>${p.evidence.length} kaynak · ${esc(p.effort)}</span><b>Planı incele ↗</b></footer></button>`;
    })
    .join(
      "",
    )}</div><div class="fw-section-heading"><div><h3>45 günlük ilerleme önerisi</h3><p>Takvim taahhüdü değil; kanıt kapıları geçildikçe ilerleyen sıra.</p></div></div><ol class="fw-roadmap">${[
    [
      "01–07",
      "Kaynak ve sahiplik",
      "FP07 / FP02 / FP03: ortak sözleşme, Finans kabul kaynağı, revizyon ve karar zinciri.",
    ],
    [
      "08–14",
      "Kapılar ve eksikler",
      "FP01 / FP04: başvuru tekilliği, departman teslimleri, eksik kanıtlar.",
    ],
    [
      "15–24",
      "Sentetik kabul",
      "Tek dosya, başarısız devir, yinelenen olay, bağımsız onay testleri.",
    ],
    [
      "25–35",
      "İnsan kabulü",
      "Mevcut UAT senaryoları ve departman imzaları; bloke kapılar kapanmadan ilerleme yok.",
    ],
    [
      "36–45",
      "Yayın kararı hazırlığı",
      "Sabit sürüm, geri dönüş kanıtı, güvenli çalışma alanı ve Sami onayı.",
    ],
  ]
    .map(
      ([days, title, desc]) =>
        `<li><span>GÜN ${days}</span><b>${title}</b><p>${desc}</p></li>`,
    )
    .join(
      "",
    )}</ol><p class="fw-subtle">Faz 2 başlangıcı ayrı onay ister. Planın indirilmesi, bir görevin okunması veya sürenin dolması kod yazma yetkisi açmaz.</p>`;
}
function simulation() {
  const result = evaluateScenario(scenario);
  return `<div class="fw-section-heading"><div><h3>Akışın zor durumlarını dene</h3><p>Yalnız sentetik senaryo. Canlı kayda, onaya veya finansal işleme yazmaz.</p></div><span class="fw-demo">DEMO / SİMÜLASYON</span></div><div class="fw-scenario-tabs">${SCENARIOS.map((s) => `<button data-fw-scenario="${s.id}" aria-pressed="${s.id === scenario.id}">${s.title}</button>`).join("")}</div><div class="fw-lab"><div class="fw-lab-main"><p class="fw-kicker">${scenario.owner} → MGR-FRA → BEK-01 → COO-01</p><h3>${scenario.title}</h3><p>${scenario.description}</p><div class="fw-lab-line">${PHASES.map(([key, label], i) => `<div class="${i === step ? "current" : i < step ? "visited" : ""}"><span>${i + 1}</span><b>${label}</b></div>`).join("")}</div><div class="fw-lab-output" role="status"><small>ADIM ${step + 1} / ${PHASES.length}</small><h4>${PHASES[step][1]}</h4><p>${esc(stepText(result))}</p></div><div class="fw-lab-controls"><button id="fwPrevious" ${step === 0 ? "disabled" : ""}>← Önceki</button><button id="fwNext" ${!canAdvanceScenario(scenario, step) ? "disabled" : ""}>Sonraki adım →</button><button id="fwReset">Başa dön</button></div>${!canAdvanceScenario(scenario, step) && step < 5 ? `<p class="fw-subtle" role="status">Bu senaryoda sonraki adım kapalı: ${esc(result.reason)}</p>` : ""}</div><aside class="fw-lab-aside"><h4>Koordinatör kapasitesi</h4><p>Örnek değerleri değiştir; sınırın etkisini gör.</p><div class="fw-budget-fields">${[
    ["pending", "Bekleyen karar", 10],
    ["reserved", "Ayrılmış yer", 10],
    ["today", "Bugün kullanılan + ayrılan dk", 45],
    ["week", "Haftalık kullanılan + ayrılan dk", 840],
  ]
    .map(
      ([k, t, max]) =>
        `<label>${t}<input type="number" min="0" max="${max}" step="1" value="${scenario[k]}" data-fw-budget="${k}"></label>`,
    )
    .join(
      "",
    )}</div><div class="fw-capacity ${result.capacity.allowed ? "available" : "blocked"}"><b>${result.capacity.allowed ? "İncelemeye yer var" : "Yeni iş açılamaz"}</b><p>${esc(result.capacity.reason)}</p></div><small>Önerilen paket: 5 dk inceleme. Global canlı kuyruk bu hesaplamaya bağlı değil.</small></aside></div><div class="fw-result ${result.state}"><span>AKIŞIN DURACAĞI YER</span><b>${result.label}</b><p>${result.reason}</p></div><div class="fw-delivery"><div><small>PAKETİN ANAHTARI</small><code>demo-case / finance-review / revision-2</code><p>Dosya + olay + revizyon aynıysa tekrar paket açılmaz.</p></div><div><small>TEKRAR EDEN OLAY TESTİ</small><b>2 olay → ${
    deduplicateEvents([
      { caseId: "demo", type: "finance", revision: 2 },
      { caseId: "demo", type: "finance", revision: 2 },
    ]).length
  } inceleme paketi</b><p>Yeni revizyon yeni inceleme gerektirir. Çelişen kanıt korunur; eski onay devralınmaz.</p></div></div>`;
}
function stepText(r) {
  return [
    scenario.evidence
      ? "Kaynak kanıtı var kabul edilen örnek. Gerçekte dosya / satır / hash kontrolü yapılır."
      : "Kanıt yok. Üretilecek çıktı soru listesidir; bulgu ve tamamlandı kaydı üretilemez.",
    "Tek sahip, kaynak revizyonu, zorunlu plan alanları ve alıcı birim eşleştirilir.",
    "Yönetici aynı dosya / olay / revizyon tekrarını birleştirir. Çelişen kanıtı gizlemez.",
    scenario.revision !== scenario.approvedRevision
      ? "Puan revizyonu onaydan yeni. Eski onay geçersiz; yeni bağımsız inceleme gerekir."
      : "Para / yetki / veri / şema çıktısı %100 bağımsız denetlenir. Bu simülasyon bir bekçi onayı üretmez.",
    r.capacity.reason,
    r.reason + " Bu ekranda gerçek devir, kabul veya aktivasyon yapılmaz.",
  ][step];
}
function brief() {
  const s = snapshotSummary(live),
    agenda = proposeAgenda(live);
  return `<div class="fw-section-heading"><div><h3>Sabah tek sayfa.</h3><p>Kaynak, risk ve beklenen karar birbirinden ayrılır.</p></div><button id="fwBriefDownload">Özeti indir ↓</button></div><div class="fw-live-agenda"><h4>Kaynağın işaret ettiği sonraki inceleme</h4><p>${esc(agenda.note)}</p>${agenda.items.map((item) => `<article><div><small>${item.owner} · ${item.risk}</small><b>${esc(item.title)}</b><p>${esc(item.fact)} ${esc(item.action)}</p></div><button data-fw-plan="${item.planId}">İlgili plan ↗</button></article>`).join("")}</div><div class="fw-brief"><div class="fw-brief-header"><span>KOORDİNATÖR / TASLAK</span><b>Franchise inceleme gündemi</b><small>Şablon; zamanlanmış rapor servisi değil.</small></div><div class="fw-brief-grid"><section><h4>01 · Hazır olan</h4><p>14 aşamalı kaynak haritası, 4 mevcut uzman, 7 kanıtlı plan önerisi.</p><p><b>Bağımsız içerik denetimi:</b> Bekliyor. İnceleme planı işin tamamlandığı anlamına gelmez.</p></section><section><h4>02 · Canlı kaynak özeti</h4><p>${esc(s.observed.label)}.</p><dl><dt>Süreç</dt><dd>${s.observed.count ?? "—"}</dd><dt>Kurul onayı</dt><dd>${s.approvals}</dd><dt>Finans devir sırası</dt><dd>${s.financePending}</dd><dt>Finans hatası</dt><dd>${s.financeFailed}</dd></dl></section><section><h4>03 · Öncelikli açık noktalar</h4><ol><li>Finans iş kabulünün tekil kaynağı ve sahibi.</li><li>Depodaki NO_GO kapılarından daha yeni kabul kanıtı olup olmadığı.</li><li>Şirket geneli onay kuyruğu ile kalan inceleme süresinin yetkili kaynağı.</li></ol><p>Bu sorular canlı Sami kuyruğuna eklenmedi.</p></section><section><h4>04 · Bugünkü plan önerisi</h4><p>FRA-02 Finans devrini; FRA-04 onay revizyonunu inceler. MGR-FRA birleştirir. BEK-01 yüksek riskli çıktıları denetler. COO-01 kapasiteyi doğrulayarak tek özet hazırlar.</p><div class="fw-chips"><span class="fw-chip">En fazla 10 karar / rezervasyon</span><span class="fw-chip">45 dk / gün</span><span class="fw-chip">14 saat / hafta</span></div></section></div><p class="fw-brief-warning">Şirket geneli kuyruk bağlı değil. Gerçek kapasite bilinmeden yeni iş otomatik açılmaz. Bir hafta için 7 × 45 dk = 5 saat 15 dk günlük inceleme; 14 saatlik üst sınırın kalanı otomatik harcama yetkisi değildir.</p></div><div class="fw-section-heading"><div><h3>Üretime geçişte açık kapılar</h3><p>Depodaki manifestin görüntüsü; güncel canlı kabul sonucu olarak gösterilmez.</p></div><span class="fw-tag">NO_GO</span></div><div class="fw-gates">${data.release.gates
    .filter((g) => g.status === "BLOCKED")
    .map(
      (g) =>
        `<article><b>${g.id}</b><span>${esc({ G12: "Gerçek adaptör / sağlayıcı kabulü", G14: "İnsan UAT ve bağımsız departman imzaları", G15: "Sabit sürüm, değişiklik penceresi ve yayın onayı", G16: "Canlı başvuru formu ve üç ayrı izin sözleşmesi" }[g.id] || g.name)}</span><em>Kanıt bekliyor</em></article>`,
    )
    .join(
      "",
    )}</div><div class="fw-code-gate"><h4>Kod yetkisi hâlâ kapalı</h4><p>Faz 2 için aşağıdaki koşullar ajan çalışma alanında ayrı ayrı kanıtlanmalı. Bu plan ekranının yayına çıkması bu koşulları sağlamaz.</p><ul><li>Ajan başına ayrı branch / worktree; main’e yazma yok.</li><li>Üretim ve gerçek veriye erişim yok.</li><li>Çalışma alanında gizli anahtar yok.</li><li>Her teslimde otomatik test ve diff raporu.</li><li>İlk deneme: tek departman, tek modül, tek uzman.</li></ul><b>Durum: ajan çalışma alanı doğrulaması ve Sami onayı bekleniyor.</b></div><details class="fw-evidence"><summary>Manifest kaynağı ve sürümü</summary>${sourceLinks(["release"])}<p>İncelenen kaynak sürümü: <code>${data.sourceCommit.slice(0, 7)}</code></p></details>`;
}
function render() {
  for (const b of host.querySelectorAll(".fw-tabs button"))
    b.setAttribute("aria-pressed", String(b.dataset.fwTab === tab));
  $("#fwPanel").innerHTML = { map, packets, simulation, brief }[tab]();
}
function download(name, text, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function dialog(title, body) {
  $("#fwDialogContent").innerHTML = `<h2>${esc(title)}</h2>${body}`;
  $("#fwDialog").showModal();
}
host.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.fwTab) {
    tab = b.dataset.fwTab;
    render();
  }
  if (b.dataset.fwStage !== undefined) {
    selectedStage = Number(b.dataset.fwStage);
    render();
    host
      .querySelector(`[data-fw-stage="${selectedStage}"]`)
      .focus({ preventScroll: true });
  }
  if (b.dataset.fwAgent) {
    const a = data.agents.find((a) => a.id === b.dataset.fwAgent);
    dialog(
      `${a.id} · ${a.name}`,
      `<p class="fw-dialog-lead">${esc(a.mission)}</p><div class="fw-detail-grid"><div><small>GİRDİ</small><p>${esc(a.input)}</p></div><div><small>ÇIKTI</small><p>${esc(a.output)}</p></div><div><small>DEVİR / UZMANLIK BAĞLANTISI</small><p>${esc(a.peer)}</p></div><div><small>RAPORLAMA</small><p>${a.id} → MGR-FRA → COO-01 → Sami</p></div></div><div class="fw-stop">${esc(a.boundary)}</div><p class="fw-subtle">Bu kart mevcut sorumluluğu açıklayan çalışma tasarımıdır. Kayıtlı görev kuralları veya yetkiler değiştirilmedi.</p>`,
    );
  }
  if (b.dataset.fwPlan) {
    const p = data.plans.find((p) => p.id === b.dataset.fwPlan);
    dialog(
      p.title,
      `<p class="fw-dialog-lead">${p.id} · ${p.owner} · Öneri / bağımsız denetim bekliyor</p>${[
        ["Bulgu", p.finding],
        ["Öneri", p.recommendation],
        ["Risk", p.risk + " · %100 bağımsız denetim"],
        ["Tahmini efor", p.effort],
        ["Sami’den istenen karar", p.decision],
      ]
        .map(
          ([k, v]) =>
            `<section class="fw-plan-field"><h3>${k}</h3><p>${esc(v)}</p></section>`,
        )
        .join(
          "",
        )}<section class="fw-plan-field"><h3>Kanıt</h3>${p.evidence.map((ev) => `<details class="fw-evidence"><summary>${esc(ev.file)}:${ev.start}–${ev.end}</summary><a href="${evidenceUrl(ev)}" target="_blank" rel="noopener">Sabit kaynak sürümünü aç ↗</a><pre>${esc(ev.excerpt)}</pre><small>SHA-256 ${ev.hash}</small></details>`).join("")}</section><section class="fw-plan-field"><h3>Açık sorular</h3><ul>${p.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></section><button data-fw-download="${p.id}">Bu planı indir ↓</button>`,
    );
  }
  if (b.dataset.fwDownload)
    download(
      b.dataset.fwDownload + ".md",
      planMarkdown(data.plans.find((p) => p.id === b.dataset.fwDownload)),
    );
  if (b.dataset.fwScenario) {
    scenario = { ...SCENARIOS.find((s) => s.id === b.dataset.fwScenario) };
    step = 0;
    render();
  }
  if (b.id === "fwNext" && canAdvanceScenario(scenario, step)) {
    step = Math.min(5, step + 1);
    render();
  }
  if (b.id === "fwPrevious") {
    step = Math.max(0, step - 1);
    render();
  }
  if (b.id === "fwReset") {
    step = 0;
    render();
  }
  if (b.id === "fwClose") $("#fwDialog").close();
  if (b.id === "fwBriefDownload")
    download("franchise-coordinator-brief.md", briefing(live));
  if (b.id === "fwExport")
    download(
      "franchise-agent-workflow-plan.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
});
host.addEventListener("change", (e) => {
  const key = e.target.dataset.fwBudget;
  if (key) {
    scenario[key] = e.target.value === "" ? null : Number(e.target.value);
    render();
  }
});
window.addEventListener("franchise-workbench-source", (e) => {
  live = e.detail;
  if (tab === "brief") render();
});
render();
