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
  { day: 30, title: "İlk ay operasyon ve kalite kontrolü", owner: "Operasyon", ownerRoles: ["op"] },
  { day: 60, title: "Finans, royalty ve kadro değerlendirmesi", owner: "Finans / İK", ownerRoles: ["fn", "ik"] },
  { day: 90, title: "Franchise performans kurulu", owner: "Franchise Direktörü", ownerRoles: ["fd"] }
];

export const NON_WAIVABLE_EXCEPTION_TYPES = new Set(["legal", "license", "payment"]);

export const OPENING_EVIDENCE_GATES = Object.freeze([
  { code: "entry_fee_payment", label: "%100 giriş bedeli tahsilatı", ownerRole: "fn" },
  { code: "franchise_contract", label: "İmzalı franchise sözleşmesi", ownerRole: "hk" },
  { code: "site_visit", label: "Konum / fotoğraf / ölçüm / denetçi saha ziyareti", ownerRole: "op" },
  { code: "operating_license", label: "Geçerli faaliyet ve ruhsat kaydı", ownerRole: "hk" }
]);

export function createOpeningEvidencePlan() {
  return OPENING_EVIDENCE_GATES.map((gate) => ({ ...gate, status: "missing", makerId: null, makerRole: null, checkerId: null, checkerRole: null, evidenceSha256: null, sourceReference: null }));
}

export function ensureOpeningEvidence(franchiseCase) {
  if (!Array.isArray(franchiseCase.openingEvidence)) franchiseCase.openingEvidence = createOpeningEvidencePlan();
  for (const gate of OPENING_EVIDENCE_GATES) {
    if (!franchiseCase.openingEvidence.some((item) => item.code === gate.code)) franchiseCase.openingEvidence.push({ ...gate, status: "missing", makerId: null, makerRole: null, checkerId: null, checkerRole: null, evidenceSha256: null, sourceReference: null });
  }
  return franchiseCase.openingEvidence;
}

export function submitOpeningEvidence(franchiseCase, gateCode, input = {}) {
  const gate = ensureOpeningEvidence(franchiseCase).find((item) => item.code === gateCode);
  if (!gate) throw new Error("Bilinmeyen açılış kanıtı.");
  if (!input.makerId || !input.makerRole) throw new Error("Kanıt hazırlayan kimliği ve rolü zorunludur.");
  if (input.makerRole !== gate.ownerRole && !new Set(["gm", "fd"]).has(input.makerRole)) throw new Error("Bu kanıt ilgili departman tarafından hazırlanmalıdır.");
  if (!/^[a-f0-9]{64}$/.test(String(input.evidenceSha256 || ""))) throw new Error("Kanıt SHA-256 özeti zorunludur.");
  if (String(input.sourceReference || "").trim().length < 3) throw new Error("Kanıt kaynak referansı zorunludur.");
  Object.assign(gate, { status: "submitted", makerId: input.makerId, makerRole: input.makerRole, checkerId: null, checkerRole: null, evidenceSha256: input.evidenceSha256, sourceReference: String(input.sourceReference).trim() });
  return gate;
}

export function reviewOpeningEvidence(franchiseCase, gateCode, review = {}) {
  const gate = ensureOpeningEvidence(franchiseCase).find((item) => item.code === gateCode);
  if (!gate || gate.status !== "submitted") throw new Error("İncelenecek gönderilmiş kanıt bulunamadı.");
  if (!review.checkerId || review.checkerId === gate.makerId) throw new Error("Kanıtı hazırlayan kişi kendi kaydını onaylayamaz.");
  if (!new Set(["gm", "fd"]).has(review.checkerRole)) throw new Error("İkinci onay yalnız GM veya Franchise Direktörü tarafından verilebilir.");
  if (!new Set(["approved", "rejected"]).has(review.decision)) throw new Error("Geçersiz kanıt kararı.");
  Object.assign(gate, { status: review.decision, checkerId: review.checkerId, checkerRole: review.checkerRole });
  return gate;
}

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
    openingEvidence: createOpeningEvidencePlan(),
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

export function requestException(franchiseCase, input = {}) {
  const type = input.type || "non_critical_schedule";
  if (NON_WAIVABLE_EXCEPTION_TYPES.has(type)) throw new Error("Hukuk, ruhsat ve %100 tahsilat kapıları istisnaya kapalıdır.");
  if (!String(input.reason || "").trim()) throw new Error("İstisna gerekçesi zorunludur.");
  const exception = {
    id: input.id || `EX-${Date.now()}`,
    type,
    stage: input.stage ?? franchiseCase.stage,
    reason: String(input.reason).trim(),
    requesterId: input.requesterId,
    requesterRole: input.requesterRole,
    status: "pending_second_approval",
    reviewerId: null,
    reviewerRole: null,
    reviewNote: null
  };
  franchiseCase.exceptions.push(exception);
  return exception;
}

export function reviewException(franchiseCase, exceptionId, review = {}) {
  const exception = franchiseCase.exceptions.find((item) => item.id === exceptionId);
  if (!exception) throw new Error("İstisna talebi bulunamadı.");
  if (exception.status !== "pending_second_approval") throw new Error("İstisna daha önce karara bağlandı.");
  if (!review.reviewerId || review.reviewerId === exception.requesterId) throw new Error("Talep eden kişi kendi istisnasını onaylayamaz.");
  if (!new Set(["gm", "fd"]).has(review.reviewerRole)) throw new Error("İkinci onay yalnız GM veya Franchise Direktörü tarafından verilebilir.");
  if (!new Set(["approved", "rejected"]).has(review.decision)) throw new Error("Geçersiz istisna kararı.");
  exception.status = review.decision;
  exception.reviewerId = review.reviewerId;
  exception.reviewerRole = review.reviewerRole;
  exception.reviewNote = String(review.note || "").trim() || null;
  return exception;
}

