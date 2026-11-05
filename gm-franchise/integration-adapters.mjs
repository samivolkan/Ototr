import { FRANCHISE_EVENT_CONTRACTS, FRANCHISE_EVENT_CONTRACT_VERSION, validateFranchiseIntegrationPayload } from '../supabase/functions/_shared/franchise-integration-contracts.mjs';

export const FRANCHISE_INTEGRATIONS = Object.freeze({
  finance: { label: "Finans / Muhasebe", route: "../index.html#finance", events: ["payment_plan.created", "opening_payment.verified", "royalty_profile.created"] },
  legal: { label: "Hukuk", route: "../index.html#legal", events: ["due_diligence.completed", "contract.signed", "territory.approved"] },
  hr: { label: "İnsan Kaynakları", route: "../gm-ik/#ise_alim", events: ["staffing_plan.created", "employee.hired", "employment_file.completed"] },
  academy: { label: "Academy", route: "../index.html#academy", events: ["course.assigned", "certificate.issued", "certificate.expired"] },
  operations: { label: "Operasyon", route: "../index.html#operations", events: ["site_visit.completed", "trial_operation.completed"] },
  procurement: { label: "Tedarik", route: "../index.html#procurement", events: ["equipment.ordered", "equipment.delivered", "calibration.verified"] },
  it: { label: "Bilgi Teknolojileri", route: "../index.html#settings", events: ["account.provisioning_requested", "account.activated", "branch_scope.assigned"] },
  marketing: { label: "Pazarlama", route: "../index.html#marketing", events: ["brand_application.approved", "opening_campaign.ready"] },
  quality: { label: "Kalite", route: "../index.html#quality", events: ["quality_audit.completed", "corrective_action.closed"] },
  ohs: { label: "İSG", route: "../index.html#quality", events: ["risk_assessment.completed", "emergency_plan.published"] },
  architecture: { label: "Mimari / Proje", route: "../index.html#project-roadmap", events: ["project.approved", "construction.completed", "handover.signed"] },
  tasks: { label: "Görev Merkezi", route: "../index.html#actions", events: ["opening_tasks.created", "followup_tasks.created"] }
});

export function validateIntegrationEvent(event) {
  if (!event || typeof event !== "object") throw new Error("Entegrasyon olayı zorunludur.");
  if (!event.id || !event.franchiseCaseId || !event.type || !event.source) throw new Error("id, franchiseCaseId, type ve source zorunludur.");
  const adapter = FRANCHISE_INTEGRATIONS[event.source];
  if (!adapter) throw new Error("Bilinmeyen entegrasyon kaynağı.");
  if (!adapter.events.includes(event.type)) throw new Error("Olay türü kaynak adaptörüyle uyumsuz.");
  validateFranchiseIntegrationPayload(event.source, event.type, event.payload, event.contractVersion);
  return true;
}

export function createIntegrationOutboxEvent({ franchiseCaseId, type, source, payload = {}, occurredAt = "2026-11-05T00:00:00Z", contractVersion = FRANCHISE_EVENT_CONTRACT_VERSION }) {
  const event = { id: `EVT-${franchiseCaseId}-${source}-${type}-v${contractVersion}`, franchiseCaseId, type, source, payload, contractVersion, occurredAt, status: "pending", attempts: 0 };
  validateIntegrationEvent(event);
  return event;
}

export { FRANCHISE_EVENT_CONTRACTS, FRANCHISE_EVENT_CONTRACT_VERSION };

export function processIntegrationEvent(event, handlers = {}) {
  validateIntegrationEvent(event);
  const handler = handlers[event.source];
  if (!handler) return { ...event, status: "adapter_not_configured", lastError: "Gerçek sağlayıcı/ERP adaptörü staging ortamında yapılandırılmalı." };
  const result = handler(event);
  return { ...event, status: "processed", processedAt: result?.processedAt || "2026-11-05T00:00:01Z", result: result || null };
}
