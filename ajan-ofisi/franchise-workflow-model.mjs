import data from "./franchise-workflow-data.mjs";
export const PHASES = [
  ["inspect", "Kaynağı incele"],
  ["package", "İş paketini hazırla"],
  ["manager", "Yönetici birleştirsin"],
  ["guard", "Bağımsız denetim"],
  ["coordinator", "Koordinatör kuyruğu"],
  ["handoff", "Yetkili birime devir"],
];
export const SCENARIOS = [
  {
    id: "finance",
    title: "Finans devri",
    description: "Teknik teslim var; Finans’ın iş kabulü henüz yok.",
    owner: "FRA-02",
    risk: "para",
    pending: 2,
    reserved: 1,
    today: 15,
    week: 180,
    financeStatus: "processed",
    financeAccepted: false,
    revision: 2,
    approvedRevision: 2,
    evidence: true,
  },
  {
    id: "revision",
    title: "Puan değişti",
    description:
      "Dosya revize edildi; önceki kurul onayı yeni sürümü karşılamıyor.",
    owner: "FRA-04",
    risk: "yetki",
    pending: 3,
    reserved: 0,
    today: 10,
    week: 200,
    financeStatus: "pending",
    financeAccepted: false,
    revision: 3,
    approvedRevision: 2,
    evidence: true,
  },
  {
    id: "capacity",
    title: "Onay kuyruğu dolu",
    description: "8 bekleyen karar ve 2 rezervasyon: yeni iş açılmamalı.",
    owner: "FRA-01",
    risk: "veri",
    pending: 8,
    reserved: 2,
    today: 20,
    week: 300,
    financeStatus: "pending",
    financeAccepted: false,
    revision: 1,
    approvedRevision: 1,
    evidence: true,
  },
  {
    id: "missing",
    title: "Kanıt eksik",
    description: "Açılış kanıtı yok; tahmin veya istisna ile ilerleme yok.",
    owner: "FRA-03",
    risk: "yetki",
    pending: 2,
    reserved: 0,
    today: 10,
    week: 150,
    financeStatus: "pending",
    financeAccepted: false,
    revision: 1,
    approvedRevision: 1,
    evidence: false,
  },
  {
    id: "weekly",
    title: "Haftalık bütçe",
    description:
      "840 dakikanın 838’i kullanılmış; günlük boşluk olsa da yeni iş alınmaz.",
    owner: "FRA-04",
    risk: "yetki",
    pending: 1,
    reserved: 0,
    today: 0,
    week: 838,
    financeStatus: "pending",
    financeAccepted: false,
    revision: 1,
    approvedRevision: 1,
    evidence: true,
  },
];
export function admission({ pending, reserved, today, week, minutes = 5 }) {
  const values = [pending, reserved, today, week, minutes];
  if (values.some((n) => !Number.isSafeInteger(n) || n < 0) || minutes < 1)
    return {
      allowed: false,
      reason: "Kuyruk veya süre bilgisi doğrulanamadı.",
      code: "unknown",
    };
  if (pending + reserved >= data.limits.maxQueue)
    return {
      allowed: false,
      reason: "10 karar / rezervasyon sınırı dolu. Yeni iş açılmaz.",
      code: "queue",
    };
  if (today + minutes > data.limits.dailyMinutes)
    return {
      allowed: false,
      reason: "Günlük 45 dakikalık inceleme tavanı dolu.",
      code: "daily",
    };
  if (week + minutes > data.limits.weeklyMinutes)
    return {
      allowed: false,
      reason: "Haftalık 14 saatlik inceleme tavanı dolu.",
      code: "weekly",
    };
  return {
    allowed: true,
    reason: "Yalnız inceleme paketi için yer var; onay verilmiş sayılmaz.",
    code: "available",
  };
}
export function evaluateScenario(
  s,
  { producer = s.owner, reviewer = "BEK-01" } = {},
) {
  const capacity = admission(s);
  if (producer === reviewer)
    return {
      state: "blocked",
      label: "Bağımsız denetim gerekli",
      reason: "Üreten ile denetleyen aynı kişi olamaz.",
      capacity,
    };
  if (!s.evidence)
    return {
      state: "blocked",
      label: "Kanıt bekleniyor",
      reason: "Bulgu geçersiz. Eksik bilgi soru listesinde bekler.",
      capacity,
    };
  if (s.revision !== s.approvedRevision)
    return {
      state: "revision",
      label: "Yeni bağımsız onay gerekli",
      reason: "Önceki onay başka dosya revizyonuna ait; taşınamaz.",
      capacity,
    };
  if (!capacity.allowed)
    return {
      state: "paused",
      label: "Yeni iş alımı durdu",
      reason: capacity.reason,
      capacity,
    };
  if (s.financeStatus === "processed" && s.financeAccepted !== true)
    return {
      state: "acceptance",
      label: "Finans kabul kanıtı bekleniyor",
      reason:
        "Teknik teslim tamamlandı. Ticari kabul, tahsilat ve mutabakat ayrı kanıt gerektirir.",
      capacity,
    };
  return {
    state: "review",
    label: "İnceleme paketi hazır",
    reason: "Bağımsız içerik denetimi ve yetkili insan kararı hâlâ gerekli.",
    capacity,
  };
}
export function deduplicateEvents(events) {
  const stable = (value) =>
    value && typeof value === "object"
      ? Array.isArray(value)
        ? value.map(stable)
        : Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, stable(value[k])]),
          )
      : value;
  const seen = new Set();
  return events.filter((e) => {
    if (!e?.caseId || !e?.type || !Number.isSafeInteger(e.revision))
      return false;
    const key = JSON.stringify(stable(e));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function observedState(summary) {
  if (
    !summary ||
    !Number.isSafeInteger(summary.case_count) ||
    summary.case_count < 0
  )
    return { known: false, label: "Kaynak doğrulanamadı", count: null };
  return {
    known: true,
    label: summary.case_count
      ? "Canlı özet doğrulandı"
      : "Kaynakta süreç kaydı yok",
    count: summary.case_count,
  };
}
export function snapshotSummary(summary) {
  const observed = observedState(summary),
    valid = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : "doğrulanamadı");
  return {
    observed,
    approvals: valid(summary?.approvals),
    financePending: valid(summary?.finance_pending),
    financeFailed: valid(summary?.finance_failed),
    globalQueue:
      "Bağlı değil; bu ekranda şirket geneli kuyruk kapasitesi hesaplanmaz.",
  };
}
export function evidenceUrl(e) {
  return `https://github.com/samivolkan/Ototr/blob/${e.commit}/${e.file}#L${e.start}-L${e.end}`;
}
export function briefing(summary) {
  const s = snapshotSummary(summary);
  return `# Franchise · Koordinatör inceleme özeti\n\nBu belge kaynak inceleme planıdır; ajan koşusu, bağımsız onay veya canlı iş tamamlama kaydı değildir.\n\n## Hazır olanlar\n14 aşamanın sorumluluk haritası; mevcut 4 uzman için 7 kanıtlı inceleme önerisi.\n\n## Kaynak durumu\n${s.observed.label}. Süreç: ${s.observed.count ?? "doğrulanamadı"}. Kurul: ${s.approvals}. Finans sırası: ${s.financePending}. Finans hatası: ${s.financeFailed}.\nŞirket geneli kuyruk: ${s.globalQueue}\n\n## Karar / soru önceliği\n1. Finans iş kabulünün yetkili kaynağı ve tekil referansı doğrulanmalı. Para kuralı önerilmiyor.\n2. Depodaki NO_GO kapılarından daha yeni kabul kanıtı varsa ilişkilendirilmeli.\nBu liste Sami'nin canlı onay kuyruğuna otomatik eklenmedi.\n\n## Riskler\nTeknik teslimi tahsilat sanmak; revize dosyada eski onayı kullanmak; kaynak yokken iş tamamlandı göstermek.\n\n## Bugünkü plan önerisi\nFRA-02: eksik ortak sözleşme bağımlılığının kanonik sürümünü ve Finans devrini incele. FRA-04: revizyon / bağımsız onay kanıtını kontrol et. MGR-FRA: tekrarları birleştir. BEK-01: yüksek riskli tüm çıktıları bağımsız denetle. Koordinatör: en fazla 10 karar / rezervasyon, günlük 45 ve haftalık 840 dakika sınırını doğrula.\n\n## Yetki\nKod yazma kapalı. Ajanlar kendi kurallarını değiştirmez. İK ve diğer bekleyen ajanlar aktif edilmedi. Bağımsız denetim henüz yapılmadı.\n\nKaynak commit: ${data.sourceCommit}\n`;
}
export function planMarkdown(p) {
  return `# ${p.id} · ${p.title}\n\nSahip: ${p.owner} → MGR-FRA → COO-01 → Sami\nDurum: Öneri / bağımsız denetim bekliyor\n\n## Bulgu\n${p.finding}\n\n## Kanıt\n${p.evidence.map((e) => `- ${e.file}:${e.start}-${e.end} · SHA-256 ${e.hash}\n  ${evidenceUrl(e)}`).join("\n")}\n\n## Öneri\n${p.recommendation}\n\n## Risk\n${p.risk} · %100 bağımsız içerik denetimi gerekli.\n\n## Tahmini efor\n${p.effort}; Sami incelemesi için öneri: ${p.estimatedReviewMinutes} dakika.\n\n## Sami’den istenen karar\n${p.decision}\n\n## Açık sorular\n${p.questions.map((q) => "- " + q).join("\n")}\n\nKod yazma / kaynak değiştirme / harici mesaj yetkisi yok.\n`;
}

export function canAdvanceScenario(s, step) {
  if (!Number.isSafeInteger(step) || step < 0 || step >= PHASES.length - 1)
    return false;
  if (!s.evidence || !admission(s).allowed) return false;
  return step < 3 || s.revision === s.approvedRevision;
}

export function proposeAgenda(summary) {
  const observed = observedState(summary);
  if (!observed.known)
    return {
      known: false,
      items: [],
      note: "Kaynak doğrulanmadan canlı iş önerisi üretilmez.",
    };
  const fields = [
    "approvals",
    "finance_pending",
    "finance_failed",
    "finance_processed",
  ];
  if (fields.some((k) => !Number.isSafeInteger(summary[k]) || summary[k] < 0))
    return {
      known: false,
      items: [],
      note: "Kuyruk alanları eksik; canlı iş önerisi için kaynak doğrulaması gerekli.",
    };
  const items = [];
  if (summary.finance_failed > 0)
    items.push({
      owner: "FRA-02",
      planId: "FP02",
      risk: "para",
      title: "Finans devir hatasını incele",
      fact:
        summary.finance_failed +
        " teknik devir hatası / durdurulmuş tekrar kaydı.",
      action:
        "Kaynak hata ve tekrar deneme kanıtını topla. Bu masadan yeniden gönderme yok.",
    });
  if (summary.approvals > 0)
    items.push({
      owner: "FRA-04",
      planId: "FP03",
      risk: "yetki",
      title: "Bekleyen kurul paketini doğrula",
      fact: summary.approvals + " kurul onayı bekleyen kaynak kaydı.",
      action:
        "Hazırlayan / onaylayan ayrımını ve dosya revizyonunu kontrol et. Karar verme.",
    });
  if (summary.finance_pending > 0)
    items.push({
      owner: "FRA-02",
      planId: "FP02",
      risk: "para",
      title: "Finans teslim sırasını takip et",
      fact: summary.finance_pending + " bekleyen / işlenen teknik devir kaydı.",
      action:
        "Teslim durumu ve kaynak zamanını kontrol et; kabul veya tahsilat sonucu çıkarma.",
    });
  if (summary.finance_processed > 0)
    items.push({
      owner: "FRA-02",
      planId: "FP02",
      risk: "para",
      title: "Finans iş kabulünü ayrı doğrula",
      fact: summary.finance_processed + " teknik olarak işlenmiş devir kaydı.",
      action:
        "Bu sayı iş kabulü veya tahsilat değildir. Yetkili Finans kabul referansını ara.",
    });
  return {
    known: true,
    items,
    note: items.length
      ? "Bunlar kaynaktan türetilen inceleme önerileridir; ajan koşusu veya Sami kuyruğunda yeni görev değildir."
      : observed.count === 0
        ? "Kaynakta süreç kaydı yok; canlı operasyon işi üretilmedi. Kaynak inceleme paketleri ayrıca kullanılabilir."
        : "Özet sayaçlarında bekleyen iş görünmüyor; dosya düzeyi aşama ve kanıt yeterliliği bu özetten doğrulanamaz.",
  };
}