export function openingBlockers(franchiseCase, options = {}) {
  const blockers = [];
  const taskDone = options.taskDone ?? true;
  const taskTotal = options.taskTotal ?? 0;
  if (franchiseCase.consents < 3) blockers.push("KVKK izinleri eksik");
  if (franchiseCase.documents < franchiseCase.documentsTotal) blockers.push(`Zorunlu belgeler eksik (${franchiseCase.documents}/${franchiseCase.documentsTotal})`);
  if (franchiseCase.paid < 100) blockers.push("Açılış öncesi tahsilat %100 değil");
  if (!taskDone) blockers.push(`Departman görevleri eksik (${options.taskCount || 0}/${taskTotal})`);
  if (franchiseCase.exceptions.some((item) => item.status === "pending_second_approval")) blockers.push("İkinci onay bekleyen istisna bulunuyor");
  for (const gate of ensureOpeningEvidence(franchiseCase)) if (gate.status !== "approved") blockers.push(`${gate.label}: bağımsız onay eksik`);
  for (const member of franchiseCase.staffing) {
    if (member.recruitmentStatus !== "hired") blockers.push(`${member.role}: işe alım tamamlanmadı`);
    else if (!member.employmentDocumentsComplete || !member.contractSigned) blockers.push(`${member.role}: özlük veya sözleşme eksik`);
    else if (!hasValidCertificate(member, options.today)) blockers.push(`${member.role}: rol sertifikası geçersiz`);
  }
  return blockers;
}

export function activateFranchiseCase(franchiseCase, options = {}) {
  if (franchiseCase.branch?.status === "active") {
    return { ok: true, alreadyActive: true, branch: franchiseCase.branch, accounts: franchiseCase.accessAccounts, followUps: franchiseCase.followUps };
  }
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
  franchiseCase.followUps = FOLLOW_UP_TEMPLATES.map((item, index) => ({ ...item, id: `FU-${franchiseCase.id}-${index + 1}`, status: "open", completedBy: null, evidenceSha256: null, completionNote: null, reopenRequests: [] }));
  franchiseCase.stage = 13;
  franchiseCase.history.unshift(`${options.activatedAt || "2026-11-05"} · Sistem · Şube, personel bağlılıkları, kullanıcı kapsamları ve 30/60/90 görevleri atomik olarak oluşturuldu`);
  return { ok: true, branch: franchiseCase.branch, accounts: accountIds, followUps: franchiseCase.followUps };
}

export function completeFollowUp(franchiseCase, followUpId, input = {}) {
  const task = franchiseCase.followUps.find((item) => item.id === followUpId);
  if (!task || task.status !== "open") throw new Error("Açık takip görevi bulunamadı.");
  if (!task.ownerRoles.includes(input.actorRole) && input.actorRole !== "gm") throw new Error("Takip görevini yalnız görev sahibi departman kapatabilir.");
  if (!/^[a-f0-9]{64}$/.test(String(input.evidenceSha256 || ""))) throw new Error("Takip kanıtı SHA-256 özeti zorunludur.");
  if (String(input.note || "").trim().length < 3) throw new Error("Takip tamamlama notu zorunludur.");
  Object.assign(task, { status: "done", completedBy: input.actorId, evidenceSha256: input.evidenceSha256, completionNote: String(input.note).trim() });
  return task;
}

export function requestFollowUpReopen(franchiseCase, followUpId, input = {}) {
  const task = franchiseCase.followUps.find((item) => item.id === followUpId);
  if (!task || task.status !== "done") throw new Error("Tamamlanmış takip görevi bulunamadı.");
  if (!task.ownerRoles.includes(input.requesterRole) && input.requesterRole !== "gm") throw new Error("Yeniden açma talebini görev sahibi oluşturabilir.");
  const request = { id: input.id || `REOPEN-${followUpId}-${task.reopenRequests.length + 1}`, requesterId: input.requesterId, requesterRole: input.requesterRole, reason: String(input.reason || "").trim(), status: "pending", reviewerId: null };
  if (!request.requesterId || request.reason.length < 5) throw new Error("Yeniden açma gerekçesi zorunludur.");
  task.reopenRequests.push(request);
  return request;
}

export function reviewFollowUpReopen(franchiseCase, followUpId, requestId, input = {}) {
  const task = franchiseCase.followUps.find((item) => item.id === followUpId);
  const request = task?.reopenRequests.find((item) => item.id === requestId);
  if (!task || !request || request.status !== "pending") throw new Error("Bekleyen yeniden açma talebi bulunamadı.");
  if (!input.reviewerId || input.reviewerId === request.requesterId) throw new Error("Talep eden kendi yeniden açma talebini onaylayamaz.");
  if (!new Set(["gm", "fd"]).has(input.reviewerRole)) throw new Error("Yeniden açma ikinci onayı GM veya Franchise Direktörü vermelidir.");
  request.status = input.approve ? "applied" : "rejected";
  request.reviewerId = input.reviewerId;
  if (input.approve) Object.assign(task, { status: "open", completedBy: null, evidenceSha256: null, completionNote: null });
  return request;
}
