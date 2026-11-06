const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READ_OPERATION = 'getDealerFinanceSummary';
const DEALER_SUMMARY_EXPORT_OPERATION='exportDealerFinanceSummary';
const HEADQUARTERS_OPERATION = 'getHeadquartersFinanceSummary';
const HEADQUARTERS_EXPORT_OPERATION='exportHeadquartersFinanceSummary';
const OPERATIONAL_HEALTH_OPERATION = 'getFinanceOperationalHealth';
const EXPENSES_OPERATION='listPassThroughExpenses';
const EXPENSE_OPERATION='getPassThroughExpense';
const EXPORT_PACKAGES_OPERATION='listFinanceExportPackages';
const EXPORT_PACKAGE_OPERATION='getFinanceExportPackage';
const INTEGRATION_ERRORS_OPERATION='listIntegrationErrors';
const INTEGRATION_ERROR_OPERATION='getIntegrationError';
const APPROVALS_OPERATION='listApprovalWorkItems';
const APPROVAL_OPERATION='getApprovalWorkItem';
const AUDIT_EVENTS_OPERATION='listAuditEvents';
const AUDIT_EXPORT_OPERATION='exportAuditEvents';
const AUDIT_TRACE_OPERATION='getAuditCorrelationTrace';
const DISPUTES_OPERATION='listDisputes';
const DISPUTE_OPERATION='getDispute';
const STATEMENT_OPERATION = 'getDealerStatement';
const STATEMENT_CONTROL_OPERATION = 'getDealerStatementControl';
const STATEMENT_EXPORT_OPERATION = 'exportDealerStatement';
const ACCRUALS_OPERATION='listAccruals';
const ACCRUAL_EXPORT_OPERATION='exportAccruals';
const PAYMENTS_OPERATION = 'listPayments';
const PAYMENT_OPERATION = 'getPayment';
const ACCRUAL_OPERATION = 'getAccrualDetail';
const REFUNDS_OPERATION = 'listRoyaltyRefunds';
const SERVICE_USAGES_OPERATION='listServiceUsages';
const REFUND_TRACE_OPERATION = 'getRoyaltyRefundTrace';
const PERIOD_OPERATION = 'getFinancePeriod';
const PERIOD_RECONCILIATIONS_OPERATION='getFinancePeriodReconciliations';
const CURRENT_CONTRACT_OPERATION = 'getCurrentFranchiseContract';
const CONTRACT_VERSIONS_OPERATION = 'listContractVersions';
const CONTRACT_RULES_OPERATION = 'listContractFeeRules';
const CONTRACT_RULE_OPERATION = 'getContractFeeRule';
const CONTRACT_COMPARISON_OPERATION = 'getContractVersionComparison';
const CONTRACT_IMPACT_OPERATION = 'simulateContractVersionImpact';

export class FinanceBridgeError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'FinanceBridgeError';
    this.code = code;
    this.status = status;
  }
}

function requiredUuid(value, field, code = 'FINANCE_SCOPE_INVALID') {
  if (typeof value !== 'string' || !UUID.test(value)) throw new FinanceBridgeError(code, `${field} geçerli UUID olmalıdır.`);
  return value.toLowerCase();
}

export function validateFinanceScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new FinanceBridgeError('FINANCE_SCOPE_INVALID', 'Finans kapsamı zorunludur.');
  return Object.freeze({
    legalEntityId: requiredUuid(scope.legalEntityId, 'legalEntityId'),
    dealerAccountId: requiredUuid(scope.dealerAccountId, 'dealerAccountId'),
    branchId: requiredUuid(scope.branchId, 'branchId'),
  });
}

