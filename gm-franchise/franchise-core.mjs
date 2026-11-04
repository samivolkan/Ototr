export const REQUIRED_ROLES = [
  { key: "owner", label: "Franchise sahibi", certification: true },
  { key: "manager", label: "Şube müdürü", certification: true },
  { key: "reception", label: "Müşteri kabul", certification: true },
  { key: "body_paint", label: "Kaporta / boya teknisyeni", certification: true },
  { key: "mechanical", label: "Motor / mekanik teknisyeni", certification: true },
  { key: "diagnostic", label: "Elektronik / diagnostik", certification: true },
  { key: "technical_lead", label: "Teknik sorumlu", certification: true },
  { key: "report_approver", label: "Rapor onay sorumlusu", certification: true },
  { key: "cashier", label: "Kasa / muhasebe", certification: true },
  { key: "support", label: "Destek / temizlik", certification: false }
];

export const FOLLOW_UP_TEMPLATES = [
  { day: 30, title: "İlk ay operasyon ve kalite kontrolü", owner: "Operasyon" },
  { day: 60, title: "Finans, royalty ve kadro değerlendirmesi", owner: "Finans / İK" },
  { day: 90, title: "Franchise performans kurulu", owner: "Franchise Direktörü" }
];

export function createStaffingPlan() {
  return REQUIRED_ROLES.map((role, index) => ({
    id: `staff-${index + 1}`,
    roleKey: role.key,
    role: role.label,
    certificationRequired: role.certification,
    personName: "",
    recruitmentStatus: "open",
    employmentDocumentsComplete: false,
    contractSigned: false,
    academyAssigned: false,
    academyCompleted: false,
    certificateValidUntil: null,
    accessStatus: "blocked",
    branchId: null
  }));
}

export function createFranchiseCase(input = {}) {
  const id = input.id || `FR-${Date.now()}`;
  return {
    id,
    applicationId: input.applicationId || `APP-${id}`,
    candidate: input.candidate || "Yeni franchise adayı",
    name: input.name || `${input.district || "Yeni"} OTOTR`,
    city: input.city || "Bursa",
    district: input.district || "Nilüfer",
    branchType: input.branchType || "Standart",
    stage: input.stage ?? 0,
    score: input.score ?? 0,
    days: input.days ?? 0,
    target: 60,
    paid: input.paid ?? 0,
    royalty: input.royalty ?? 10,
    adFund: input.adFund ?? 0,
    exemption: input.exemption ?? 0,
    territory: input.territory || `${input.district || "Nilüfer"} · bölge bekliyor`,
    consents: input.consents ?? 0,
    documents: input.documents ?? 0,
    documentsTotal: input.documentsTotal ?? 17,
    exceptions: [],
    tasks: input.tasks || {},
    staffing: createStaffingPlan(),
    branch: null,
    accessAccounts: [],
    followUps: [],
    history: input.history || []
  };
}

export function hireStaff(franchiseCase, roleKey, personName) {
  const member = franchiseCase.staffing.find((item) => item.roleKey === roleKey);
  if (!member) throw new Error("Zorunlu kadro rolü bulunamadı.");
  const name = String(personName || "").trim();
  if (!name) throw new Error("Personel adı zorunludur.");
  member.personName = name;
  member.recruitmentStatus = "hired";
  member.accessStatus = "blocked";
  return member;
}

export function updateStaffCompliance(franchiseCase, roleKey, patch = {}) {
  const member = franchiseCase.staffing.find((item) => item.roleKey === roleKey);
  if (!member) throw new Error("Personel bulunamadı.");
  const allowed = ["employmentDocumentsComplete", "contractSigned", "academyAssigned", "academyCompleted", "certificateValidUntil"];
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch, key)) member[key] = patch[key];
  member.accessStatus = staffReadyForAccess(member) ? "ready" : "blocked";
  return member;
}

export function hasValidCertificate(member, today = "2026-11-05") {
  if (!member.certificationRequired) return true;
  return Boolean(member.academyCompleted && member.certificateValidUntil && member.certificateValidUntil >= today);
}

export function staffReadyForAccess(member, today = "2026-11-05") {
  return member.recruitmentStatus === "hired" && member.employmentDocumentsComplete && member.contractSigned && hasValidCertificate(member, today);
}

export function openingBlockers(franchiseCase, options = {}) {
  const blockers = [];
  const taskDone = options.taskDone ?? true;
  const taskTotal = options.taskTotal ?? 0;
  if (franchiseCase.consents < 3) blockers.push("KVKK izinleri eksik");
  if (franchiseCase.documents < franchiseCase.documentsTotal) blockers.push(`Zorunlu belgeler eksik (${franchiseCase.documents}/${franchiseCase.documentsTotal})`);
  if (franchiseCase.paid < 100) blockers.push("Açılış öncesi tahsilat %100 değil");
  if (!taskDone) blockers.push(`Departman görevleri eksik (${options.taskCount || 0}/${taskTotal})`);
  if (franchiseCase.exceptions.length) blockers.push("Açık istisna bulunuyor");
  for (const member of franchiseCase.staffing) {
    if (member.recruitmentStatus !== "hired") blockers.push(`${member.role}: işe alım tamamlanmadı`);
    else if (!member.employmentDocumentsComplete || !member.contractSigned) blockers.push(`${member.role}: özlük veya sözleşme eksik`);
    else if (!hasValidCertificate(member, options.today)) blockers.push(`${member.role}: rol sertifikası geçersiz`);
  }
  return blockers;
}

export function activateFranchiseCase(franchiseCase, options = {}) {
  const blockers = openingBlockers(franchiseCase, options);
  if (blockers.length) return { ok: false, blockers };
  const branchId = options.branchId || `BR-${franchiseCase.id}`;
  const accountIds = franchiseCase.staffing.map((member, index) => ({
    id: `USR-${franchiseCase.id}-${index + 1}`,
    personName: member.personName,
    roleKey: member.roleKey,
    branchId,
    status: "active"
  }));
  franchiseCase.branch = { id: branchId, name: franchiseCase.name, status: "active", activatedAt: options.activatedAt || "2026-11-05" };
  franchiseCase.accessAccounts = accountIds;
  franchiseCase.staffing.forEach((member) => { member.branchId = branchId; member.accessStatus = "active"; });
  franchiseCase.followUps = FOLLOW_UP_TEMPLATES.map((item, index) => ({ ...item, id: `FU-${franchiseCase.id}-${index + 1}`, status: "open" }));
  franchiseCase.stage = 13;
  franchiseCase.history.unshift(`${options.activatedAt || "2026-11-05"} · Sistem · Şube, personel bağlılıkları, kullanıcı kapsamları ve 30/60/90 görevleri atomik olarak oluşturuldu`);
  return { ok: true, branch: franchiseCase.branch, accounts: accountIds, followUps: franchiseCase.followUps };
}
