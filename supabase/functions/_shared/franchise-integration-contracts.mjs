export const FRANCHISE_EVENT_CONTRACT_VERSION = 1;

const contract = (required = [], optional = []) => Object.freeze({ required: Object.freeze(required), allowed: Object.freeze([...new Set([...required, ...optional])]) });

export const FRANCHISE_EVENT_CONTRACTS = Object.freeze({
  finance: Object.freeze({
    'payment_plan.created': contract(['payment_plan_id'], ['branch_id', 'installment_count']),
    'opening_payment.verified': contract(['payment_verification_id'], ['branch_id', 'paid_ratio']),
    'royalty_profile.created': contract(['branch_id'], ['royalty_rate', 'exemption_months'])
  }),
  accounting: Object.freeze({
    'chart_of_accounts.created': contract(['branch_id', 'chart_reference']),
    'current_account.created': contract(['branch_id', 'current_account_id']),
    'opening_balance.reconciled': contract(['branch_id', 'reconciliation_id'], ['period_reference'])
  }),
  legal: Object.freeze({
    'due_diligence.completed': contract(['due_diligence_id']),
    'contract.signed': contract(['contract_id'], ['template_version']),
    'territory.approved': contract(['territory_id'], ['protection_type'])
  }),
  hr: Object.freeze({
    'staffing_plan.created': contract(['branch_id'], ['branch_type', 'required_role_count']),
    'employee.hired': contract(['staff_id', 'role_key'], ['branch_id']),
    'employment_file.completed': contract(['staff_id'], ['branch_id'])
  }),
  academy: Object.freeze({
    'course.assigned': contract(['staff_id', 'course_id']),
    'certificate.issued': contract(['staff_id', 'certificate_id'], ['valid_until']),
    'certificate.expired': contract(['staff_id', 'certificate_id'])
  }),
  operations: Object.freeze({
    'site_visit.completed': contract(['site_visit_id'], ['location_id']),
    'trial_operation.completed': contract(['trial_operation_id'], ['branch_id'])
  }),
  procurement: Object.freeze({
    'equipment.ordered': contract(['order_id'], ['branch_id']),
    'equipment.delivered': contract(['order_id', 'delivery_id'], ['branch_id']),
    'calibration.verified': contract(['equipment_id', 'calibration_id'], ['branch_id'])
  }),
  it: Object.freeze({
    'account.provisioning_requested': contract(['branch_id'], ['staff_scope_count']),
    'account.activated': contract(['access_account_id'], ['branch_id']),
    'branch_scope.assigned': contract(['access_account_id', 'branch_id'])
  }),
  marketing: Object.freeze({
    'brand_application.approved': contract(['brand_application_id'], ['branch_id']),
    'opening_campaign.ready': contract(['campaign_id'], ['branch_id'])
  }),
  quality: Object.freeze({
    'quality_audit.completed': contract(['audit_id'], ['branch_id']),
    'corrective_action.closed': contract(['corrective_action_id'], ['audit_id'])
  }),
  ohs: Object.freeze({
    'risk_assessment.completed': contract(['risk_assessment_id'], ['branch_id']),
    'emergency_plan.published': contract(['emergency_plan_id'], ['branch_id'])
  }),
  architecture: Object.freeze({
    'project.approved': contract(['project_id'], ['branch_id']),
    'construction.completed': contract(['project_id', 'handover_id'], ['branch_id']),
    'handover.signed': contract(['handover_id'], ['branch_id'])
  }),
  tasks: Object.freeze({
    'opening_tasks.created': contract(['franchise_case_id'], ['task_count']),
    'followup_tasks.created': contract(['branch_id'], ['task_count'])
  })
});

export const PROHIBITED_INTEGRATION_KEY_PATTERN = /^(tckn|tc_kimlik_no|national_id|phone|telephone|email|iban|bank_account|plate|license_plate|vin|chassis|engine_no|person_name|full_name|document_url|file_url|token|password|secret)$/i;

function assertNoProhibitedKeys(value) {
  if (Array.isArray(value)) return value.forEach(assertNoProhibitedKeys);
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (PROHIBITED_INTEGRATION_KEY_PATTERN.test(key)) throw new Error(`Entegrasyon yükünde yasaklı kişisel/gizli alan: ${key}`);
    assertNoProhibitedKeys(nested);
  }
}

export function validateFranchiseIntegrationPayload(source, type, payload = {}, version = FRANCHISE_EVENT_CONTRACT_VERSION) {
  if (version !== FRANCHISE_EVENT_CONTRACT_VERSION) throw new Error('Desteklenmeyen entegrasyon sözleşme sürümü.');
  const definition = FRANCHISE_EVENT_CONTRACTS[source]?.[type];
  if (!definition) throw new Error('Olay türü kaynak adaptörüyle uyumsuz.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Entegrasyon yükü JSON nesnesi olmalıdır.');
  assertNoProhibitedKeys(payload);
  const keys = Object.keys(payload);
  const unexpected = keys.filter((key) => !definition.allowed.includes(key));
  if (unexpected.length) throw new Error(`Entegrasyon yükünde sözleşme dışı alan: ${unexpected.join(', ')}`);
  const missing = definition.required.filter((key) => !Object.hasOwn(payload, key) || payload[key] === null || payload[key] === '');
  if (missing.length) throw new Error(`Entegrasyon yükünde zorunlu alan eksik: ${missing.join(', ')}`);
  return true;
}