function validatedConfig(config) {
  let url;
  try { url = new URL(config?.url); } catch { throw new FinanceBridgeError('CONFIGURATION_ERROR', 'Finans Supabase URL geçersiz.'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new FinanceBridgeError('CONFIGURATION_ERROR', 'Finans Supabase URL HTTPS olmalıdır.');
  const publishableKey = config?.publishableKey;
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_') || publishableKey.length < 24) throw new FinanceBridgeError('CONFIGURATION_ERROR', 'Finans tarayıcı istemcisi yalnız publishable key kabul eder.');
  return Object.freeze({url: url.origin, publishableKey});
}

function validatedToken(token) {
  if (typeof token !== 'string' || token.length < 20) throw new FinanceBridgeError('AUTH_REQUIRED', 'Geçerli finans kullanıcı oturumu bulunamadı.', 401);
  return token;
}

async function jsonOrNull(response) {
  if (!(response.headers?.get?.('content-type') || '').toLowerCase().includes('application/json')) return null;
  try { return await response.json(); } catch { return null; }
}

export function createFinanceSummaryClient({getConfig, getAccessToken, fetchImpl = globalThis.fetch, correlationFactory = () => crypto.randomUUID(), timeoutMs = 10000} = {}) {
  if (typeof getConfig !== 'function' || typeof getAccessToken !== 'function' || typeof fetchImpl !== 'function') throw new FinanceBridgeError('CONFIGURATION_ERROR', 'Finans istemci bağımlılıkları eksik.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) throw new FinanceBridgeError('CONFIGURATION_ERROR', 'Finans timeout değeri geçersiz.');
  async function execute(rawScope, operationId, query, extraPathParams = {}, allowNull = false, headquarters = false) {
      const scope = validateFinanceScope(rawScope);
      const config = validatedConfig(await getConfig());
      const accessToken = validatedToken(await getAccessToken());
      const correlationId = correlationFactory();
      if (!UUID.test(correlationId)) throw new FinanceBridgeError('CORRELATION_UNAVAILABLE', 'Geçerli correlation UUID üretilemedi.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${config.url}/functions/v1/finance-read`, {
          method: 'POST', signal: controller.signal,
          headers: {apikey: config.publishableKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=utf-8', 'X-Client-Info': 'ototr-finance-web/0.1', 'Correlation-Id': correlationId},
          body: JSON.stringify({operationId, scope, pathParams: headquarters ? {...extraPathParams} : {dealerAccountId: scope.dealerAccountId, ...extraPathParams}, query}),
        });
        const payload = await jsonOrNull(response);
        if (!response.ok) throw new FinanceBridgeError(payload?.error?.code || (response.status === 403 ? 'SCOPE_DENIED' : 'FINANCE_READ_FAILED'), payload?.error?.message || 'Finans özeti alınamadı.', response.status);
        const data = payload && Object.prototype.hasOwnProperty.call(payload,'data') ? payload.data : payload;
        if (!(allowNull && data === null) && (!data || typeof data !== 'object')) throw new FinanceBridgeError('INVALID_RESPONSE', 'Finans servisi geçersiz yanıt verdi.', 502);
        return Object.freeze({data, scope, correlationId: response.headers?.get?.('correlation-id') || correlationId});
      } catch (error) {
        if (error?.name === 'AbortError') throw new FinanceBridgeError('TIMEOUT', 'Finans servisi zaman aşımına uğradı.');
        if (error instanceof FinanceBridgeError) throw error;
        throw new FinanceBridgeError('TRANSPORT_ERROR', 'Finans servisine ulaşılamadı.');
      } finally { clearTimeout(timer); }
  }
  return Object.freeze({
    async getFinanceOperationalHealth(rawScope) {return execute(rawScope,OPERATIONAL_HEALTH_OPERATION,{}, {},false,true);},
    async getHeadquartersFinanceSummary(rawScope,{asOf,currency='TRY'}={}) {
      if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new FinanceBridgeError('VALIDATION_ERROR','asOf YYYY-MM-DD biçiminde zorunludur.');
      if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency)) throw new FinanceBridgeError('VALIDATION_ERROR','Para birimi üç harfli kod olmalıdır.');
      return execute(rawScope,HEADQUARTERS_OPERATION,{asOf,currency},{},true,true);
    },
    async exportHeadquartersFinanceSummary(rawScope,{asOf,currency='TRY'}={}){if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw new FinanceBridgeError('VALIDATION_ERROR','asOf YYYY-MM-DD biçiminde zorunludur.');if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))throw new FinanceBridgeError('VALIDATION_ERROR','Para birimi üç harfli kod olmalıdır.');return execute(rawScope,HEADQUARTERS_EXPORT_OPERATION,{asOf,currency},{},false,true);},
    async listPassThroughExpenses(rawScope,{from,to,status,cursor,limit}={}) {for(const [field,value] of [['from',from],['to',to]])if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);if(from&&to&&from>to)throw new FinanceBridgeError('VALIDATION_ERROR','Masraf tarih aralığı geçersiz.');if(status!==undefined&&!['DRAFT','CALCULATED','PENDING_APPROVAL','APPROVED','POSTED','REVERSED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','Masraf durumu geçersiz.');if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512))throw new FinanceBridgeError('VALIDATION_ERROR','Masraf cursor değeri geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Masraf limit değeri geçersiz.');return execute(rawScope,EXPENSES_OPERATION,{from,to,status,cursor,limit},{},false,true);},
    async getPassThroughExpense(rawScope,expenseId){const id=requiredUuid(expenseId,'expenseId','VALIDATION_ERROR');return execute(rawScope,EXPENSE_OPERATION,{}, {expenseId:id},true,true);},
    async listFinanceExportPackages(rawScope,{packageType,status,cursor,limit}={}){if(packageType!==undefined&&!['BILLING','ACCOUNTING'].includes(packageType))throw new FinanceBridgeError('VALIDATION_ERROR','Export paketi türü geçersiz.');if(status!==undefined&&!['DRAFT','READY','EXPORT_QUEUED','EXPORTED','INVOICED','PARTIALLY_ACCEPTED','ACCEPTED','REJECTED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','Export paketi durumu geçersiz.');if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512))throw new FinanceBridgeError('VALIDATION_ERROR','Export paketi cursor değeri geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Export paketi limit değeri geçersiz.');return execute(rawScope,EXPORT_PACKAGES_OPERATION,{packageType,status,cursor,limit},{},false,true);},
    async getFinanceExportPackage(rawScope,packageType,packageId){if(!['BILLING','ACCOUNTING'].includes(packageType))throw new FinanceBridgeError('VALIDATION_ERROR','Export paketi türü geçersiz.');const id=requiredUuid(packageId,'packageId','VALIDATION_ERROR');return execute(rawScope,EXPORT_PACKAGE_OPERATION,{packageType},{packageId:id},true,true);},
    async listIntegrationErrors(rawScope,{status,sourceSystem,cursor,limit}={}){if(status!==undefined&&!['RETRYABLE','ACTION_REQUIRED','RESOLVED','IGNORED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','Entegrasyon hata durumu geçersiz.');if(sourceSystem!==undefined&&(typeof sourceSystem!=='string'||!/^[A-Z][A-Z0-9_-]{1,63}$/.test(sourceSystem)))throw new FinanceBridgeError('VALIDATION_ERROR','Kaynak sistem filtresi geçersiz.');if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512))throw new FinanceBridgeError('VALIDATION_ERROR','Entegrasyon hata cursor değeri geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Entegrasyon hata limit değeri geçersiz.');return execute(rawScope,INTEGRATION_ERRORS_OPERATION,{status,sourceSystem,cursor,limit});},
    async getIntegrationError(rawScope,errorId){const id=requiredUuid(errorId,'errorId','VALIDATION_ERROR');return execute(rawScope,INTEGRATION_ERROR_OPERATION,{}, {errorId:id},true);},
    async listApprovalWorkItems(rawScope,{status,subjectType,cursor,limit}={}){if(status!==undefined&&!['PENDING','APPROVED','REJECTED','CANCELLED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','Onay durumu geçersiz.');if(subjectType!==undefined&&!/^[A-Z][A-Z0-9_]{1,63}$/.test(subjectType))throw new FinanceBridgeError('VALIDATION_ERROR','Onay konu türü geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Onay limit değeri geçersiz.');return execute(rawScope,APPROVALS_OPERATION,{status,subjectType,cursor,limit});},
    async getApprovalWorkItem(rawScope,requestId){return execute(rawScope,APPROVAL_OPERATION,{}, {requestId:requiredUuid(requestId,'requestId','VALIDATION_ERROR')},true);},
    async listAuditEvents(rawScope,{actionCode,subjectType,cursor,limit}={}){for(const [field,value]of[['actionCode',actionCode],['subjectType',subjectType]])if(value!==undefined&&!/^[A-Z][A-Z0-9_]{1,63}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} geçersiz.`);if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Audit limit değeri geçersiz.');return execute(rawScope,AUDIT_EVENTS_OPERATION,{actionCode,subjectType,cursor,limit});},
    async exportAuditEvents(rawScope,{from,to,actionCode,subjectType,limit=10000}={}){for(const [field,value]of[['from',from],['to',to]])if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);if(from&&to&&from>to)throw new FinanceBridgeError('VALIDATION_ERROR','Audit export tarih aralığı geçersiz.');for(const [field,value]of[['actionCode',actionCode],['subjectType',subjectType]])if(value!==undefined&&!/^[A-Z][A-Z0-9_]{1,63}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} geçersiz.`);if(!Number.isInteger(limit)||limit<1||limit>10000)throw new FinanceBridgeError('VALIDATION_ERROR','Audit export limiti geçersiz.');return execute(rawScope,AUDIT_EXPORT_OPERATION,{from,to,actionCode,subjectType,limit});},
    async getAuditCorrelationTrace(rawScope,correlationId){return execute(rawScope,AUDIT_TRACE_OPERATION,{}, {correlationId:requiredUuid(correlationId,'correlationId','VALIDATION_ERROR')});},
    async listDisputes(rawScope,{status,cursor,limit}={}) {if(status!==undefined&&!['DRAFT','SUBMITTED','UNDER_REVIEW','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','CLOSED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','İtiraz durumu geçersiz.');if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512))throw new FinanceBridgeError('VALIDATION_ERROR','İtiraz cursor değeri geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','İtiraz limit değeri geçersiz.');return execute(rawScope,DISPUTES_OPERATION,{status,cursor,limit});},
    async getDispute(rawScope,disputeId){const id=requiredUuid(disputeId,'disputeId','VALIDATION_ERROR');return execute(rawScope,DISPUTE_OPERATION,{}, {disputeId:id},true);},
    async getDealerFinanceSummary(rawScope, {asOf} = {}) {
      if (asOf !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new FinanceBridgeError('VALIDATION_ERROR', 'asOf YYYY-MM-DD biçiminde olmalıdır.');
      return execute(rawScope, READ_OPERATION, {asOf});
    },
    async exportDealerFinanceSummary(rawScope,{asOf}={}){if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw new FinanceBridgeError('VALIDATION_ERROR','asOf YYYY-MM-DD biçiminde zorunludur.');return execute(rawScope,DEALER_SUMMARY_EXPORT_OPERATION,{asOf});},
    async getDealerStatement(rawScope, {from,to,status,cursor,limit} = {}) {
      for (const [field,value] of [['from',from],['to',to]]) if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FinanceBridgeError('VALIDATION_ERROR', `${field} YYYY-MM-DD biçiminde olmalıdır.`);
      if (from && to && from > to) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ekstre tarih aralığı geçersiz.');
      if (status !== undefined && !['OPEN','PARTIALLY_ALLOCATED','CLOSED','DISPUTED','REVERSED'].includes(status)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ekstre durum filtresi geçersiz.');
      if (cursor !== undefined && (typeof cursor !== 'string' || !cursor.length || cursor.length > 512)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ekstre cursor değeri geçersiz.');
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 200)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ekstre limit değeri 1–200 arasında olmalıdır.');
      return execute(rawScope, STATEMENT_OPERATION, {from,to,status,cursor,limit});
    },
    async getDealerStatementControl(rawScope, {from,to,currency='TRY'} = {}) {
      for (const [field,value] of [['from',from],['to',to]]) if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new FinanceBridgeError('VALIDATION_ERROR', `${field} YYYY-MM-DD biçiminde olmalıdır.`);
      if (from > to) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ekstre kontrol tarih aralığı geçersiz.');
      if (!/^[A-Z]{3}$/.test(currency)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Para birimi geçersiz.');
      return execute(rawScope, STATEMENT_CONTROL_OPERATION, {from,to,currency});
    },
    async exportDealerStatement(rawScope,{from,to,currency='TRY',status,limit=10000}={}) {
      for(const [field,value] of [['from',from],['to',to]])if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);
      if(from>to||!/^[A-Z]{3}$/.test(currency)||!Number.isInteger(limit)||limit<1||limit>10000)throw new FinanceBridgeError('VALIDATION_ERROR','Ekstre export filtresi geçersiz.');
      if(status!==undefined&&!['OPEN','PARTIALLY_ALLOCATED','CLOSED','DISPUTED','REVERSED'].includes(status))throw new FinanceBridgeError('VALIDATION_ERROR','Ekstre durumu geçersiz.');
      return execute(rawScope,STATEMENT_EXPORT_OPERATION,{from,to,currency,status,limit});
    },
    async listAccruals(rawScope,{from,to,status,feeFamily,periodStatus,cursor,limit}={}){for(const[field,value]of[['from',from],['to',to]])if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} geçersiz.`);if(from&&to&&from>to)throw new FinanceBridgeError('VALIDATION_ERROR','Tahakkuk tarih aralığı geçersiz.');if(feeFamily!==undefined&&!['ROYALTY','ENTRY_FRANCHISE','PERIODIC_FRANCHISE','QUERY','EXTERNAL_SERVICE','OPTIONAL_PRODUCT_SERVICE','PASS_THROUGH_EXPENSE','ADJUSTMENT'].includes(feeFamily))throw new FinanceBridgeError('VALIDATION_ERROR','Bedel ailesi geçersiz.');if(periodStatus!==undefined&&!['OPEN','SOURCE_FROZEN','CALCULATED','INTERNAL_REVIEW','SENT_TO_DEALER','DISPUTED','RECONCILED','APPROVED','LOCKED','REOPEN_PENDING','REOPENED'].includes(periodStatus))throw new FinanceBridgeError('VALIDATION_ERROR','Dönem durumu geçersiz.');return execute(rawScope,ACCRUALS_OPERATION,{from,to,status,feeFamily,periodStatus,cursor,limit});},
    async exportAccruals(rawScope,{from,to,currency='TRY',status,feeFamily,periodStatus,limit=10000}={}){for(const[field,value]of[['from',from],['to',to]])if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} geçersiz.`);if(from>to||!/^[A-Z]{3}$/.test(currency)||!Number.isInteger(limit)||limit<1||limit>10000)throw new FinanceBridgeError('VALIDATION_ERROR','Tahakkuk export filtresi geçersiz.');return execute(rawScope,ACCRUAL_EXPORT_OPERATION,{from,to,currency,status,feeFamily,periodStatus,limit});},
    async getPayment(rawScope, paymentId) {
      const normalizedPaymentId = requiredUuid(paymentId, 'paymentId', 'VALIDATION_ERROR');
      return execute(rawScope, PAYMENT_OPERATION, {}, {paymentId:normalizedPaymentId});
    },
    async listPayments(rawScope, {from,to,status,cursor,limit} = {}) {
      for (const [field,value] of [['from',from],['to',to]]) if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FinanceBridgeError('VALIDATION_ERROR', `${field} YYYY-MM-DD biçiminde olmalıdır.`);
      if (from && to && from > to) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ödeme tarih aralığı geçersiz.');
      if (status !== undefined && !['PENDING_VERIFICATION','VERIFIED','PARTIALLY_ALLOCATED','ALLOCATED','REVERSED','REJECTED'].includes(status)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ödeme durum filtresi geçersiz.');
      if (cursor !== undefined && (typeof cursor !== 'string' || !cursor.length || cursor.length > 512)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ödeme cursor değeri geçersiz.');
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 200)) throw new FinanceBridgeError('VALIDATION_ERROR', 'Ödeme limit değeri 1–200 arasında olmalıdır.');
      return execute(rawScope, PAYMENTS_OPERATION, {from,to,status,cursor,limit});
    },
    async getAccrualDetail(rawScope, accrualId) {
      const normalizedAccrualId = requiredUuid(accrualId, 'accrualId', 'VALIDATION_ERROR');
      return execute(rawScope, ACCRUAL_OPERATION, {}, {accrualId:normalizedAccrualId});
    },
    async getRoyaltyRefundTrace(rawScope, reversalAccrualId) {
      const normalizedId = requiredUuid(reversalAccrualId, 'reversalAccrualId', 'VALIDATION_ERROR');
      return execute(rawScope, REFUND_TRACE_OPERATION, {}, {reversalAccrualId:normalizedId});
    },
    async listRoyaltyRefunds(rawScope,{from,to,cursor,limit}={}) {
      for(const [field,value] of [['from',from],['to',to]]) if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);
      if(from&&to&&from>to) throw new FinanceBridgeError('VALIDATION_ERROR','İade tarih aralığı geçersiz.');
      if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512)) throw new FinanceBridgeError('VALIDATION_ERROR','İade cursor değeri geçersiz.');
      if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200)) throw new FinanceBridgeError('VALIDATION_ERROR','İade limit değeri 1–200 arasında olmalıdır.');
      return execute(rawScope,REFUNDS_OPERATION,{from,to,cursor,limit});
    },
    async listServiceUsages(rawScope,{from,to,family,chargeStatus,cursor,limit}={}) {
      for(const [field,value] of [['from',from],['to',to]]) if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);if(from&&to&&from>to) throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım tarih aralığı geçersiz.');if(family!==undefined&&!['QUERY','EXTERNAL_SERVICE'].includes(family)) throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım ailesi geçersiz.');if(chargeStatus!==undefined&&!['CHARGED','NOT_CHARGED','FAILED'].includes(chargeStatus)) throw new FinanceBridgeError('VALIDATION_ERROR','Ücret durumu geçersiz.');if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>512)) throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım cursor değeri geçersiz.');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200)) throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım limit değeri geçersiz.');return execute(rawScope,SERVICE_USAGES_OPERATION,{from,to,family,chargeStatus,cursor,limit});
    },
    async getServiceUsageDetail(rawScope,sourceEventId){return execute(rawScope,'getServiceUsageDetail',{},{sourceEventId:requiredUuid(sourceEventId,'sourceEventId','VALIDATION_ERROR')});},
    async exportServiceUsages(rawScope,{from,to,family,chargeStatus,limit=10000}={}){for(const [field,value]of[['from',from],['to',to]])if(value!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new FinanceBridgeError('VALIDATION_ERROR',`${field} YYYY-MM-DD biçiminde olmalıdır.`);if(from&&to&&from>to)throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım export tarih aralığı geçersiz.');if(family!==undefined&&!['QUERY','EXTERNAL_SERVICE'].includes(family))throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım export ailesi geçersiz.');if(chargeStatus!==undefined&&!['CHARGED','NOT_CHARGED','FAILED'].includes(chargeStatus))throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım export ücret durumu geçersiz.');if(!Number.isInteger(limit)||limit<1||limit>10000)throw new FinanceBridgeError('VALIDATION_ERROR','Kullanım export limiti geçersiz.');return execute(rawScope,'exportServiceUsages',{from,to,family,chargeStatus,limit});},
    async getCurrentFinancePeriod(rawScope,{asOf}={}) {
      if (typeof asOf!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new FinanceBridgeError('VALIDATION_ERROR','asOf YYYY-MM-DD biçiminde zorunludur.');
      return execute(rawScope,PERIOD_OPERATION,{asOf},{},true);
    },
    async getFinancePeriodReconciliations(rawScope,periodId){return execute(rawScope,PERIOD_RECONCILIATIONS_OPERATION,{},{periodId:requiredUuid(periodId,'periodId','VALIDATION_ERROR')},true);},
    async getCurrentFranchiseContract(rawScope,{asOf}={}) {
      if(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new FinanceBridgeError('VALIDATION_ERROR','asOf YYYY-MM-DD biçiminde zorunludur.');
      return execute(rawScope,CURRENT_CONTRACT_OPERATION,{asOf},{},true);
    },
    async listContractVersions(rawScope,contractId,{cursor,limit}={}){if(cursor!==undefined)requiredUuid(cursor,'cursor','VALIDATION_ERROR');if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200))throw new FinanceBridgeError('VALIDATION_ERROR','Sürüm limit değeri geçersiz.');return execute(rawScope,CONTRACT_VERSIONS_OPERATION,{cursor,limit},{contractId:requiredUuid(contractId,'contractId','VALIDATION_ERROR')},true);},
    async listContractFeeRules(rawScope,contractVersionId,{status,cursor,limit}={}) {
      const normalizedVersionId=requiredUuid(contractVersionId,'contractVersionId','VALIDATION_ERROR');
      if(status!==undefined&&!['DRAFT','PENDING_APPROVAL','APPROVED','ACTIVE','SUPERSEDED','DISABLED'].includes(status)) throw new FinanceBridgeError('VALIDATION_ERROR','Kural durum filtresi geçersiz.');
      if(cursor!==undefined) requiredUuid(cursor,'cursor','VALIDATION_ERROR');
      if(limit!==undefined&&(!Number.isInteger(limit)||limit<1||limit>200)) throw new FinanceBridgeError('VALIDATION_ERROR','Kural limit değeri 1–200 arasında olmalıdır.');
      return execute(rawScope,CONTRACT_RULES_OPERATION,{status,cursor,limit},{contractVersionId:normalizedVersionId},true);
    },
    async getContractFeeRule(rawScope,contractVersionId,feeRuleId){
      return execute(rawScope,CONTRACT_RULE_OPERATION,{},{contractVersionId:requiredUuid(contractVersionId,'contractVersionId','VALIDATION_ERROR'),feeRuleId:requiredUuid(feeRuleId,'feeRuleId','VALIDATION_ERROR')},true);
    },
    async getContractVersionComparison(rawScope,activeVersionId,candidateVersionId){
      return execute(rawScope,CONTRACT_COMPARISON_OPERATION,{},{activeVersionId:requiredUuid(activeVersionId,'activeVersionId','VALIDATION_ERROR'),candidateVersionId:requiredUuid(candidateVersionId,'candidateVersionId','VALIDATION_ERROR')},true);
    },
    async simulateContractVersionImpact(rawScope,activeVersionId,candidateVersionId,scenario){
      if(!scenario||!Array.isArray(scenario.items)||scenario.items.length<1||scenario.items.length>100)throw new FinanceBridgeError('VALIDATION_ERROR','Etki senaryosu 1–100 kalem içermelidir.');const decimal=/^(0|[1-9]\d*)(?:\.\d{1,8})?$/;const items=scenario.items.map(item=>{if(!item||typeof item!=='object'||!decimal.test(item.basisAmount)||!decimal.test(item.quantity))throw new FinanceBridgeError('VALIDATION_ERROR','Etki senaryosu tutar veya adet değeri geçersiz.');return {feeDefinitionId:requiredUuid(item.feeDefinitionId,'feeDefinitionId','VALIDATION_ERROR'),basisAmount:item.basisAmount,quantity:item.quantity};});return execute(rawScope,CONTRACT_IMPACT_OPERATION,{scenario:{items}},{activeVersionId:requiredUuid(activeVersionId,'activeVersionId','VALIDATION_ERROR'),candidateVersionId:requiredUuid(candidateVersionId,'candidateVersionId','VALIDATION_ERROR')},true);
    }
  });
}

const auth = globalThis.OTOTRDealerFinanceAuth;
const ui = globalThis.OTOTRFinanceUI;
const ruleDetailUi=globalThis.OTOTRFinanceRuleDetailUI;
const comparisonUi=globalThis.OTOTRFinanceComparisonUI;
const timelineUi=globalThis.OTOTRFinanceTimelineUI;
const operationalUi=globalThis.OTOTRFinanceOperationalUI;
if (auth && ui) {
  const client = createFinanceSummaryClient({getConfig: () => auth.getConfig(), getAccessToken: () => auth.getAccessToken()});
  let configuredScope = null;
  let connectedAsOf = null;
  let contractImpactVersionPair = null;
  let currentContractId = null;
  const refreshContext = () => {
    try {
      configuredScope = validateFinanceScope(globalThis.OTOTR_FINANCE_CONTEXT);
      ui.setScopeContext(configuredScope);
      return configuredScope;
    } catch {
      configuredScope = null;
      ui.setScopeContext(null);
      return null;
    }
  };
  async function showRoyaltyBalance(scope) {
    const output = document.querySelector('[data-finance-royalty-balance]');
    if (!output) return;
    output.textContent = 'Güncel royalty bakiyesi yükleniyor.';
    try {
      const {url, publishableKey} = auth.getConfig();
      const token = await auth.getAccessToken();
      if (!token) throw new Error('AUTH_REQUIRED');
      const response = await fetch(new URL('/rest/v1/rpc/get_royalty_open_balance', url), {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Profile': 'finance_api'
        },
        body: JSON.stringify({
          p_legal_entity_id: scope.legalEntityId,
          p_dealer_account_id: scope.dealerAccountId,
          p_branch_id: scope.branchId
        })
      });
      if (!response.ok) throw new Error('ROYALTY_BALANCE_UNAVAILABLE');
      const {currency, openDebitGrossAmount, availableCreditGrossAmount, netGrossAmount} = await response.json();
      const format = new Intl.NumberFormat('tr-TR', {style: 'currency', currency, maximumFractionDigits: 8});
      output.textContent = 'Güncel net royalty ' + format.format(netGrossAmount) +
        ' · Açık borç ' + format.format(openDebitGrossAmount) +
        ' · Kullanılabilir iade kredisi ' + format.format(availableCreditGrossAmount);
    } catch {
      output.textContent = 'Güncel royalty bakiyesi alınamadı.';
    }
  }

  const api = {
    refreshContext,
    async connect(scope, options = {}) {
      void showRoyaltyBalance(scope);
      ui.setConnectionState('LOADING', 'Yetkili finans projectionı yükleniyor.');
      try {
        const result = await client.getDealerFinanceSummary(scope, options);
        connectedAsOf=result.data.asOf;
        ui.renderSummary(result.data, result.scope);

        for(const control of document.querySelectorAll('[data-finance-dealer-export],[data-finance-dealer-dispute]')){control.disabled=false;control.dataset.asOf=result.data.asOf;}
        const periodResult=await client.getCurrentFinancePeriod(scope,{asOf:result.data.asOf});
        ui.renderCurrentPeriod?.(periodResult.data);
        try {
          const headquartersResult=await client.getHeadquartersFinanceSummary(scope,{asOf:result.data.asOf,currency:result.data.currencyCode||'TRY'});
          ui.renderHeadquartersSummary?.(headquartersResult.data);
          const healthResult=await client.getFinanceOperationalHealth(scope);
          operationalUi?.renderOperationalHealth(healthResult.data);
        } catch(error) {
          if(error instanceof FinanceBridgeError&&error.code==='SCOPE_DENIED') ui.resetHeadquartersSummary?.('Bu kullanıcı için genel merkez finans kapsamı tanımlı değil.');
          else throw error;
        }
        return result;
      } catch (error) {
        for(const control of document.querySelectorAll('[data-finance-dealer-export],[data-finance-dealer-dispute]'))control.disabled=true;
        ui.setConnectionState('ERROR', error instanceof FinanceBridgeError ? error.message : 'Finans servisine ulaşılamadı.');
        throw error;
      }
    },
    async connectConfiguredScope(options = {}) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return api.connect(scope, options);
    },
    async getDealerStatement(options = {}) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.getDealerStatement(scope, options);
    },
    async getDealerStatementControl(options = {}) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.getDealerStatementControl(scope, options);
    },
    async requestDealerStatementExport(options={}) {const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return options.mode==='ACCRUALS'?client.exportAccruals(scope,options):client.exportDealerStatement(scope,options);},
    async getHeadquartersFinanceSummary(options={}) {
      const scope=configuredScope||refreshContext();
      if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');
      return client.getHeadquartersFinanceSummary(scope,{asOf:options.asOf||connectedAsOf,currency:options.currency||'TRY'});
    },
    async exportDealerFinanceSummary(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.exportDealerFinanceSummary(scope,{asOf:options.asOf||connectedAsOf});},
    async exportHeadquartersFinanceSummary(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.exportHeadquartersFinanceSummary(scope,{asOf:options.asOf||connectedAsOf,currency:options.currency||'TRY'});},
    async getFinanceOperationalHealth(){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getFinanceOperationalHealth(scope);},
    async listPassThroughExpenses(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listPassThroughExpenses(scope,options);},
    async getPassThroughExpense(expenseId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getPassThroughExpense(scope,expenseId);},
    async listFinanceExportPackages(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listFinanceExportPackages(scope,options);},
    async getFinanceExportPackage(packageType,packageId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getFinanceExportPackage(scope,packageType,packageId);},
    async listIntegrationErrors(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listIntegrationErrors(scope,options);},
    async getIntegrationError(errorId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getIntegrationError(scope,errorId);},
    async listApprovalWorkItems(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listApprovalWorkItems(scope,options);},
    async getApprovalWorkItem(requestId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getApprovalWorkItem(scope,requestId);},
    async listAuditEvents(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listAuditEvents(scope,options);},
    async requestAuditExport(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.exportAuditEvents(scope,options);},
    async getAuditCorrelationTrace(correlationId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getAuditCorrelationTrace(scope,correlationId);},
    async listDisputes(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listDisputes(scope,options);},
    async getDispute(disputeId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getDispute(scope,disputeId);},
    async getPayment(paymentId) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.getPayment(scope, paymentId);
    },
    async listPayments(options = {}) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.listPayments(scope, options);
    },
    async getAccrualDetail(accrualId) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.getAccrualDetail(scope, accrualId);
    },
    async getRoyaltyRefundTrace(reversalAccrualId) {
      const scope = configuredScope || refreshContext();
      if (!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE', 'ERP finans kapsamı henüz sağlanmadı.');
      return client.getRoyaltyRefundTrace(scope, reversalAccrualId);
    },
    async listRoyaltyRefunds(options={}) {
      const scope=configuredScope||refreshContext();
      if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');
      return client.listRoyaltyRefunds(scope,options);
    },
    async listServiceUsages(options={}) {const scope=configuredScope||refreshContext();if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listServiceUsages(scope,options);},
    async getServiceUsageDetail(sourceEventId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getServiceUsageDetail(scope,sourceEventId);},
    async exportServiceUsages(options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.exportServiceUsages(scope,options);},
    async getCurrentFinancePeriod(options={}) {
      const scope=configuredScope||refreshContext();
      if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');
      return client.getCurrentFinancePeriod(scope,options);
    },
    async getFinancePeriodReconciliations(periodId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getFinancePeriodReconciliations(scope,periodId);},
    async getCurrentFranchiseContract(options={}) {
      const scope=configuredScope||refreshContext();
      if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');
      return client.getCurrentFranchiseContract(scope,{asOf:options.asOf||connectedAsOf});
    },
    async listContractVersions(contractId,options={}){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.listContractVersions(scope,contractId,options);},
    async loadContractTimeline(contractId,{append=false}={}){timelineUi?.setContractTimelineState?.('LOADING',append?'Sürüm devam sayfası yükleniyor…':'Sözleşme sürümleri yükleniyor…');try{const cursor=append?timelineUi.contractTimelineMore?.dataset?.cursor:undefined;const result=await api.listContractVersions(contractId,{cursor,limit:25});timelineUi?.renderContractTimelinePage?.(result.data,{append});return result;}catch(error){timelineUi?.setContractTimelineState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Sürüm zaman çizgisi alınamadı.');throw error;}},
    async listContractFeeRules(contractVersionId,options={}) {
      const scope=configuredScope||refreshContext();
      if(!scope) throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');
      return client.listContractFeeRules(scope,contractVersionId,options);
    },
    async getContractFeeRule(contractVersionId,feeRuleId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getContractFeeRule(scope,contractVersionId,feeRuleId);},
    async getContractVersionComparison(activeVersionId,candidateVersionId){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.getContractVersionComparison(scope,activeVersionId,candidateVersionId);},
    async simulateContractVersionImpact(activeVersionId,candidateVersionId,scenario){const scope=configuredScope||refreshContext();if(!scope)throw new FinanceBridgeError('FINANCE_SCOPE_UNAVAILABLE','ERP finans kapsamı henüz sağlanmadı.');return client.simulateContractVersionImpact(scope,activeVersionId,candidateVersionId,scenario);},
    async loadContractFeeRule(contractVersionId,feeRuleId){ruleDetailUi?.setContractRuleDetailState?.('LOADING');try{const result=await api.getContractFeeRule(contractVersionId,feeRuleId);const detail=result.data?{...result.data,feeCode:result.data.code,ruleCode:result.data.code,triggerEventType:result.data.trigger?.eventType,calculation:result.data.calculation?{...result.data.calculation,priceIncludesTax:result.data.tax?.priceIncludesTax}:null}:null;ruleDetailUi?.renderContractRuleDetail?.(detail);globalThis.dispatchEvent?.(new CustomEvent('ototr:finance-contract-rule-loaded',{detail:result.data}));return result;}catch(error){ruleDetailUi?.setContractRuleDetailState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Kural detayı alınamadı.');throw error;}},
    async loadContractWorkspace({append=false}={}) {
      try {
        if(!append){
          ui.setContractState?.('LOADING','Aktif sözleşme ve sürüm bilgisi yükleniyor…');
          const contractResult=await api.getCurrentFranchiseContract();
          ui.renderCurrentContract?.(contractResult.data);
          globalThis.dispatchEvent?.(new CustomEvent('ototr:finance-current-contract-loaded',{detail:contractResult.data}));
          currentContractId=contractResult.data?.contractId||null;if(currentContractId)await api.loadContractTimeline(currentContractId);else timelineUi?.resetContractTimeline?.('Sözleşme bulunamadı.');
          const activeVersionId=contractResult.data?.activeVersion?.versionId;const candidateVersionId=contractResult.data?.pendingVersion?.versionId;
          if(activeVersionId&&candidateVersionId){contractImpactVersionPair=Object.freeze({activeVersionId,candidateVersionId});comparisonUi?.setContractComparisonState?.('LOADING');const comparisonResult=await api.getContractVersionComparison(activeVersionId,candidateVersionId);comparisonUi?.renderContractVersionComparison?.(comparisonResult.data);}else{contractImpactVersionPair=null;comparisonUi?.resetContractComparison?.('Karşılaştırma için aktif ve bekleyen sürüm birlikte gereklidir.');}
          const versionId=contractResult.data?.pendingVersion?.versionId || contractResult.data?.activeVersion?.versionId;
          if(!versionId) return contractResult;
          ui.setContractRulesVersion?.(versionId);
        }
        const versionId=ui.getContractRulesVersion?.();
        if(!versionId) return null;
        const cursor=append?ui.contractMoreButton?.dataset?.cursor:undefined;
        const filters=ui.getContractRuleFilters?.()||{};
        ui.setContractRulesState?.('LOADING',append?'Kural devam sayfası yükleniyor…':'Sözleşme kuralları yükleniyor…');
        const rulesResult=await api.listContractFeeRules(versionId,{...filters,cursor});
        ui.renderContractRulesPage?.(rulesResult.data,{append});
        return rulesResult;
      } catch(error){
        if(!append) ui.setContractState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Sözleşme bilgisi alınamadı.');
        ui.setContractRulesState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Kural listesi alınamadı.');
        throw error;
      }
    },
    async loadRoyaltyRefundTrace(reversalAccrualId) {
      ui.setRefundState?.('LOADING','Orijinal tahsilat, royalty ve dönem provenance yükleniyor…');
      try { const result=await api.getRoyaltyRefundTrace(reversalAccrualId); ui.renderRefundTrace?.(result.data); return result; }
      catch(error){ ui.setRefundState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Royalty iade izi alınamadı.'); throw error; }
    },
    async loadRoyaltyRefunds({append=false}={}) {
      const cursor=append?ui.refundsMoreButton?.dataset?.cursor:undefined;
      ui.setRefundsState?.('LOADING',append?'İade devam sayfası yükleniyor…':'Yetkili iade listesi yükleniyor…');
      try { const result=await api.listRoyaltyRefunds({...ui.getRefundFilters?.(),cursor}); ui.renderRefundsPage?.(result.data,{append}); return result; }
      catch(error){ ui.setRefundsState?.('ERROR',error instanceof FinanceBridgeError?error.message:'İade listesi alınamadı.'); throw error; }
    },
    async loadServiceUsages({append=false}={}) {const cursor=append?ui.serviceUsagesMoreButton?.dataset?.cursor:undefined;ui.setServiceUsagesState?.('LOADING',append?'Kullanım devam sayfası yükleniyor…':'Yetkili kullanım listesi yükleniyor…');try{const result=await api.listServiceUsages({...ui.getServiceUsageFilters?.(),cursor});ui.renderServiceUsagesPage?.(result.data,{append});globalThis.dispatchEvent?.(new CustomEvent('ototr:finance-service-usages-rendered',{detail:{...result.data,append}}));return result;}catch(error){ui.setServiceUsagesState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Kullanım listesi alınamadı.');throw error;}},
    async loadExpenses({append=false}={}){const cursor=append?ui.expensesMoreButton?.dataset?.cursor:undefined;ui.setExpensesState?.('LOADING',append?'Masraf devam sayfası yükleniyor…':'Genel merkez masraf listesi yükleniyor…');try{const result=await api.listPassThroughExpenses({...ui.getExpenseFilters?.(),cursor});ui.renderExpensesPage?.(result.data,{append});return result;}catch(error){ui.setExpensesState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Masraf listesi alınamadı.');throw error;}},
    async loadExpenseDetail(expenseId){ui.setExpenseState?.('LOADING','Paylar, belgeler ve onay izi yükleniyor…');try{const result=await api.getPassThroughExpense(expenseId);ui.renderExpenseDetail?.(result.data);globalThis.dispatchEvent(new CustomEvent('ototr:finance-expense-rendered',{detail:result.data}));return result;}catch(error){ui.setExpenseState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Masraf detayı alınamadı.');throw error;}},
    async loadDisputes({append=false}={}){const cursor=append?ui.disputesMoreButton?.dataset?.cursor:undefined;ui.setDisputesState?.('LOADING',append?'İtiraz devam sayfası yükleniyor…':'Yetkili itiraz kuyruğu yükleniyor…');try{const result=await api.listDisputes({...ui.getDisputeFilters?.(),cursor});ui.renderDisputesPage?.(result.data,{append});return result;}catch(error){ui.setDisputesState?.('ERROR',error instanceof FinanceBridgeError?error.message:'İtiraz listesi alınamadı.');throw error;}},
    async loadDisputeDetail(disputeId){ui.setDisputeState?.('LOADING','Kanıt, onay ve düzeltme izi yükleniyor…');try{const result=await api.getDispute(disputeId);ui.renderDisputeDetail?.(result.data);return result;}catch(error){ui.setDisputeState?.('ERROR',error instanceof FinanceBridgeError?error.message:'İtiraz detayı alınamadı.');throw error;}},
    async loadExportPackages({append=false}={}){const cursor=append?ui.exportPackagesMoreButton?.dataset?.cursor:undefined;ui.setExportPackagesState?.('LOADING',append?'Paket devam sayfası yükleniyor…':'Fatura ve muhasebe paketleri yükleniyor…');try{const result=await api.listFinanceExportPackages({...ui.getExportPackageFilters?.(),cursor});ui.renderExportPackagesPage?.(result.data,{append});return result;}catch(error){ui.setExportPackagesState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Export paketleri alınamadı.');throw error;}},
    async loadExportPackageDetail(packageType,packageId){ui.setExportPackageState?.('LOADING','Kontrol toplamları ve harici durum yükleniyor…');try{const result=await api.getFinanceExportPackage(packageType,packageId);ui.renderExportPackageDetail?.(result.data);globalThis.dispatchEvent?.(new CustomEvent('ototr:finance-export-package-rendered',{detail:result.data}));return result;}catch(error){ui.setExportPackageState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Export paketi detayı alınamadı.');throw error;}},
    async loadIntegrationErrors({append=false}={}){const cursor=append?ui.integrationErrorsMoreButton?.dataset?.cursor:undefined;ui.setIntegrationErrorsState?.('LOADING',append?'Hata devam sayfası yükleniyor…':'Şube kapsamlı entegrasyon kuyruğu yükleniyor…');try{const result=await api.listIntegrationErrors({...ui.getIntegrationErrorFilters?.(),cursor});ui.renderIntegrationErrorsPage?.(result.data,{append});return result;}catch(error){ui.setIntegrationErrorsState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Entegrasyon hata kuyruğu alınamadı.');throw error;}},
    async loadIntegrationErrorDetail(errorId){ui.setIntegrationErrorState?.('LOADING','Güvenli detay ve korelasyon izi yükleniyor…');try{const result=await api.getIntegrationError(errorId);ui.renderIntegrationErrorDetail?.(result.data);return result;}catch(error){ui.setIntegrationErrorState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Entegrasyon hata detayı alınamadı.');throw error;}},
    async loadApprovalWorkItems({append=false}={}){const cursor=append?ui.approvalsMoreButton?.dataset?.cursor:undefined;ui.setApprovalsState?.('LOADING',append?'Onay devam sayfası yükleniyor…':'Onay iş listesi yükleniyor…');try{const result=await api.listApprovalWorkItems({...ui.getApprovalFilters?.(),cursor});ui.renderApprovalsPage?.(result.data,{append});return result;}catch(error){ui.setApprovalsState?.('ERROR',error instanceof FinanceBridgeError?error.message:(error?.message||'Onay iş listesi alınamadı.'));throw error;}},
    async loadApprovalWorkItem(requestId){ui.setApprovalState?.('LOADING','Güvenli karar adımları yükleniyor…');try{const result=await api.getApprovalWorkItem(requestId);ui.renderApprovalDetail?.(result.data);return result;}catch(error){ui.setApprovalState?.('ERROR',error instanceof FinanceBridgeError?error.message:(error?.message||'Onay detayı alınamadı.'));throw error;}},
    async loadAuditEvents({append=false}={}){const cursor=append?ui.auditMoreButton?.dataset?.cursor:undefined;ui.setAuditState?.('LOADING',append?'Audit devam sayfası yükleniyor…':'Audit kayıtları yükleniyor…');try{const {from:unusedFrom,to:unusedTo,...filters}=ui.getAuditFilters?.()||{};const result=await api.listAuditEvents({...filters,cursor});ui.renderAuditPage?.(result.data,{append});return result;}catch(error){ui.setAuditState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Audit kayıtları alınamadı.');throw error;}},
    async exportAuditEvents(){ui.setAuditState?.('LOADING','Yetkili audit dışa aktarımı hazırlanıyor…');try{const result=await api.requestAuditExport({...ui.getAuditFilters?.(),limit:10000});ui.downloadAuditExport?.(result.data);ui.setAuditState?.('READY',`${result.data.rowCount} audit kaydı güvenli CSV olarak hazırlandı.`);return result;}catch(error){ui.setAuditState?.('ERROR',error instanceof FinanceBridgeError?error.message:(error?.message||'Audit dışa aktarımı hazırlanamadı.'));throw error;}},
    async loadAuditCorrelationTrace(correlationId){ui.setAuditTraceState?.('LOADING','Correlation ve bütünlük izi yükleniyor…');try{const result=await api.getAuditCorrelationTrace(correlationId);ui.renderAuditTrace?.(result.data);return result;}catch(error){ui.setAuditTraceState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Audit correlation izi alınamadı.');throw error;}},
    async loadAccrualDetail(accrualId) {
      ui.setAccrualState?.('LOADING', 'Kaynak olay, hesaplama ve çift taraflı fiş yükleniyor…');
      try {
        const result = await api.getAccrualDetail(accrualId);
        ui.renderAccrualDetail?.(result.data);
        return result;
      } catch (error) {
        ui.setAccrualState?.('ERROR', error instanceof FinanceBridgeError ? error.message : 'Tahakkuk servisine ulaşılamadı.');
        throw error;
      }
    },
    async loadPayment(paymentId) {
      ui.setPaymentState?.('LOADING', 'Yetkili ödeme ve tahsis detayı yükleniyor…');
      try {
        const result = await api.getPayment(paymentId);
        ui.renderPaymentDetail?.(result.data);
        return result;
      } catch (error) {
        ui.setPaymentState?.('ERROR', error instanceof FinanceBridgeError ? error.message : 'Ödeme servisine ulaşılamadı.');
        throw error;
      }
    },
    async loadPayments({append = false} = {}) {
      const cursor = append ? ui.paymentsMoreButton?.dataset?.cursor : undefined;
      const filters = ui.getPaymentFilters?.() || {};
      ui.setPaymentsState?.('LOADING', append ? 'Ödeme devam sayfası yükleniyor…' : 'Yetkili ödeme listesi yükleniyor…');
      try {
        const result = await api.listPayments({...filters, cursor});
        ui.renderPaymentsPage?.(result.data, {append});
        return result;
      } catch (error) {
        ui.setPaymentsState?.('ERROR', error instanceof FinanceBridgeError ? error.message : 'Ödeme listesi alınamadı.');
        throw error;
      }
    },
    async loadDealerStatement({append = false} = {}) {
      const cursor = append ? ui.statementMoreButton?.dataset?.cursor : undefined;
      const filters = ui.getStatementFilters?.() || {};
      ui.setStatementState?.('LOADING', append ? 'Ekstre devam sayfası yükleniyor…' : 'Yetkili ekstre yükleniyor…');
      try {
        const result = filters.mode==='ACCRUALS'?await client.listAccruals(configuredScope||refreshContext(),{...filters,cursor}):await api.getDealerStatement({...filters,cursor});
        const control = !append&&filters.mode!=='ACCRUALS'?await api.getDealerStatementControl(filters):null;
        ui.renderStatementPage?.(result.data, {append});
        if (control) ui.renderStatementControl?.(control.data);
        return result;
      } catch (error) {
        ui.setStatementState?.('ERROR', error instanceof FinanceBridgeError ? error.message : 'Ekstre servisine ulaşılamadı.');
        throw error;
      }
    },
    async exportDealerStatement(){ui.setStatementState?.('LOADING','Yetkili ekstre dışa aktarımı hazırlanıyor…');try{const result=await api.requestDealerStatementExport({...ui.getStatementFilters?.(),limit:10000});ui.downloadStatementExport?.(result.data);ui.setStatementState?.('READY',`${result.data.rowCount} ekstre kaydı CSV olarak hazırlandı.`);return result;}catch(error){ui.setStatementState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Ekstre dışa aktarımı hazırlanamadı.');throw error;}},
    async exportDealerStatementPdf(){ui.setStatementState?.('LOADING','Yetkili PDF ekstre hazırlanıyor…');try{const result=await api.requestDealerStatementExport({...ui.getStatementFilters?.(),limit:10000});ui.downloadStatementPdf?.(result.data);ui.setStatementState?.('READY',`${result.data.rowCount} kayıtlı PDF ekstre hazırlandı.`);return result;}catch(error){ui.setStatementState?.('ERROR',error instanceof FinanceBridgeError?error.message:'PDF ekstre hazırlanamadı.');throw error;}},
  };
  globalThis.OTOTRFinance = Object.freeze(api);
  refreshContext();
  ui.connectButton?.addEventListener('click', () => { void api.connectConfiguredScope().catch(() => {}); });
  ui.statementRefreshButton?.addEventListener('click', () => { void api.loadDealerStatement().catch(() => {}); });
  ui.statementMoreButton?.addEventListener('click', () => { void api.loadDealerStatement({append:true}).catch(() => {}); });
  ui.statementExportButton?.addEventListener('click',()=>{void api.exportDealerStatement().catch(()=>{});});
  ui.statementPdfButton?.addEventListener('click',()=>{void api.exportDealerStatementPdf().catch(()=>{});});
  ui.statementStatus?.addEventListener('change', () => { ui.resetStatement?.('Filtre değişti. Güncel ekstreyi getirin.'); });
  ui.accrualFamily?.addEventListener('change',()=>{ui.resetStatement?.('Bedel ailesi değişti. Tahakkukları yeniden getirin.');});
  ui.accrualPeriodStatus?.addEventListener('change',()=>{ui.resetStatement?.('Dönem durumu değişti. Tahakkukları yeniden getirin.');});
  ui.paymentsRefreshButton?.addEventListener('click', () => { void api.loadPayments().catch(() => {}); });
  ui.paymentsMoreButton?.addEventListener('click', () => { void api.loadPayments({append:true}).catch(() => {}); });
  ui.paymentsStatus?.addEventListener('change', () => { ui.resetPayments?.('Filtre değişti. Güncel ödemeleri getirin.'); });
  ui.refundsRefreshButton?.addEventListener('click',()=>{void api.loadRoyaltyRefunds().catch(()=>{});});
  ui.refundsMoreButton?.addEventListener('click',()=>{void api.loadRoyaltyRefunds({append:true}).catch(()=>{});});
  ui.serviceUsagesRefreshButton?.addEventListener('click',()=>{void api.loadServiceUsages().catch(()=>{});});
  ui.serviceUsagesMoreButton?.addEventListener('click',()=>{void api.loadServiceUsages({append:true}).catch(()=>{});});
  ui.serviceUsagesFamily?.addEventListener('change',()=>{ui.resetServiceUsages?.('Filtre değişti. Kullanımları yeniden getirin.');});
  ui.serviceUsagesChargeStatus?.addEventListener('change',()=>{ui.resetServiceUsages?.('Filtre değişti. Kullanımları yeniden getirin.');});
  ui.expensesRefreshButton?.addEventListener('click',()=>{void api.loadExpenses().catch(()=>{});});
  ui.expensesMoreButton?.addEventListener('click',()=>{void api.loadExpenses({append:true}).catch(()=>{});});
  ui.expensesStatus?.addEventListener('change',()=>{ui.resetExpenses?.('Filtre değişti. Masrafları yeniden getirin.');});
  ui.disputesRefreshButton?.addEventListener('click',()=>{void api.loadDisputes().catch(()=>{});});
  ui.disputesMoreButton?.addEventListener('click',()=>{void api.loadDisputes({append:true}).catch(()=>{});});
  ui.disputesStatus?.addEventListener('change',()=>{ui.resetDisputes?.('Filtre değişti. İtirazları yeniden getirin.');});
  ui.exportPackagesRefreshButton?.addEventListener('click',()=>{void api.loadExportPackages().catch(()=>{});});
  ui.exportPackagesMoreButton?.addEventListener('click',()=>{void api.loadExportPackages({append:true}).catch(()=>{});});
  ui.exportPackagesType?.addEventListener('change',()=>{ui.resetExportPackages?.('Filtre değişti. Paketleri yeniden getirin.');});
  ui.exportPackagesStatus?.addEventListener('change',()=>{ui.resetExportPackages?.('Filtre değişti. Paketleri yeniden getirin.');});
  ui.integrationErrorsRefreshButton?.addEventListener('click',()=>{void api.loadIntegrationErrors().catch(()=>{});});
  ui.integrationErrorsMoreButton?.addEventListener('click',()=>{void api.loadIntegrationErrors({append:true}).catch(()=>{});});
  ui.integrationErrorsStatus?.addEventListener('change',()=>{ui.resetIntegrationErrors?.('Filtre değişti. Hata kuyruğunu yeniden getirin.');});
  ui.integrationErrorsSource?.addEventListener('change',()=>{ui.resetIntegrationErrors?.('Filtre değişti. Hata kuyruğunu yeniden getirin.');});
  ui.approvalsRefreshButton?.addEventListener('click',()=>{void api.loadApprovalWorkItems().catch(()=>{});});
  ui.approvalsMoreButton?.addEventListener('click',()=>{void api.loadApprovalWorkItems({append:true}).catch(()=>{});});
  ui.approvalsStatus?.addEventListener('change',()=>{ui.resetApprovals?.('Filtre değişti. Onayları yeniden getirin.');});
  ui.auditRefreshButton?.addEventListener('click',()=>{void api.loadAuditEvents().catch(()=>{});});
  ui.auditMoreButton?.addEventListener('click',()=>{void api.loadAuditEvents({append:true}).catch(()=>{});});
  ui.auditExportButton?.addEventListener('click',()=>{void api.exportAuditEvents().catch(()=>{});});
  ui.contractRefreshButton?.addEventListener('click',()=>{void api.loadContractWorkspace().catch(()=>{});});
  ui.contractMoreButton?.addEventListener('click',()=>{void api.loadContractWorkspace({append:true}).catch(()=>{});});
  ui.contractRuleStatus?.addEventListener('change',()=>{ui.resetContractRules?.('Filtre değişti. Kuralları yeniden getirin.');});
  globalThis.addEventListener?.('ototr:finance-payment-requested', event => { void api.loadPayment(event.detail?.paymentId).catch(() => {}); });
  globalThis.addEventListener?.('ototr:finance-accrual-requested', event => { void api.loadAccrualDetail(event.detail?.accrualId).catch(() => {}); });
  globalThis.addEventListener?.('ototr:finance-refund-requested',event=>{void api.loadRoyaltyRefundTrace(event.detail?.reversalAccrualId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-expense-requested',event=>{void api.loadExpenseDetail(event.detail?.expenseId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-dispute-requested',event=>{void api.loadDisputeDetail(event.detail?.disputeId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-export-package-requested',event=>{void api.loadExportPackageDetail(event.detail?.packageType,event.detail?.packageId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-export-packages-refresh-requested',()=>{void api.loadExportPackages().catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-integration-error-requested',event=>{void api.loadIntegrationErrorDetail(event.detail?.errorId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-approval-requested',event=>{void api.loadApprovalWorkItem(event.detail?.requestId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-contract-workspace-requested',()=>{void api.loadContractWorkspace().catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-audit-trace-requested',event=>{void api.loadAuditCorrelationTrace(event.detail?.correlationId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-contract-rule-requested',event=>{void api.loadContractFeeRule(event.detail?.contractVersionId,event.detail?.feeRuleId).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-contract-lifecycle-completed',()=>{void api.loadContractWorkspace().catch(()=>{});void api.loadApprovalWorkItems().catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-period-refresh-requested',()=>{void api.getCurrentFinancePeriod({asOf:connectedAsOf}).then(result=>ui.renderCurrentPeriod?.(result.data)).catch(()=>{});});
  globalThis.addEventListener?.('ototr:finance-period-rendered',event=>{const periodId=event.detail?.periodId;if(periodId)void api.getFinancePeriodReconciliations(periodId).then(result=>globalThis.dispatchEvent(new CustomEvent('ototr:finance-period-reconciliations-rendered',{detail:result.data}))).catch(error=>globalThis.dispatchEvent(new CustomEvent('ototr:finance-period-reconciliations-error',{detail:{message:error instanceof FinanceBridgeError?error.message:'Mutabakat satırları alınamadı.'}})));});
  globalThis.addEventListener?.('ototr:finance-approvals-refresh-requested',()=>{void api.loadApprovalWorkItems().catch(()=>{});});
  comparisonUi?.contractImpactForm?.addEventListener('submit',event=>{event.preventDefault();if(!contractImpactVersionPair)return;comparisonUi.setContractImpactState?.('LOADING');void api.simulateContractVersionImpact(contractImpactVersionPair.activeVersionId,contractImpactVersionPair.candidateVersionId,comparisonUi.getContractImpactScenario?.()).then(result=>comparisonUi.renderContractImpactSimulation?.(result.data)).catch(error=>comparisonUi.setContractImpactState?.('ERROR',error instanceof FinanceBridgeError?error.message:'Parasal etki simülasyonu tamamlanamadı.'));});
  timelineUi?.contractTimelineMore?.addEventListener('click',()=>{if(currentContractId)void api.loadContractTimeline(currentContractId,{append:true}).catch(()=>{});});
}
