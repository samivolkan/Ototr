(() => {
  'use strict';

  const screens = [
    ['SCR-01','Genel Merkez Finans Özeti',['Dönem filtresi','Tahakkuk / fatura / tahsilat / açık bakiye','Bedel ailesi kırılımı','Bayi sıralaması','İstisna ve onaylar','Veri tazeliği'],['Bayi detayını aç','İstisna kuyruğunu aç','Yetkili özeti dışa aktar']],
    ['SCR-02','Bayi Finans Özeti',['Kapsam ve sözleşme','Operasyon geliri','Bedel kırılımı','Ödenen / açık / geciken','Operasyonel katkı','Şube kırılımı'],['Ekstreyi aç','Açık kalemleri aç','İtiraz başlat','Ekstre indir']],
    ['SCR-03','Sözleşme ve Kural Sürümleri',['Sözleşme listesi','Sürüm zaman çizgisi','Kural aileleri','Geçerlilik','Onay kanıtı','Etki önizleme'],['Taslak oluştur','Onaya gönder','Onayla / reddet','Sürüm karşılaştır']],
    ['SCR-04','Bedel Kataloğu ve Kural Simülasyonu',['Bedel ailesi','Kapsam ve tetikleyici','Matrah ve hesaplama','Vergi ve vade','İptal / iade','Muhasebe eşlemesi'],['Taslağı düzenle','Sentetik simülasyon','Onaya gönder','Yayınla']],
    ['SCR-05','Tahakkuklar',['Filtreler','Kaynak olay','Bedel ailesi','Net / KDV / brüt','Fatura ve açık kalem durumu','Dönem ve istisna'],['Detayı aç','Ters kayıt talep et','İtiraz başlat','Yetkili seçimi dışa aktar']],
    ['SCR-06','Tahakkuk ve Hesaplama İzi',['Kaynak olay','Sözleşme ve kural sürümü','Matrah bileşenleri','Hesaplama adımları','Defter ve açık kalem','Ters kayıt zinciri'],['Açıklamayı indir','Kaynağı aç','Sözleşme sürümünü aç','İtiraz başlat']],
    ['SCR-07','Bayi Ekstresi ve Açık Kalemler',['Açılış bakiyesi','Hareket ve yürüyen bakiye','Açık kalemler','Yaşlandırma','Ödeme ve tahsisler','Kapanış bakiyesi'],['Filtrele','CSV indir','Ekstre indir','İtiraz başlat']],
    ['SCR-08','Ödeme ve Tahsis',['Ödeme listesi','Doğrulama kanıtı','Dağıtılmamış bakiye','Aday açık kalemler','Tahsis geçmişi','Ters kayıt zinciri'],['Ödeme kaydet','Doğrula','Tahsis et','Tahsis geri al']],
    ['SCR-09','Sorgu ve Harici Hizmet Kullanımları',['Kullanım durumu','Sağlayıcı maliyeti','Bayi fiyatı','Ücretsiz hak','Teknik tekrar','Marj ve tahakkuk bağlantısı'],['Kullanımı aç','Tahakkuku aç','İstisna oluştur','Yetkili seçimi dışa aktar']],
    ['SCR-10','Masraf Yansıtma ve Paylaştırma',['Kaynak belge','Sözleşmesel dayanak','Dağıtım yöntemi','Bayi payları','Yuvarlama farkı','Onay ve tahakkuk'],['Taslak oluştur','Belge ekle','Önizleme hesapla','Onayla ve kaydet','Ters kayıt']],
    ['SCR-11','İtiraz Yönetimi',['Bağlı finans satırı','İtiraz tutarı','Gerekçe ve kanıt','SLA','Sahiplik','Karar ve finansal sonuç'],['Gönder','Kanıt iste','Ata','Kabul / kısmi kabul / ret']],
    ['SCR-12','Dönem, Mutabakat ve Kilit',['Dönem durumu','Kaynak dondurma','Kapanış ön kontrolleri','Bayi mutabakatı','İstisnalar','Onay ve yeniden açma'],['Ön kontrol çalıştır','Mutabakat gönder','Kilitle','Yeniden açma talep et']],
    ['SCR-13','Faturalama ve Muhasebe Export Paketleri',['Uygun tahakkuklar','Paket kontrol toplamları','Eşleme sürümü','Export durumu','Harici fatura geri bildirimi','Mutabakat farkı'],['Paket oluştur','Doğrula','Export et','Idempotent tekrar','Geri bildirim kaydet']],
    ['SCR-14','Entegrasyon İzleme ve Hata Kuyruğu',['Inbox / outbox','Gecikme','Retry','Dead-letter','Şema sürümü','Correlation izi'],['Maskeli payload incele','Tekrar dene','Çöz','Ata','Maskeli tanı indir']],
    ['SCR-15','Bekleyen Onaylar',['Risk seviyesi','Tutar','Talep sahibi','Kapsam','Kanıt','Politika sürümü','Karar geçmişi'],['Onayla','Reddet','Kanıt iste','Kaynak kaydı aç']],
    ['SCR-16','Audit ve Değişiklik İzi',['Aktör','Aksiyon','Varlık','Zaman','Gerekçe','Correlation','Bütünlük zinciri'],['Filtrele','Correlation izini aç','Yetkili seçimi dışa aktar']],
    ['SCR-17','Müşteri İadeleri ve Royalty Ters Kayıtları',['İade olayı','Orijinal tahsilat','Orijinal royalty tahakkuku','İade edilen KDV dahil matrah','Ters hesaplama','Dönem provenance'],['Orijinal tahsilatı aç','Orijinal tahakkuku aç','Ters kaydı aç','İtiraz başlat']]
  ];

  const root = document.getElementById('financePage');
  if (!root) return;
  const nav = root.querySelector('[data-finance-screen-nav]');
  const code = root.querySelector('[data-finance-screen-code]');
  const title = root.querySelector('[data-finance-screen-title]');
  const description = root.querySelector('[data-finance-screen-description]');
  const sections = root.querySelector('[data-finance-sections]');
  const actions = root.querySelector('[data-finance-actions]');
  const state = root.querySelector('[data-finance-state]');
  const environment = root.querySelector('[data-finance-environment]');
  const contextFields = {
    legalEntityId: root.querySelector('[data-finance-legal-entity]'),
    dealerAccountId: root.querySelector('[data-finance-dealer]'),
    branchId: root.querySelector('[data-finance-branch]'),
  };
  const freshness = root.querySelector('[data-finance-freshness]');
  const period = root.querySelector('[data-finance-period]');
  const kpis = Object.fromEntries([...root.querySelectorAll('[data-finance-kpi]')].map(node => [node.dataset.financeKpi, node]));
  const overdue = root.querySelector('[data-finance-overdue]');
  const connectButton = root.querySelector('[data-finance-connect]');
  const contextStatus = root.querySelector('[data-finance-context-status]');
  const statement = root.querySelector('[data-finance-statement]');
  const statementFrom = root.querySelector('[data-finance-statement-from]');
  const statementTo = root.querySelector('[data-finance-statement-to]');
  const statementStatus = root.querySelector('[data-finance-statement-status]');
  const statementCurrency = root.querySelector('[data-finance-statement-currency]');
  const statementControl = root.querySelector('[data-finance-statement-control]');
  const statementAging = root.querySelector('[data-finance-statement-aging]');
  const accrualFilters=[...root.querySelectorAll('[data-finance-accrual-filter]')];
  const accrualFamily=root.querySelector('[data-finance-accrual-family]');
  const accrualPeriodStatus=root.querySelector('[data-finance-accrual-period-status]');
  const statementRefreshButton = root.querySelector('[data-finance-statement-refresh]');
  const statementExportButton = root.querySelector('[data-finance-statement-export]');
  const statementPdfButton = root.querySelector('[data-finance-statement-pdf]');
  const statementMoreButton = root.querySelector('[data-finance-statement-more]');
  const statementState = root.querySelector('[data-finance-statement-state]');
  const statementTable = root.querySelector('[data-finance-statement-table]');
  const statementBody = root.querySelector('[data-finance-statement-body]');
  const statementCount = root.querySelector('[data-finance-statement-count]');
  const statementTitle = root.querySelector('[data-finance-statement-title]');
  const statementSubtitle = root.querySelector('[data-finance-statement-subtitle]');
  const payments = root.querySelector('[data-finance-payments]');
  const paymentsFrom = root.querySelector('[data-finance-payments-from]');
  const paymentsTo = root.querySelector('[data-finance-payments-to]');
  const paymentsStatus = root.querySelector('[data-finance-payments-status]');
  const paymentsRefreshButton = root.querySelector('[data-finance-payments-refresh]');
  const paymentsMoreButton = root.querySelector('[data-finance-payments-more]');
  const paymentsState = root.querySelector('[data-finance-payments-state]');
  const paymentsTable = root.querySelector('[data-finance-payments-table]');
  const paymentsBody = root.querySelector('[data-finance-payments-body]');
  const paymentsCount = root.querySelector('[data-finance-payments-count]');
  const headquarters = root.querySelector('[data-finance-headquarters]');
  const headquartersState = root.querySelector('[data-finance-headquarters-state]');
  const headquartersCounts = root.querySelector('[data-finance-headquarters-counts]');
  const headquartersDealers = root.querySelector('[data-finance-headquarters-dealers]');
  const headquartersBranches = root.querySelector('[data-finance-headquarters-branches]');
  const headquartersRefunded = root.querySelector('[data-finance-headquarters-refunded]');
  const headquartersDisputed = root.querySelector('[data-finance-headquarters-disputed]');
  const headquartersFamiliesTable = root.querySelector('[data-finance-headquarters-families-table]');
  const headquartersFamilies = root.querySelector('[data-finance-headquarters-families]');
  const headquartersRankingTable = root.querySelector('[data-finance-headquarters-ranking-table]');
  const headquartersRanking = root.querySelector('[data-finance-headquarters-ranking]');
  const headquartersEmpty = root.querySelector('[data-finance-headquarters-empty]');
  const dealerBreakdown=root.querySelector('[data-finance-dealer-breakdown]');const dealerBreakdownState=root.querySelector('[data-finance-dealer-breakdown-state]');const dealerFamiliesTable=root.querySelector('[data-finance-dealer-families-table]');const dealerFamilies=root.querySelector('[data-finance-dealer-families]');const dealerBranchesTable=root.querySelector('[data-finance-dealer-branches-table]');const dealerBranches=root.querySelector('[data-finance-dealer-branches]');const dealerBreakdownEmpty=root.querySelector('[data-finance-dealer-breakdown-empty]');const operationalContribution=root.querySelector('[data-finance-operational-contribution]');
  const operationalHealth=root.querySelector('[data-finance-operational-health]');const healthStatus=root.querySelector('[data-finance-health-status]');const healthGenerated=root.querySelector('[data-finance-health-generated]');const healthPending=root.querySelector('[data-finance-health-pending]');const healthAge=root.querySelector('[data-finance-health-age]');const healthDead=root.querySelector('[data-finance-health-dead]');const healthErrors=root.querySelector('[data-finance-health-errors]');const healthAudit=root.querySelector('[data-finance-health-audit]');const healthAuditCount=root.querySelector('[data-finance-health-audit-count]');
  const readiness=root.querySelector('[data-finance-readiness]');const readinessPassed=root.querySelector('[data-finance-readiness-passed]');const readinessDecision=root.querySelector('[data-finance-readiness-decision]');const readinessState=root.querySelector('[data-finance-readiness-state]');const readinessTable=root.querySelector('[data-finance-readiness-table]');const readinessBody=root.querySelector('[data-finance-readiness-body]');
  const commercial=root.querySelector('[data-finance-commercial]');const commercialStatus=root.querySelector('[data-finance-commercial-status]');const commercialState=root.querySelector('[data-finance-commercial-state]');const commercialTable=root.querySelector('[data-finance-commercial-table]');const commercialBody=root.querySelector('[data-finance-commercial-body]');
  const refunds = root.querySelector('[data-finance-refunds]');
  const refundsFrom = root.querySelector('[data-finance-refunds-from]');
  const refundsTo = root.querySelector('[data-finance-refunds-to]');
  const refundsRefreshButton = root.querySelector('[data-finance-refunds-refresh]');
  const refundsMoreButton = root.querySelector('[data-finance-refunds-more]');
  const refundsState = root.querySelector('[data-finance-refunds-state]');
  const refundsTable = root.querySelector('[data-finance-refunds-table]');
  const refundsBody = root.querySelector('[data-finance-refunds-body]');
  const refundsCount = root.querySelector('[data-finance-refunds-count]');
  const serviceUsages=root.querySelector('[data-finance-service-usages]');
  const serviceUsagesFrom=root.querySelector('[data-finance-service-usages-from]');
  const serviceUsagesTo=root.querySelector('[data-finance-service-usages-to]');
  const serviceUsagesFamily=root.querySelector('[data-finance-service-usages-family]');
  const serviceUsagesChargeStatus=root.querySelector('[data-finance-service-usages-charge-status]');
  const serviceUsagesRefreshButton=root.querySelector('[data-finance-service-usages-refresh]');
  const serviceUsagesMoreButton=root.querySelector('[data-finance-service-usages-more]');
  const serviceUsagesState=root.querySelector('[data-finance-service-usages-state]');
  const serviceUsagesTable=root.querySelector('[data-finance-service-usages-table]');
  const serviceUsagesBody=root.querySelector('[data-finance-service-usages-body]');
  const serviceUsagesCount=root.querySelector('[data-finance-service-usages-count]');
  const serviceUsagesExportButton=root.querySelector('[data-finance-service-usages-export]');
  const expensesFrom=root.querySelector('[data-finance-expenses-from]');
  const expensesTo=root.querySelector('[data-finance-expenses-to]');
  const expenses=root.querySelector('[data-finance-expenses]');const expensesStatus=root.querySelector('[data-finance-expenses-status]');const expensesRefreshButton=root.querySelector('[data-finance-expenses-refresh]');const expensesMoreButton=root.querySelector('[data-finance-expenses-more]');const expensesState=root.querySelector('[data-finance-expenses-state]');const expensesTable=root.querySelector('[data-finance-expenses-table]');const expensesBody=root.querySelector('[data-finance-expenses-body]');const expensesCount=root.querySelector('[data-finance-expenses-count]');const expenseDetail=root.querySelector('[data-finance-expense-detail]');const expenseCloseButton=root.querySelector('[data-finance-expense-close]');const expenseState=root.querySelector('[data-finance-expense-state]');const expenseContent=root.querySelector('[data-finance-expense-content]');const expenseSource=root.querySelector('[data-finance-expense-source]');const expenseReference=root.querySelector('[data-finance-expense-reference]');const expenseDistributable=root.querySelector('[data-finance-expense-distributable]');const expenseStatus=root.querySelector('[data-finance-expense-status]');const expenseApproval=root.querySelector('[data-finance-expense-approval]');const expenseDocuments=root.querySelector('[data-finance-expense-documents]');const expenseShares=root.querySelector('[data-finance-expense-shares]');const expenseProvenance=root.querySelector('[data-finance-expense-provenance]');
  const disputes=root.querySelector('[data-finance-disputes]');const disputesStatus=root.querySelector('[data-finance-disputes-status]');const disputesRefreshButton=root.querySelector('[data-finance-disputes-refresh]');const disputesMoreButton=root.querySelector('[data-finance-disputes-more]');const disputesState=root.querySelector('[data-finance-disputes-state]');const disputesTable=root.querySelector('[data-finance-disputes-table]');const disputesBody=root.querySelector('[data-finance-disputes-body]');const disputesCount=root.querySelector('[data-finance-disputes-count]');const disputeDetail=root.querySelector('[data-finance-dispute-detail]');const disputeCloseButton=root.querySelector('[data-finance-dispute-close]');const disputeState=root.querySelector('[data-finance-dispute-state]');const disputeContent=root.querySelector('[data-finance-dispute-content]');const disputeAmount=root.querySelector('[data-finance-dispute-amount]');const disputeCase=root.querySelector('[data-finance-dispute-case]');const disputeAccepted=root.querySelector('[data-finance-dispute-accepted]');const disputeStatus=root.querySelector('[data-finance-dispute-status]');const disputeApproval=root.querySelector('[data-finance-dispute-approval]');const disputeDocuments=root.querySelector('[data-finance-dispute-documents]');const disputeProvenance=root.querySelector('[data-finance-dispute-provenance]');const disputeEvidence=root.querySelector('[data-finance-dispute-evidence]');
  const exportPackages=root.querySelector('[data-finance-export-packages]');const exportPackagesType=root.querySelector('[data-finance-export-packages-type]');const exportPackagesStatus=root.querySelector('[data-finance-export-packages-status]');const exportPackagesRefreshButton=root.querySelector('[data-finance-export-packages-refresh]');const exportPackagesMoreButton=root.querySelector('[data-finance-export-packages-more]');const exportPackagesState=root.querySelector('[data-finance-export-packages-state]');const exportPackagesTable=root.querySelector('[data-finance-export-packages-table]');const exportPackagesBody=root.querySelector('[data-finance-export-packages-body]');const exportPackagesCount=root.querySelector('[data-finance-export-packages-count]');const exportPackageDetail=root.querySelector('[data-finance-export-package-detail]');const exportPackageCloseButton=root.querySelector('[data-finance-export-package-close]');const exportPackageState=root.querySelector('[data-finance-export-package-state]');const exportPackageContent=root.querySelector('[data-finance-export-package-content]');const exportPackageTotal=root.querySelector('[data-finance-export-package-total]');const exportPackageBatch=root.querySelector('[data-finance-export-package-batch]');const exportPackageStatus=root.querySelector('[data-finance-export-package-status]');const exportPackageAdapter=root.querySelector('[data-finance-export-package-adapter]');const exportPackageExternal=root.querySelector('[data-finance-export-package-external]');const exportPackageItems=root.querySelector('[data-finance-export-package-items]');const exportPackageRows=root.querySelector('[data-finance-export-package-rows]');const exportPackageProvenance=root.querySelector('[data-finance-export-package-provenance]');
  const integrationErrors=root.querySelector('[data-finance-integration-errors]');const integrationErrorsStatus=root.querySelector('[data-finance-integration-errors-status]');const integrationErrorsSource=root.querySelector('[data-finance-integration-errors-source]');const integrationErrorsRefreshButton=root.querySelector('[data-finance-integration-errors-refresh]');const integrationErrorsMoreButton=root.querySelector('[data-finance-integration-errors-more]');const integrationErrorsState=root.querySelector('[data-finance-integration-errors-state]');const integrationErrorsTable=root.querySelector('[data-finance-integration-errors-table]');const integrationErrorsBody=root.querySelector('[data-finance-integration-errors-body]');const integrationErrorsCount=root.querySelector('[data-finance-integration-errors-count]');const integrationErrorDetail=root.querySelector('[data-finance-integration-error-detail]');const integrationErrorCloseButton=root.querySelector('[data-finance-integration-error-close]');const integrationErrorState=root.querySelector('[data-finance-integration-error-state]');const integrationErrorContent=root.querySelector('[data-finance-integration-error-content]');const integrationErrorCode=root.querySelector('[data-finance-integration-error-code]');const integrationErrorSource=root.querySelector('[data-finance-integration-error-source]');const integrationErrorStatus=root.querySelector('[data-finance-integration-error-status]');const integrationErrorRetry=root.querySelector('[data-finance-integration-error-retry]');const integrationErrorMessage=root.querySelector('[data-finance-integration-error-message]');const integrationErrorTrace=root.querySelector('[data-finance-integration-error-trace]');const integrationErrorProvenance=root.querySelector('[data-finance-integration-error-provenance]');
  const approvals=root.querySelector('[data-finance-approvals]');const approvalsStatus=root.querySelector('[data-finance-approvals-status]');const approvalsRefreshButton=root.querySelector('[data-finance-approvals-refresh]');const approvalsMoreButton=root.querySelector('[data-finance-approvals-more]');const approvalsState=root.querySelector('[data-finance-approvals-state]');const approvalsTable=root.querySelector('[data-finance-approvals-table]');const approvalsBody=root.querySelector('[data-finance-approvals-body]');const approvalsCount=root.querySelector('[data-finance-approvals-count]');const approvalDetail=root.querySelector('[data-finance-approval-detail]');const approvalCloseButton=root.querySelector('[data-finance-approval-close]');const approvalDetailState=root.querySelector('[data-finance-approval-detail-state]');const approvalContent=root.querySelector('[data-finance-approval-content]');const approvalSteps=root.querySelector('[data-finance-approval-steps]');const approvalProvenance=root.querySelector('[data-finance-approval-provenance]');const approvalActionButton=root.querySelector('[data-finance-approval-action]');const approvalEvidenceButton=root.querySelector('[data-finance-approval-evidence]');
  const audit=root.querySelector('[data-finance-audit]');const auditRefreshButton=root.querySelector('[data-finance-audit-refresh]');const auditExportButton=root.querySelector('[data-finance-audit-export]');const auditFrom=root.querySelector('[data-finance-audit-from]');const auditTo=root.querySelector('[data-finance-audit-to]');const auditAction=root.querySelector('[data-finance-audit-action]');const auditSubject=root.querySelector('[data-finance-audit-subject]');const auditMoreButton=root.querySelector('[data-finance-audit-more]');const auditState=root.querySelector('[data-finance-audit-state]');const auditTable=root.querySelector('[data-finance-audit-table]');const auditBody=root.querySelector('[data-finance-audit-body]');const auditCount=root.querySelector('[data-finance-audit-count]');const auditTrace=root.querySelector('[data-finance-audit-trace]');const auditCloseButton=root.querySelector('[data-finance-audit-close]');const auditTraceState=root.querySelector('[data-finance-audit-trace-state]');const auditTraceContent=root.querySelector('[data-finance-audit-trace-content]');const auditTraceBody=root.querySelector('[data-finance-audit-trace-body]');const auditProvenance=root.querySelector('[data-finance-audit-provenance]');
  const paymentDetail = root.querySelector('[data-finance-payment-detail]');
  const paymentCloseButton = root.querySelector('[data-finance-payment-close]');
  const paymentState = root.querySelector('[data-finance-payment-state]');
  const paymentContent = root.querySelector('[data-finance-payment-content]');
  const paymentAmount = root.querySelector('[data-finance-payment-amount]');
  const paymentUnallocated = root.querySelector('[data-finance-payment-unallocated]');
  const paymentStatus = root.querySelector('[data-finance-payment-status]');
  const paymentReference = root.querySelector('[data-finance-payment-reference]');
  const paymentMethod = root.querySelector('[data-finance-payment-method]');
  const paymentDate = root.querySelector('[data-finance-payment-date]');
  const paymentAllocations = root.querySelector('[data-finance-payment-allocations]');
  const accrualDetail = root.querySelector('[data-finance-accrual-detail]');
  const accrualCloseButton = root.querySelector('[data-finance-accrual-close]');
  const accrualState = root.querySelector('[data-finance-accrual-state]');
  const accrualContent = root.querySelector('[data-finance-accrual-content]');
  const accrualAmount = root.querySelector('[data-finance-accrual-amount]');
  const accrualStatus = root.querySelector('[data-finance-accrual-status]');
  const accrualJournal = root.querySelector('[data-finance-accrual-journal]');
  const accrualDate = root.querySelector('[data-finance-accrual-date]');
  const accrualSource = root.querySelector('[data-finance-accrual-source]');
  const accrualRule = root.querySelector('[data-finance-accrual-rule]');
  const accrualLines = root.querySelector('[data-finance-accrual-lines]');
  const accrualFee=root.querySelector('[data-finance-accrual-fee]'),accrualBasis=root.querySelector('[data-finance-accrual-basis]'),accrualMethod=root.querySelector('[data-finance-accrual-method]'),accrualParameters=root.querySelector('[data-finance-accrual-parameters]'),accrualTax=root.querySelector('[data-finance-accrual-tax]'),accrualTaxPolicy=root.querySelector('[data-finance-accrual-tax-policy]'),accrualRounding=root.querySelector('[data-finance-accrual-rounding]'),accrualPeriod=root.querySelector('[data-finance-accrual-period]'),accrualProvenance=root.querySelector('[data-finance-accrual-provenance]');
  const accrualRuleOpen=root.querySelector('[data-finance-accrual-rule-open]'),accrualSourceOpen=root.querySelector('[data-finance-accrual-source-open]'),accrualExplanationDownload=root.querySelector('[data-finance-accrual-explanation-download]'),accrualDispute=root.querySelector('[data-finance-accrual-dispute]');let selectedAccrualDetail=null;
  const refundDetail = root.querySelector('[data-finance-refund-detail]');
  const refundCloseButton = root.querySelector('[data-finance-refund-close]');
  const refundState = root.querySelector('[data-finance-refund-state]');
  const refundContent = root.querySelector('[data-finance-refund-content]');
  const refundGross = root.querySelector('[data-finance-refund-gross]');
  const refundId = root.querySelector('[data-finance-refund-id]');
  const refundOriginal = root.querySelector('[data-finance-refund-original]');
  const refundOriginalPeriod = root.querySelector('[data-finance-refund-original-period]');
  const refundReversal = root.querySelector('[data-finance-refund-reversal]');
  const refundPostingPeriod = root.querySelector('[data-finance-refund-posting-period]');
  const refundProvenance = root.querySelector('[data-finance-refund-provenance]');
  const periodDetail = root.querySelector('[data-finance-period-detail]');
  const periodDetailState = root.querySelector('[data-finance-period-state]');
  const periodContent = root.querySelector('[data-finance-period-content]');
  const periodEmpty = root.querySelector('[data-finance-period-empty]');
  const periodStatus = root.querySelector('[data-finance-period-status]');
  const periodRange = root.querySelector('[data-finance-period-range]');
  const periodVersion = root.querySelector('[data-finance-period-version]');
  const periodLocked = root.querySelector('[data-finance-period-locked]');
  const periodSourceHash = root.querySelector('[data-finance-period-source-hash]');
  const periodCheckHash = root.querySelector('[data-finance-period-check-hash]');
  const contractWorkspace = root.querySelector('[data-finance-contract-workspace]');
  const contractTitle = root.querySelector('[data-finance-contract-title]');
  const contractSubtitle = root.querySelector('[data-finance-contract-subtitle]');
  const contractRefreshButton = root.querySelector('[data-finance-contract-refresh]');
  const contractState = root.querySelector('[data-finance-contract-state]');
  const contractContent = root.querySelector('[data-finance-contract-content]');
  const contractCode = root.querySelector('[data-finance-contract-code]');
  const contractStatus = root.querySelector('[data-finance-contract-status]');
  const contractActive = root.querySelector('[data-finance-contract-active]');
  const contractValidity = root.querySelector('[data-finance-contract-validity]');
  const contractPending = root.querySelector('[data-finance-contract-pending]');
  const contractPendingStatus = root.querySelector('[data-finance-contract-pending-status]');
  const contractHash = root.querySelector('[data-finance-contract-hash]');
  const contractRuleStatus = root.querySelector('[data-finance-contract-rule-status]');
  const contractRulesState = root.querySelector('[data-finance-contract-rules-state]');
  const contractRulesTable = root.querySelector('[data-finance-contract-rules-table]');
  const contractRulesBody = root.querySelector('[data-finance-contract-rules-body]');
  const contractRulesCount = root.querySelector('[data-finance-contract-rules-count]');
  const contractMoreButton = root.querySelector('[data-finance-contract-more]');
  const contractRuleDetail=root.querySelector('[data-finance-contract-rule-detail]');const contractRuleDetailClose=root.querySelector('[data-finance-contract-rule-detail-close]');const contractRuleDetailState=root.querySelector('[data-finance-contract-rule-detail-state]');const contractRuleDetailContent=root.querySelector('[data-finance-contract-rule-detail-content]');const contractRuleDetailTitle=root.querySelector('[data-finance-contract-rule-detail-title]');const contractRuleTrigger=root.querySelector('[data-finance-contract-rule-trigger]');const contractRulePriority=root.querySelector('[data-finance-contract-rule-priority]');const contractRuleBasis=root.querySelector('[data-finance-contract-rule-basis]');const contractRuleTax=root.querySelector('[data-finance-contract-rule-tax]');const contractRuleCalculation=root.querySelector('[data-finance-contract-rule-calculation]');const contractRuleRounding=root.querySelector('[data-finance-contract-rule-rounding]');const contractRuleProvenance=root.querySelector('[data-finance-contract-rule-provenance]');
  const contractRuleExceptions=root.querySelector('[data-finance-contract-rule-exceptions]');
  const contractComparison=root.querySelector('[data-finance-contract-comparison]');const contractComparisonTitle=root.querySelector('[data-finance-contract-comparison-title]');const contractComparisonState=root.querySelector('[data-finance-contract-comparison-state]');const contractComparisonContent=root.querySelector('[data-finance-contract-comparison-content]');const contractComparisonBody=root.querySelector('[data-finance-contract-comparison-body]');const contractComparisonAdded=root.querySelector('[data-finance-contract-comparison-added]');const contractComparisonChanged=root.querySelector('[data-finance-contract-comparison-changed]');const contractComparisonRemoved=root.querySelector('[data-finance-contract-comparison-removed]');const contractComparisonUnchanged=root.querySelector('[data-finance-contract-comparison-unchanged]');
  const contractImpactForm=root.querySelector('[data-finance-contract-impact-form]');const contractImpactInputs=root.querySelector('[data-finance-contract-impact-inputs]');const contractImpactState=root.querySelector('[data-finance-contract-impact-state]');const contractImpactResult=root.querySelector('[data-finance-contract-impact-result]');const contractImpactActive=root.querySelector('[data-finance-contract-impact-active]');const contractImpactCandidate=root.querySelector('[data-finance-contract-impact-candidate]');const contractImpactDelta=root.querySelector('[data-finance-contract-impact-delta]');const contractImpactBody=root.querySelector('[data-finance-contract-impact-body]');
  const contractTimelineState=root.querySelector('[data-finance-contract-timeline-state]');const contractTimelineTable=root.querySelector('[data-finance-contract-timeline-table]');const contractTimelineBody=root.querySelector('[data-finance-contract-timeline-body]');const contractTimelineCount=root.querySelector('[data-finance-contract-timeline-count]');const contractTimelineMore=root.querySelector('[data-finance-contract-timeline-more]');let contractTimelineRowCount=0;
  let scopeReady = false;
  let statementRowCount = 0;
  let paymentRowCount = 0;
  let refundRowCount = 0;
  let serviceUsageRowCount=0;
  let expenseRowCount=0;
  let disputeRowCount=0;
  let exportPackageRowCount=0;
  let integrationErrorRowCount=0;
  let approvalRowCount=0;let selectedApproval=null;let auditRowCount=0;
  let contractRuleRowCount = 0;
  const contractRuleItems=new Map();
  const bindDateRange=(fromInput,toInput)=>{const sync=()=>{fromInput.max=toInput.value||'';toInput.min=fromInput.value||'';};fromInput.addEventListener('change',sync);toInput.addEventListener('change',sync);sync();};
  [[statementFrom,statementTo],[paymentsFrom,paymentsTo],[refundsFrom,refundsTo],[serviceUsagesFrom,serviceUsagesTo],[expensesFrom,expensesTo]].forEach(pair=>bindDateRange(...pair));
  let contractRulesVersionId = null;
  let activeScreenId = 'SCR-01';
  let cachedDealerSummary = null;
  let cachedHeadquartersSummary = null;
  const statementScreenIds = new Set('SCR-05,SCR-07'.split(','));
  const contractScreenIds = new Set('SCR-03,SCR-04'.split(','));

  const renderList = (target, items) => {
    target.replaceChildren(...items.map(item => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
  };

  const selectScreen = screen => {
    const [id, name, screenSections, screenActions] = screen;
    const previousScreenId=activeScreenId;
    activeScreenId = id;
    nav.querySelectorAll('.finance-screen-button').forEach(button => {
      const selected = button.dataset.financeScreen === id;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
    code.textContent = id;
    title.textContent = name;
    description.textContent = 'Yetkili finans API bağlantısı bekleniyor; demo veya tahmini tutar gösterilmiyor.';
    renderList(sections, screenSections);
    renderList(actions, screenActions);
    statement.hidden = !statementScreenIds.has(id);
    statementTitle.textContent = id === 'SCR-05' ? 'Tahakkuklar' : 'Bayi Ekstresi';
    statementSubtitle.textContent = id === 'SCR-05'
      ? 'Kaynak olay, bedel kodu, brüt tutar, açık bakiye ve fatura bağlantıları şube kapsamında gösterilir.'
      : 'Yalnız seçili tüzel kişi, bayi hesabı ve şube kapsamındaki doğrulanmış hareketler.';
    accrualFilters.forEach(node=>{node.hidden=id!=='SCR-05';});
    if(statementScreenIds.has(id)&&statementScreenIds.has(previousScreenId)&&previousScreenId!==id)resetStatement(id==='SCR-05'?'Tahakkuk filtrelerini seçip kayıtları getirin.':'Ekstre filtrelerini seçip kayıtları getirin.');
    payments.hidden = id !== 'SCR-08';
    headquarters.hidden = id !== 'SCR-01';
    dealerBreakdown.hidden=id!=='SCR-02';
    refunds.hidden = id !== 'SCR-17';
    serviceUsages.hidden=id!=='SCR-09';
    expenses.hidden=id!=='SCR-10';
    disputes.hidden=id!=='SCR-11';
    exportPackages.hidden=id!=='SCR-13';
    integrationErrors.hidden=id!=='SCR-14';
    approvals.hidden=id!=='SCR-15';audit.hidden=id!=='SCR-16';
    contractWorkspace.hidden = !contractScreenIds.has(id);
    contractTitle.textContent = id === 'SCR-04' ? 'Bedel Kataloğu ve Kural Yapısı' : 'Sözleşme ve Kural Sürümleri';
    contractSubtitle.textContent = id === 'SCR-04' ? 'Geçerli sürümdeki bedel aileleri, tetikleyiciler ve hesaplama yapıları.' : 'Seçili şubenin aktif sözleşmesi, geçerli sürümü ve bekleyen sürümü.';
    accrualDetail.hidden = id !== 'SCR-06';
    if (id === 'SCR-06' && !accrualDetail.dataset.state) setAccrualState('EMPTY', 'Tahakkuk listesinden bir kayıt seçin.');
    periodDetail.hidden = id !== 'SCR-12';
    displayCachedSummary();
  };

  const canonicalDecimal = value => {
    const text = String(value ?? '');
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(text)) throw new Error('INVALID_FINANCE_DECIMAL');
    const [whole, fraction = ''] = text.split('.');
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction ? `,${fraction}` : ''}`;
  };

  const money = breakdown => {
    if (!breakdown || typeof breakdown !== 'object' || typeof breakdown.grossAmount !== 'string' || !/^[A-Z]{3}$/.test(breakdown.currency || '')) throw new Error('INVALID_FINANCE_MONEY');
    return `${canonicalDecimal(breakdown.grossAmount)} ${breakdown.currency}`;
  };

  const amount = (value, currency) => {
    if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(currency || '')) throw new Error('INVALID_FINANCE_MONEY');
    return `${canonicalDecimal(value)} ${currency}`;
  };

  const statementStatuses = Object.freeze({OPEN:'Açık',PARTIALLY_ALLOCATED:'Kısmi tahsis',CLOSED:'Kapalı',DISPUTED:'İtirazlı',REVERSED:'Ters kayıt'});
  const paymentStatuses = Object.freeze({PENDING_VERIFICATION:'Doğrulama bekliyor',VERIFIED:'Doğrulandı',PARTIALLY_ALLOCATED:'Kısmi tahsis',ALLOCATED:'Tam tahsis',REVERSED:'Ters kayıt',REJECTED:'Reddedildi'});
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cell = text => {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  };
  const setStatementState = (next, message) => {
    if (!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_STATEMENT_STATE');
    statement.dataset.state = next;
    statementState.textContent = message || ({EMPTY:'Kayıt bulunamadı.',LOADING:'Yetkili ekstre yükleniyor…',READY:'Ekstre yüklendi.',ERROR:'Ekstre yüklenemedi.'})[next];
    statementState.hidden = next === 'READY' && statementRowCount > 0;
    statementRefreshButton.disabled = !scopeReady || next === 'LOADING';
    statementExportButton.disabled = !scopeReady || next === 'LOADING';
    statementPdfButton.disabled = !scopeReady || next === 'LOADING';
    statementStatus.disabled = !scopeReady || next === 'LOADING';
    statementCurrency.disabled = !scopeReady || next === 'LOADING';
    accrualFamily.disabled=!scopeReady||next==='LOADING';accrualPeriodStatus.disabled=!scopeReady||next==='LOADING';
    statementFrom.disabled = !scopeReady || next === 'LOADING';
    statementTo.disabled = !scopeReady || next === 'LOADING';
    if (next === 'LOADING') statementMoreButton.disabled = true;
  };
  const resetStatement = message => {
    statementBody.replaceChildren();
    statementRowCount = 0;
    statementTable.hidden = true;
    statementMoreButton.hidden = true;
    statementMoreButton.disabled = true;
    statementCount.textContent = '0 kayıt';
    statementControl.hidden = true;
    statementAging.hidden = true;
    setStatementState('EMPTY', message || 'Henüz yetkili ekstre isteği yapılmadı.');
  };
  const renderStatementPage = (payload, {append = false} = {}) => {
    if (!payload || !Array.isArray(payload.items) || typeof payload.hasMore !== 'boolean' || !(payload.nextCursor === null || payload.nextCursor === undefined || typeof payload.nextCursor === 'string')) throw new Error('INVALID_FINANCE_STATEMENT');
    const rows = payload.items.map(item => {
      if (!item || typeof item !== 'object' || !uuidPattern.test(item.recordId || '') || typeof item.recordType !== 'string' || !statementStatuses[item.status] || !/^\d{4}-\d{2}-\d{2}$/.test(item.businessDate || '') || typeof item.feeCode !== 'string' || !item.feeCode || !item.totals || item.currencyCode !== item.totals.currency || (item.paymentIds !== undefined && (!Array.isArray(item.paymentIds) || item.paymentIds.some(id => !uuidPattern.test(id))))) throw new Error('INVALID_FINANCE_STATEMENT_ITEM');
      const tr = document.createElement('tr');
      const fee = document.createElement('div'); fee.className = 'finance-statement-fee'; fee.textContent = item.feeCode;
      const source = document.createElement('small'); source.textContent = item.sourceReference || 'Kaynak referansı yok';
      if(item.feeFamily)source.textContent+=` · ${item.feeFamily}`;
      if(item.financePeriod?.status)source.textContent+=` · Dönem: ${item.financePeriod.status}`;
      if (item.externalInvoiceNumber) source.textContent += ` · Fatura: ${item.externalInvoiceNumber}`;
      const descriptor = document.createElement('td'); descriptor.append(fee, source);
      const statusCell = document.createElement('td');
      const badge = document.createElement('span'); badge.className = `finance-statement-status is-${item.status.toLowerCase()}`; badge.textContent = statementStatuses[item.status]; statusCell.appendChild(badge);
      if (item.paymentIds?.length) {
        const paymentButton = document.createElement('button'); paymentButton.type = 'button'; paymentButton.className = 'finance-inline-action'; paymentButton.dataset.financePaymentId = item.paymentIds[0]; paymentButton.textContent = item.paymentIds.length > 1 ? `Ödemeyi aç (+${item.paymentIds.length - 1})` : 'Ödemeyi aç'; statusCell.appendChild(paymentButton);
      }
      if (item.recordType === 'ACCRUAL') {
        const accrualButton = document.createElement('button'); accrualButton.type = 'button'; accrualButton.className = 'finance-inline-action'; accrualButton.dataset.financeAccrualId = item.recordId; accrualButton.textContent = 'Tahakkuk izini aç'; statusCell.appendChild(accrualButton);
        if(Number(item.openAmount)>0){const reversalButton=document.createElement('button');reversalButton.type='button';reversalButton.className='finance-inline-action';reversalButton.dataset.financeReversalTargetId=item.recordId;reversalButton.dataset.financeReversalMaximum=item.openAmount;reversalButton.dataset.financeReversalCurrency=item.currencyCode;reversalButton.textContent='Ters kayıt talep et';statusCell.appendChild(reversalButton);const disputeButton=document.createElement('button');disputeButton.type='button';disputeButton.className='finance-inline-action';disputeButton.dataset.financeDisputeTargetId=item.recordId;disputeButton.dataset.financeDisputeMaximum=item.openAmount;disputeButton.dataset.financeDisputeCurrency=item.currencyCode;disputeButton.textContent='İtiraz başlat';statusCell.appendChild(disputeButton);}
      }
      if (item.recordType === 'REVERSAL' && item.feeCode === 'ROYALTY') {
        const refundButton=document.createElement('button'); refundButton.type='button'; refundButton.className='finance-inline-action'; refundButton.dataset.financeRefundAccrualId=item.recordId; refundButton.textContent='Royalty iade izini aç'; statusCell.appendChild(refundButton);
      }
      tr.append(cell(new Intl.DateTimeFormat('tr-TR').format(new Date(`${item.businessDate}T00:00:00Z`))), descriptor, cell(money(item.totals)), cell(amount(item.allocatedAmount, item.currencyCode)), cell(amount(item.openAmount, item.currencyCode)), statusCell);
      return tr;
    });
    if (!append) { statementBody.replaceChildren(); statementRowCount = 0; }
    statementBody.append(...rows);
    statementRowCount += rows.length;
    statementCount.textContent = `${statementRowCount} kayıt`;
    statementTable.hidden = statementRowCount === 0;
    statementMoreButton.hidden = !payload.hasMore;
    statementMoreButton.disabled = !payload.hasMore;
    statementMoreButton.dataset.cursor = payload.nextCursor || '';
    setStatementState(statementRowCount ? 'READY' : 'EMPTY', statementRowCount ? 'Ekstre yüklendi.' : 'Seçili filtrelerde kayıt bulunamadı.');
  };
  const renderStatementControl = payload => {
    if (!payload || !/^\d{4}-\d{2}-\d{2}$/.test(payload.from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(payload.to || '') || !/^[A-Z]{3}$/.test(payload.currency || '') || payload.historicalReconstruction !== true || payload.rawRecordsExposed !== false || !payload.aging) throw new Error('INVALID_FINANCE_STATEMENT_CONTROL');
    const show = value => amount(value, payload.currency);
    const values = {openingBalance:show(payload.openingBalance),periodMovement:`${show(payload.periodDebits)} / ${show(payload.periodCredits)}`,allocations:`${show(payload.periodAllocations)} / ${show(payload.allocationReversals)}`,closingBalance:show(payload.closingBalance)};
    for (const node of statementControl.querySelectorAll('[data-finance-statement-control-value]')) node.textContent = values[node.dataset.financeStatementControlValue] || '—';
    for (const node of statementAging.querySelectorAll('[data-finance-aging]')) node.textContent = show(payload.aging[node.dataset.financeAging]);
    statementControl.hidden = false; statementAging.hidden = false;
  };
  const downloadStatementExport=payload=>{
    if(!payload||payload.documentType!=='OTOTR_FINANCE_DEALER_STATEMENT_EXPORT'||payload.rawRecordsExposed!==false||!Array.isArray(payload.items)||payload.rowCount!==payload.items.length||typeof payload.truncated!=='boolean')throw new Error('INVALID_STATEMENT_EXPORT');
    const csvValue=value=>{let text=value==null?'':String(value);if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};
    const headers=['recordId','recordType','businessDate','dueDate','feeCode','sourceReference','netAmount','taxAmount','grossAmount','allocatedAmount','openAmount','currency','status','externalInvoiceNumber','reversalReferenceId'];
    const csv='\ufeff'+[headers,...payload.items.map(item=>headers.map(key=>item[key]??''))].map(row=>row.map(csvValue).join(',')).join('\r\n');
    const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),anchor=document.createElement('a');anchor.href=href;anchor.download=`ototr-bayi-ekstresi-${payload.filters.from}-${payload.filters.to}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),0);
  };
  const downloadStatementPdf=payload=>{
    if(!payload||payload.documentType!=='OTOTR_FINANCE_DEALER_STATEMENT_EXPORT'||payload.rawRecordsExposed!==false||!Array.isArray(payload.items)||payload.rowCount!==payload.items.length)throw new Error('INVALID_STATEMENT_PDF');
    const ascii=value=>String(value??'').replaceAll('ı','i').replaceAll('İ','I').replaceAll('ş','s').replaceAll('Ş','S').replaceAll('ğ','g').replaceAll('Ğ','G').replaceAll('ü','u').replaceAll('Ü','U').replaceAll('ö','o').replaceAll('Ö','O').replaceAll('ç','c').replaceAll('Ç','C').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');
    const esc=value=>ascii(value).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)').slice(0,110);
    const lines=[`OTOTR GM FINANS - BAYI EKSTRESI`,`Tarih araligi: ${payload.filters.from} / ${payload.filters.to}   Para birimi: ${payload.filters.currency}   Durum: ${payload.filters.status||'TUMU'}`,`Bayi hesabi: ${payload.scope.dealerAccountId}   Sube: ${payload.scope.branchId}`,`Kayit: ${payload.rowCount}/${payload.totalMatchingCount}${payload.truncated?' (LIMITLI)':''}`,`Olusturma: ${payload.generatedAtUtc}`,'', 'TARIH | VADE | BEDEL | BRUT | TAHSIS | ACIK | DURUM | KAYNAK',...payload.items.map(item=>`${item.businessDate} | ${item.dueDate||'-'} | ${item.feeCode} | ${item.grossAmount} | ${item.allocatedAmount} | ${item.openAmount} | ${item.status} | ${item.sourceReference||'-'}`)];
    const chunks=[];for(let i=0;i<lines.length;i+=54)chunks.push(lines.slice(i,i+54));
    const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];const kids=[];
    chunks.forEach((pageLines,index)=>{const pageId=4+index*2,contentId=pageId+1;kids.push(`${pageId} 0 R`);const content=`BT /F1 9 Tf 36 806 Td 13 TL ${pageLines.map(line=>`(${esc(line)}) Tj T*`).join(' ')} ET`;objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId]=`<< /Length ${content.length} >>\nstream\n${content}\nendstream`;});objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
    let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const href=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),anchor=document.createElement('a');anchor.href=href;anchor.download=`ototr-bayi-ekstresi-${payload.filters.from}-${payload.filters.to}.pdf`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),0);
  };
  const getStatementFilters = () => Object.freeze({mode:activeScreenId==='SCR-05'?'ACCRUALS':'STATEMENT',from:statementFrom.value||undefined,to:statementTo.value||undefined,currency:statementCurrency.value||'TRY',status: activeScreenId==='SCR-05'?undefined:(statementStatus.value||undefined),feeFamily:activeScreenId==='SCR-05'?(accrualFamily.value||undefined):undefined,periodStatus:activeScreenId==='SCR-05'?(accrualPeriodStatus.value||undefined):undefined,limit:25});

  const setContractState=(next,message)=>{
    if(!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_CONTRACT_STATE');
    contractWorkspace.dataset.state=next; contractState.hidden=next==='READY'; contractContent.hidden=next!=='READY';
    contractState.textContent=message||({EMPTY:'Aktif sözleşme bulunamadı.',LOADING:'Yetkili sözleşme yükleniyor…',READY:'Sözleşme yüklendi.',ERROR:'Sözleşme yüklenemedi.'})[next];
    contractRefreshButton.disabled=!scopeReady||next==='LOADING';
  };
  const setContractRulesState=(next,message)=>{
    if(!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_CONTRACT_RULES_STATE');
    contractRulesState.hidden=next==='READY'&&contractRuleRowCount>0; contractRulesState.textContent=message||({EMPTY:'Kural bulunamadı.',LOADING:'Yetkili kurallar yükleniyor…',READY:'Kurallar yüklendi.',ERROR:'Kurallar yüklenemedi.'})[next];
    contractRuleStatus.disabled=!scopeReady||next==='LOADING'; if(next==='LOADING') contractMoreButton.disabled=true;
  };
  const resetContractRuleDetail=()=>{contractRuleDetail.hidden=true;contractRuleDetailState.hidden=false;contractRuleDetailState.textContent='Listeden bir kural seçin.';contractRuleDetailContent.hidden=true;contractRuleProvenance.replaceChildren();contractRuleExceptions.replaceChildren();};
  const setContractRuleDetailState=(next,message)=>{if(!['LOADING','ERROR'].includes(next))throw new Error('INVALID_FINANCE_CONTRACT_RULE_DETAIL_STATE');contractRuleDetail.hidden=false;contractRuleDetailState.hidden=false;contractRuleDetailContent.hidden=true;contractRuleDetailState.textContent=message||(next==='LOADING'?'Yetkili kural detayı yükleniyor…':'Kural detayı yüklenemedi.');};
  const renderContractRuleDetail=item=>{if(!item||!uuidPattern.test(item.feeRuleId||'')||!Array.isArray(item.exceptions)||item.exceptionCount!==item.exceptions.length)throw new Error('INVALID_FINANCE_CONTRACT_RULE_DETAIL');const calculation=item.calculation||{},basis=item.basis||{};const parameter=calculation.rate??calculation.percentage??calculation.amount??calculation.value;const exceptionRows=item.exceptions.map(exception=>{if(!exception||!uuidPattern.test(exception.exceptionId||'')||typeof exception.exceptionCode!=='string'||typeof exception.scopeType!=='string'||typeof exception.conditionType!=='string'||typeof exception.overrideType!=='string'||!Number.isInteger(exception.priority)||!/^\d{4}-\d{2}-\d{2}$/.test(exception.effectiveFrom||'')||typeof exception.status!=='string')throw new Error('INVALID_FINANCE_RULE_EXCEPTION');const tr=document.createElement('tr');tr.append(cell(exception.exceptionCode),cell(`${exception.scopeType} / ${exception.conditionType}`),cell(exception.overrideType),cell(`${exception.effectiveFrom} – ${exception.effectiveTo||'süresiz'}`),cell(`${exception.status} · P${exception.priority}`));return tr;});if(!exceptionRows.length){const tr=document.createElement('tr'),td=cell('Tanımlı istisna yok');td.colSpan=5;tr.append(td);exceptionRows.push(tr);}contractRuleDetail.hidden=false;contractRuleDetailState.hidden=true;contractRuleDetailContent.hidden=false;contractRuleDetailTitle.textContent=`${item.feeCode} · ${item.name}`;contractRuleTrigger.textContent=item.triggerEventType||'Tetikleyici tanımlı değil';contractRulePriority.textContent=`Öncelik: ${Number.isInteger(item.priority)?item.priority:'—'}`;contractRuleBasis.textContent=basis.kind||basis.type||'Matrah tanımlı değil';contractRuleTax.textContent=calculation.priceIncludesTax===true?'KDV dahil matrah':calculation.priceIncludesTax===false?'KDV hariç matrah':'Vergi yaklaşımı tanımlı değil';contractRuleCalculation.textContent=calculation.method?`${calculation.method}${parameter!==undefined?` · ${parameter}`:''}`:'Yapılandırılmadı';contractRuleRounding.textContent=[calculation.currency,calculation.roundingMode,calculation.decimalScale!=null?`${calculation.decimalScale} hane`:null].filter(Boolean).join(' · ')||'Yuvarlama politikası tanımlı değil';const provenance=[`Kural: ${item.ruleCode}`,`Kural kimliği: ${item.feeRuleId}`,`Sürüm: ${contractRulesVersionId||'—'}`,`Yapılandırma: ${item.configurationStatus}`,`Durum: ${item.status}`,`İstisna: ${item.exceptionCount}`];contractRuleProvenance.replaceChildren(...provenance.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));contractRuleExceptions.replaceChildren(...exceptionRows);};
  const resetContractRules=message=>{
    contractRulesBody.replaceChildren();contractRuleItems.clear();contractRuleRowCount=0;contractRulesTable.hidden=true;contractMoreButton.hidden=true;contractMoreButton.disabled=true;contractRulesCount.textContent='0 kural';resetContractRuleDetail();setContractRulesState('EMPTY',message||'Sözleşme sürümü bekleniyor.');
  };
  const resetContractComparison=message=>{contractComparison.hidden=true;contractComparisonState.hidden=false;contractComparisonContent.hidden=true;contractComparisonBody.replaceChildren();contractImpactInputs.replaceChildren();contractImpactBody.replaceChildren();contractImpactResult.hidden=true;contractImpactState.textContent='Senaryo hesaplanmadı.';contractComparisonState.textContent=message||'Aktif ve bekleyen sürüm bekleniyor.';};
  const setContractComparisonState=(next,message)=>{if(!['LOADING','ERROR'].includes(next))throw new Error('INVALID_FINANCE_CONTRACT_COMPARISON_STATE');contractComparison.hidden=false;contractComparisonState.hidden=false;contractComparisonContent.hidden=true;contractComparisonState.textContent=message||(next==='LOADING'?'Sürüm değişiklikleri güvenli biçimde karşılaştırılıyor…':'Sürüm karşılaştırması yüklenemedi.');};
  const renderContractVersionComparison=payload=>{if(payload===null){resetContractComparison('Bu sözleşme sürümleri şube kapsamında bulunamadı.');return;}if(!payload||!uuidPattern.test(payload.activeVersionId||'')||!uuidPattern.test(payload.candidateVersionId||'')||!Number.isInteger(payload.activeVersionNo)||!Number.isInteger(payload.candidateVersionNo)||!payload.summary||!Array.isArray(payload.items)||payload.rawDefinitionsExposed!==false)throw new Error('INVALID_FINANCE_CONTRACT_COMPARISON');for(const key of['added','removed','changed','unchanged'])if(!Number.isInteger(payload.summary[key])||payload.summary[key]<0)throw new Error('INVALID_FINANCE_CONTRACT_COMPARISON');const rows=[],inputs=[];for(const item of payload.items){if(!item||!uuidPattern.test(item.feeDefinitionId||'')||!['ADDED','REMOVED','CHANGED','UNCHANGED'].includes(item.changeType))throw new Error('INVALID_FINANCE_CONTRACT_COMPARISON_ITEM');const tr=document.createElement('tr');tr.append(cell(`${item.feeCode} · ${item.feeName}`),cell(item.changeType),cell(item.activeMethod||'—'),cell(item.candidateMethod||'—'),cell(`${item.activeExceptionCount} → ${item.candidateExceptionCount}`));rows.push(tr);const inputRow=document.createElement('tr');inputRow.dataset.feeDefinitionId=item.feeDefinitionId;const basis=document.createElement('input');basis.name='basisAmount';basis.value='1000.00';basis.inputMode='decimal';basis.required=true;basis.pattern='(0|[1-9][0-9]*)(\\.[0-9]{1,8})?';const quantity=document.createElement('input');quantity.name='quantity';quantity.value='1';quantity.inputMode='decimal';quantity.required=true;quantity.pattern='(0|[1-9][0-9]*)(\\.[0-9]{1,8})?';const basisCell=document.createElement('td');basisCell.append(basis);const quantityCell=document.createElement('td');quantityCell.append(quantity);inputRow.append(cell(`${item.feeCode} · ${item.feeName}`),basisCell,quantityCell);inputs.push(inputRow);}contractComparison.hidden=false;contractComparisonState.hidden=true;contractComparisonContent.hidden=false;contractComparisonTitle.textContent=`v${payload.activeVersionNo} → v${payload.candidateVersionNo} Sürüm Karşılaştırması`;contractComparisonAdded.textContent=String(payload.summary.added);contractComparisonChanged.textContent=String(payload.summary.changed);contractComparisonRemoved.textContent=String(payload.summary.removed);contractComparisonUnchanged.textContent=String(payload.summary.unchanged);contractComparisonBody.replaceChildren(...rows);contractImpactInputs.replaceChildren(...inputs);contractImpactResult.hidden=true;contractImpactState.textContent='Senaryo hesaplanmadı.';};
  const getContractImpactScenario=()=>Object.freeze({items:Object.freeze([...contractImpactInputs.querySelectorAll('tr')].map(row=>Object.freeze({feeDefinitionId:row.dataset.feeDefinitionId,basisAmount:row.querySelector('[name="basisAmount"]').value.trim(),quantity:row.querySelector('[name="quantity"]').value.trim()})))});
  const setContractImpactState=(next,message)=>{if(!['LOADING','ERROR'].includes(next))throw new Error('INVALID_FINANCE_IMPACT_STATE');contractImpactState.textContent=message||(next==='LOADING'?'Sentetik sepet sunucuda hesaplanıyor…':'Etki simülasyonu tamamlanamadı.');if(next==='LOADING')contractImpactResult.hidden=true;};
  const renderContractImpactSimulation=payload=>{if(!payload||!Array.isArray(payload.items)||typeof payload.complete!=='boolean'||payload.writesPerformed!==false||payload.rawDefinitionsExposed!==false)throw new Error('INVALID_FINANCE_IMPACT_RESULT');const currency=payload.currency;const rows=payload.items.map(item=>{if(!uuidPattern.test(item.feeDefinitionId||'')||!item.active||!item.candidate)throw new Error('INVALID_FINANCE_IMPACT_ITEM');const active=item.active.supported?`${item.active.grossAmount} ${currency}`:`Desteklenmiyor: ${item.active.reasonCode}`;const candidate=item.candidate.supported?`${item.candidate.grossAmount} ${currency}`:`Desteklenmiyor: ${item.candidate.reasonCode}`;const tr=document.createElement('tr');tr.append(cell(`${item.feeCode} · ${item.feeName}`),cell(active),cell(candidate),cell(item.deltaGrossAmount===null?'Toplam dışı':`${item.deltaGrossAmount} ${currency}`));return tr;});contractImpactBody.replaceChildren(...rows);contractImpactResult.hidden=false;if(payload.complete){contractImpactActive.textContent=`${payload.totals.activeGrossAmount} ${currency}`;contractImpactCandidate.textContent=`${payload.totals.candidateGrossAmount} ${currency}`;contractImpactDelta.textContent=`${payload.totals.deltaGrossAmount} ${currency}`;contractImpactState.textContent='SENTETİK SONUÇ · KAYIT OLUŞTURULMADI';}else{contractImpactActive.textContent='Eksik';contractImpactCandidate.textContent='Eksik';contractImpactDelta.textContent='Hesaplanmadı';contractImpactState.textContent='Bazı yöntemler desteklenmedi; yanıltıcı toplam üretilmedi.';}};
  const resetContractTimeline=message=>{contractTimelineBody.replaceChildren();contractTimelineRowCount=0;contractTimelineTable.hidden=true;contractTimelineMore.hidden=true;contractTimelineMore.disabled=true;contractTimelineCount.textContent='0 sürüm';contractTimelineState.hidden=false;contractTimelineState.textContent=message||'Sözleşme bekleniyor.';};
  const setContractTimelineState=(next,message)=>{if(!['LOADING','ERROR'].includes(next))throw new Error('INVALID_FINANCE_CONTRACT_TIMELINE_STATE');contractTimelineState.hidden=false;contractTimelineState.textContent=message||(next==='LOADING'?'Sözleşme sürümleri yükleniyor…':'Sürüm zaman çizgisi yüklenemedi.');if(next==='LOADING')contractTimelineMore.disabled=true;};
  const renderContractTimelinePage=(payload,{append=false}={})=>{if(payload===null){resetContractTimeline('Sözleşme zaman çizgisi bu şube kapsamında bulunamadı.');return;}if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||payload.rawDefinitionsExposed!==false||payload.rawStorageKeysExposed!==false)throw new Error('INVALID_FINANCE_CONTRACT_TIMELINE');const rows=payload.items.map(item=>{if(!uuidPattern.test(item.versionId||'')||!Number.isInteger(item.versionNo)||typeof item.status!=='string'||!Number.isInteger(item.ruleCount)||!Number.isInteger(item.configuredRuleCount)||!Number.isInteger(item.exceptionCount)||item.rawEvidenceExposed!==false||!Array.isArray(item.documents))throw new Error('INVALID_FINANCE_CONTRACT_TIMELINE_ITEM');const maker=typeof item.preparedBy==='string'?`${item.preparedBy.slice(0,8)}…`:'—';const checker=typeof item.approvedBy==='string'?`${item.approvedBy.slice(0,8)}…`:'Bekliyor';const hash=/^[0-9a-f]{64}$/i.test(item.contentHash||'')?`${item.contentHash.slice(0,12)}…${item.contentHash.slice(-8)}`:'Geçersiz';const evidence=document.createElement('td');const hashText=document.createElement('div');hashText.textContent=hash;evidence.append(hashText);for(const documentItem of item.documents){if(!uuidPattern.test(documentItem.documentId||'')||!/^.{64}$/.test(documentItem.contentHash||''))throw new Error('INVALID_CONTRACT_EVIDENCE');const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeContractEvidence=documentItem.documentId;button.dataset.financeContractVersion=item.versionId;button.textContent=`${documentItem.documentType} indir`;evidence.append(button);}if(!item.documents.length){const empty=document.createElement('small');empty.textContent='Belge yok';evidence.append(empty);}const tr=document.createElement('tr');tr.append(cell(`v${item.versionNo} · ${item.currencyCode}`),cell(item.status),cell(`${item.validFrom} – ${item.validTo||'süresiz'}`),cell(`${item.configuredRuleCount}/${item.ruleCount} yapılandırılmış · ${item.exceptionCount} istisna`),cell(`${maker} → ${checker}`),evidence);return tr;});if(!append){contractTimelineBody.replaceChildren();contractTimelineRowCount=0;}contractTimelineBody.append(...rows);contractTimelineRowCount+=rows.length;contractTimelineTable.hidden=contractTimelineRowCount===0;contractTimelineState.hidden=contractTimelineRowCount>0;contractTimelineState.textContent=contractTimelineRowCount?'Sürümler ve yetkili kanıt listesi yüklendi.':'Sürüm bulunamadı.';contractTimelineCount.textContent=`${contractTimelineRowCount} sürüm`;contractTimelineMore.hidden=!payload.hasMore;contractTimelineMore.disabled=!payload.hasMore;contractTimelineMore.dataset.cursor=payload.nextCursor||'';};
  const resetContract=message=>{
    contractRulesVersionId=null;contractContent.hidden=true;resetContractRules();resetContractComparison();resetContractTimeline();setContractState('EMPTY',message||'Henüz yetkili sözleşme isteği yapılmadı.');
  };
  const renderCurrentContract=payload=>{
    if(payload===null){resetContract('Seçili şube için aktif veya hazırlanan sözleşme bulunamadı.');return;}
    if(!payload||!uuidPattern.test(payload.contractId||'')||typeof payload.contractCode!=='string'||typeof payload.status!=='string') throw new Error('INVALID_FINANCE_CONTRACT');
    const active=payload.activeVersion,pending=payload.pendingVersion;
    if(active&&(!uuidPattern.test(active.versionId||'')||!Number.isInteger(active.versionNo)||!/^[A-Z]{3}$/.test(active.currencyCode||''))) throw new Error('INVALID_FINANCE_CONTRACT_VERSION');
    if(pending&&(!uuidPattern.test(pending.versionId||'')||!Number.isInteger(pending.versionNo))) throw new Error('INVALID_FINANCE_CONTRACT_VERSION');
    contractCode.textContent=payload.contractCode;contractStatus.textContent=payload.status;
    contractActive.textContent=active?`v${active.versionNo} · ${active.currencyCode}`:'Aktif sürüm yok';contractValidity.textContent=active?`${active.validFrom} – ${active.validTo||'süresiz'}`:'Geçerlilik bulunamadı';
    contractPending.textContent=pending?`v${pending.versionNo}`:'Bekleyen sürüm yok';contractPendingStatus.textContent=pending?.status||'—';
    contractHash.textContent=active?.contentHash&&/^[0-9a-f]{64}$/i.test(active.contentHash)?`${active.contentHash.slice(0,12)}…${active.contentHash.slice(-8)}`:'Kanıt hash yok';setContractState('READY');
  };
  const setContractRulesVersion=value=>{contractRulesVersionId=uuidPattern.test(value||'')?value:null;};
  const getContractRulesVersion=()=>contractRulesVersionId;
  const renderContractRulesPage=(payload,{append=false}={})=>{
    if(payload===null){resetContractRules('Seçili sürüm bu şube kapsamında bulunamadı.');return;}
    if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||uuidPattern.test(payload.nextCursor))) throw new Error('INVALID_FINANCE_CONTRACT_RULES');
    if(!append){contractRuleItems.clear();resetContractRuleDetail();}
    const rows=payload.items.map(item=>{
      if(!item||!uuidPattern.test(item.feeRuleId||'')||typeof item.feeCode!=='string'||typeof item.category!=='string'||typeof item.status!=='string'||typeof item.configurationStatus!=='string') throw new Error('INVALID_FINANCE_CONTRACT_RULE');
      const descriptor=document.createElement('td');const fee=document.createElement('div');fee.className='finance-statement-fee';fee.textContent=item.feeCode;const rule=document.createElement('small');rule.textContent=`${item.ruleCode} · ${item.name}`;descriptor.append(fee,rule);
      const calculation=item.calculation;let calculationText='Yapılandırılmadı';if(calculation){const parameter=calculation.rate??calculation.percentage??calculation.amount??calculation.value;calculationText=`${calculation.method}${parameter!==undefined?` · ${parameter}`:''}`;}
      contractRuleItems.set(item.feeRuleId,Object.freeze({...item}));const badge=document.createElement('span');badge.className=`finance-statement-status is-${item.status.toLowerCase()}`;badge.textContent=item.status;const detailButton=document.createElement('button');detailButton.type='button';detailButton.className='finance-inline-action';detailButton.dataset.financeContractRuleId=item.feeRuleId;detailButton.textContent='Detayı aç';
      const tr=document.createElement('tr');tr.append(descriptor,cell(item.category),cell(item.triggerEventType||'—'),cell(calculationText),cell(calculation?.priceIncludesTax===true?'Evet':calculation?.priceIncludesTax===false?'Hayır':'—'),(()=>{const td=document.createElement('td');td.append(badge,detailButton);return td;})());return tr;
    });
    if(!append){contractRulesBody.replaceChildren();contractRuleRowCount=0;}contractRulesBody.append(...rows);contractRuleRowCount+=rows.length;contractRulesCount.textContent=`${contractRuleRowCount} kural`;contractRulesTable.hidden=contractRuleRowCount===0;contractMoreButton.hidden=!payload.hasMore;contractMoreButton.disabled=!payload.hasMore;contractMoreButton.dataset.cursor=payload.nextCursor||'';setContractRulesState(contractRuleRowCount?'READY':'EMPTY',contractRuleRowCount?'Kurallar yüklendi.':'Seçili filtrelerde kural bulunamadı.');
  };
  const getContractRuleFilters=()=>Object.freeze({status:contractRuleStatus.value||undefined,limit:25});

  const setPaymentsState = (next, message) => {
    if (!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_PAYMENTS_STATE');
    payments.dataset.state = next;
    paymentsState.textContent = message || ({EMPTY:'Ödeme bulunamadı.',LOADING:'Yetkili ödemeler yükleniyor…',READY:'Ödemeler yüklendi.',ERROR:'Ödeme listesi yüklenemedi.'})[next];
    paymentsState.hidden = next === 'READY' && paymentRowCount > 0;
    paymentsRefreshButton.disabled = !scopeReady || next === 'LOADING';
    paymentsStatus.disabled = !scopeReady || next === 'LOADING';
    paymentsFrom.disabled = !scopeReady || next === 'LOADING';
    paymentsTo.disabled = !scopeReady || next === 'LOADING';
    if (next === 'LOADING') paymentsMoreButton.disabled = true;
  };
  const resetPayments = message => {
    paymentsBody.replaceChildren();
    paymentRowCount = 0;
    paymentsTable.hidden = true;
    paymentsMoreButton.hidden = true;
    paymentsMoreButton.disabled = true;
    paymentsCount.textContent = '0 kayıt';
    resetPayment();
    setPaymentsState('EMPTY', message || 'Henüz yetkili ödeme isteği yapılmadı.');
  };
  const renderPaymentsPage = (payload, {append = false} = {}) => {
    if (!payload || !Array.isArray(payload.items) || typeof payload.hasMore !== 'boolean' || !(payload.nextCursor == null || typeof payload.nextCursor === 'string')) throw new Error('INVALID_FINANCE_PAYMENTS');
    const rows = payload.items.map(item => {
      const currency=item?.amount?.currency;
      if (!item || !uuidPattern.test(item.paymentId || '') || !paymentStatuses[item.status] || !/^\d{4}-\d{2}-\d{2}$/.test(item.paymentDate || '') || !item.amount || !item.verifiedAmount || !item.allocatedAmount || !item.unallocatedAmount || ![item.verifiedAmount,item.allocatedAmount,item.unallocatedAmount].every(value=>value.currency===currency) || !Number.isInteger(item.allocationCount)) throw new Error('INVALID_FINANCE_PAYMENT_ITEM');
      const tr=document.createElement('tr');
      const reference=document.createElement('td'); const strong=document.createElement('div'); strong.className='finance-statement-fee'; strong.textContent=item.externalReference || item.paymentId; const method=document.createElement('small'); method.textContent=item.paymentMethodCode || 'Belirtilmedi'; reference.append(strong,method);
      const allocation=document.createElement('td'); allocation.append(document.createTextNode(amount(item.allocatedAmount.amount,currency))); const remaining=document.createElement('small'); remaining.textContent=`Kalan: ${amount(item.unallocatedAmount.amount,currency)} · ${item.allocationCount} tahsis`; allocation.append(document.createElement('br'),remaining);
      const action=document.createElement('td'); const badge=document.createElement('span'); badge.className=`finance-statement-status is-${item.status.toLowerCase()}`; badge.textContent=paymentStatuses[item.status]; const button=document.createElement('button'); button.type='button'; button.className='finance-inline-action'; button.dataset.financePaymentId=item.paymentId; button.textContent='Detayı aç'; action.append(badge,button);
      tr.append(cell(new Intl.DateTimeFormat('tr-TR').format(new Date(`${item.paymentDate}T00:00:00Z`))),reference,cell(amount(item.amount.amount,currency)),cell(amount(item.verifiedAmount.amount,currency)),allocation,action);
      return tr;
    });
    if (!append) { paymentsBody.replaceChildren(); paymentRowCount=0; resetPayment(); }
    paymentsBody.append(...rows); paymentRowCount+=rows.length; paymentsCount.textContent=`${paymentRowCount} kayıt`; paymentsTable.hidden=paymentRowCount===0;
    paymentsMoreButton.hidden=!payload.hasMore; paymentsMoreButton.disabled=!payload.hasMore; paymentsMoreButton.dataset.cursor=payload.nextCursor || '';
    setPaymentsState(paymentRowCount?'READY':'EMPTY',paymentRowCount?'Ödemeler yüklendi.':'Seçili filtrelerde ödeme bulunamadı.');
  };
  const getPaymentFilters = () => Object.freeze({from:paymentsFrom.value||undefined,to:paymentsTo.value||undefined,status:paymentsStatus.value || undefined,limit:25});

  const setRefundsState=(next,message)=>{
    if(!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_REFUNDS_STATE');
    refunds.dataset.state=next;refundsState.textContent=message||({EMPTY:'İade bulunamadı.',LOADING:'Yetkili iadeler yükleniyor…',READY:'İadeler yüklendi.',ERROR:'İade listesi yüklenemedi.'})[next];refundsState.hidden=next==='READY'&&refundRowCount>0;refundsRefreshButton.disabled=!scopeReady||next==='LOADING';refundsFrom.disabled=!scopeReady||next==='LOADING';refundsTo.disabled=!scopeReady||next==='LOADING';if(next==='LOADING') refundsMoreButton.disabled=true;
  };
  const resetRefunds=message=>{refundsBody.replaceChildren();refundRowCount=0;refundsTable.hidden=true;refundsMoreButton.hidden=true;refundsMoreButton.disabled=true;refundsCount.textContent='0 kayıt';resetRefund();setRefundsState('EMPTY',message||'Henüz yetkili iade isteği yapılmadı.');};
  const renderRefundsPage=(payload,{append=false}={})=>{
    if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string')) throw new Error('INVALID_FINANCE_REFUNDS');
    const rows=payload.items.map(item=>{
      if(!item||!uuidPattern.test(item.reversalAccrualId||'')||!uuidPattern.test(item.refundId||'')||!uuidPattern.test(item.originalRoyaltyAccrualId||'')||!uuidPattern.test(item.originalPeriodId||'')||!uuidPattern.test(item.postingPeriodId||'')||!/^[A-Z]{3}$/.test(item.currency||'')||!/^\d{4}-\d{2}-\d{2}$/.test(item.refundBusinessDate||'')) throw new Error('INVALID_FINANCE_REFUND_ITEM');
      const identity=document.createElement('td');const date=document.createElement('div');date.className='finance-statement-fee';date.textContent=new Intl.DateTimeFormat('tr-TR').format(new Date(`${item.refundBusinessDate}T00:00:00Z`));const id=document.createElement('small');id.textContent=item.refundId;identity.append(date,id);
      const action=document.createElement('td');const provenance=document.createElement('small');provenance.textContent=item.originalPeriodId===item.postingPeriodId?'Aynı dönem':'Kilitli ilk dönem → açık kayıt dönemi';const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeRefundAccrualId=item.reversalAccrualId;button.textContent='İade izini aç';action.append(provenance,button);
      const tr=document.createElement('tr');tr.append(identity,cell(item.originalCollectionId||'—'),cell(amount(item.refundedGrossAmount,item.currency)),cell(amount(item.originalRoyaltyAmount,item.currency)),cell(amount(item.royaltyReversalAmount,item.currency)),action);return tr;
    });
    if(!append){refundsBody.replaceChildren();refundRowCount=0;resetRefund();}refundsBody.append(...rows);refundRowCount+=rows.length;refundsCount.textContent=`${refundRowCount} kayıt`;refundsTable.hidden=refundRowCount===0;refundsMoreButton.hidden=!payload.hasMore;refundsMoreButton.disabled=!payload.hasMore;refundsMoreButton.dataset.cursor=payload.nextCursor||'';setRefundsState(refundRowCount?'READY':'EMPTY',refundRowCount?'İadeler yüklendi.':'Seçili kapsamda kesinleşmiş iade bulunamadı.');
  };
  const getRefundFilters=()=>Object.freeze({from:refundsFrom.value||undefined,to:refundsTo.value||undefined,limit:25});
  const usageStatuses=Object.freeze({CHARGED:'Ücretlendirildi',NOT_CHARGED:'Ücretlendirilmedi',FAILED:'Hatalı'});
  const setServiceUsagesState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_SERVICE_USAGES_STATE');serviceUsages.dataset.state=next;serviceUsagesState.textContent=message||({EMPTY:'Kullanım bulunamadı.',LOADING:'Yetkili kullanımlar yükleniyor…',READY:'Kullanımlar yüklendi.',ERROR:'Kullanım listesi yüklenemedi.'})[next];serviceUsagesState.hidden=next==='READY'&&serviceUsageRowCount>0;serviceUsagesRefreshButton.disabled=!scopeReady||next==='LOADING';serviceUsagesExportButton.disabled=!scopeReady||next==='LOADING';serviceUsagesFrom.disabled=!scopeReady||next==='LOADING';serviceUsagesTo.disabled=!scopeReady||next==='LOADING';serviceUsagesFamily.disabled=!scopeReady||next==='LOADING';serviceUsagesChargeStatus.disabled=!scopeReady||next==='LOADING';if(next==='LOADING')serviceUsagesMoreButton.disabled=true;};
  const resetServiceUsages=message=>{serviceUsagesBody.replaceChildren();serviceUsageRowCount=0;serviceUsagesTable.hidden=true;serviceUsagesMoreButton.hidden=true;serviceUsagesMoreButton.disabled=true;serviceUsagesCount.textContent='0 kayıt';setServiceUsagesState('EMPTY',message||'Henüz yetkili kullanım isteği yapılmadı.');};
  const renderServiceUsagesPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string')) throw new Error('INVALID_SERVICE_USAGES');const rows=payload.items.map(item=>{if(!item||!uuidPattern.test(item.sourceEventId||'')||!uuidPattern.test(item.usageId||'')||!['QUERY','EXTERNAL_SERVICE'].includes(item.feeFamily)||!usageStatuses[item.chargeStatus]||!/^\d{4}-\d{2}-\d{2}$/.test(item.businessDate||'')||typeof item.freeEntitlementApplied!=='boolean'||typeof item.technicalRepeat!=='boolean') throw new Error('INVALID_SERVICE_USAGE_ITEM');const descriptor=document.createElement('td');const date=document.createElement('div');date.className='finance-statement-fee';date.textContent=new Intl.DateTimeFormat('tr-TR').format(new Date(`${item.businessDate}T00:00:00Z`));const ref=document.createElement('small');ref.textContent=item.externalReference||item.usageId;descriptor.append(date,ref);const service=document.createElement('td');const serviceName=document.createElement('div');serviceName.className='finance-statement-fee';serviceName.textContent=item.serviceCode||item.feeFamily;const provider=document.createElement('small');provider.textContent=item.providerCode||item.sourceSystem;service.append(serviceName,provider);const status=document.createElement('td');const badge=document.createElement('span');badge.className=`finance-statement-status is-${item.chargeStatus.toLowerCase()}`;badge.textContent=usageStatuses[item.chargeStatus];status.append(badge);if(item.freeEntitlementApplied)status.append(document.createElement('br'),document.createTextNode('Ücretsiz hak'));if(item.technicalRepeat)status.append(document.createElement('br'),document.createTextNode('Teknik tekrar'));if(item.accrualId){const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeAccrualId=item.accrualId;button.textContent='Tahakkuku aç';status.append(button);}const show=value=>value==null||!item.currency?'—':amount(value,item.currency);const tr=document.createElement('tr');tr.append(descriptor,service,cell(show(item.providerCostAmount)),cell(show(item.dealerPriceAmount)),cell(show(item.marginAmount)),status);return tr;});if(!append){serviceUsagesBody.replaceChildren();serviceUsageRowCount=0;}serviceUsagesBody.append(...rows);serviceUsageRowCount+=rows.length;serviceUsagesCount.textContent=`${serviceUsageRowCount} kayıt`;serviceUsagesTable.hidden=serviceUsageRowCount===0;serviceUsagesMoreButton.hidden=!payload.hasMore;serviceUsagesMoreButton.disabled=!payload.hasMore;serviceUsagesMoreButton.dataset.cursor=payload.nextCursor||'';setServiceUsagesState(serviceUsageRowCount?'READY':'EMPTY',serviceUsageRowCount?'Kullanımlar yüklendi.':'Seçili filtrelerde kullanım bulunamadı.');};
  const getServiceUsageFilters=()=>Object.freeze({from:serviceUsagesFrom.value||undefined,to:serviceUsagesTo.value||undefined,family:serviceUsagesFamily.value||undefined,chargeStatus:serviceUsagesChargeStatus.value||undefined,limit:25});
  const expenseStatuses=Object.freeze({DRAFT:'Taslak',CALCULATED:'Hesaplandı',PENDING_APPROVAL:'Onay bekliyor',APPROVED:'Onaylandı',POSTED:'Kaydedildi',REVERSED:'Ters kayıt'});
  const setExpensesState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_EXPENSES_STATE');expenses.dataset.state=next;expensesState.textContent=message||({EMPTY:'Masraf bulunamadı.',LOADING:'Masraflar yükleniyor…',READY:'Masraflar yüklendi.',ERROR:'Masraf listesi yüklenemedi.'})[next];expensesState.hidden=next==='READY'&&expenseRowCount>0;expensesRefreshButton.disabled=!scopeReady||next==='LOADING';expensesFrom.disabled=!scopeReady||next==='LOADING';expensesTo.disabled=!scopeReady||next==='LOADING';expensesStatus.disabled=!scopeReady||next==='LOADING';if(next==='LOADING')expensesMoreButton.disabled=true;};
  const resetExpense=()=>{expenseDetail.dataset.state='EMPTY';expenseDetail.hidden=activeScreenId!=='SCR-10';expenseState.hidden=false;expenseState.textContent='Masraf listesinden bir kayıt seçin.';expenseContent.hidden=true;expenseShares.replaceChildren();expenseProvenance.replaceChildren();};
  const resetExpenses=message=>{expensesBody.replaceChildren();expenseRowCount=0;expensesTable.hidden=true;expensesMoreButton.hidden=true;expensesMoreButton.disabled=true;expensesCount.textContent='0 kayıt';resetExpense();setExpensesState('EMPTY',message||'Henüz genel merkez masraf isteği yapılmadı.');};
  const renderExpensesPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string'))throw new Error('INVALID_EXPENSES');const rows=payload.items.map(item=>{if(!item||!uuidPattern.test(item.expenseId||'')||!expenseStatuses[item.status]||!/^\d{4}-\d{2}-\d{2}$/.test(item.expenseDate||'')||!/^[A-Z]{3}$/.test(item.currency||'')||!Number.isInteger(item.shareCount)||!Number.isInteger(item.documentCount))throw new Error('INVALID_EXPENSE_ITEM');const ref=document.createElement('td');const date=document.createElement('div');date.className='finance-statement-fee';date.textContent=new Intl.DateTimeFormat('tr-TR').format(new Date(`${item.expenseDate}T00:00:00Z`));const supplier=document.createElement('small');supplier.textContent=item.supplierReference;ref.append(date,supplier);const basis=document.createElement('td');basis.textContent=item.contractualBasisReference;const fee=document.createElement('small');fee.textContent=`${item.feeCode} · ${item.feeName}`;basis.append(document.createElement('br'),fee);const action=document.createElement('td');const badge=document.createElement('span');badge.className=`finance-statement-status is-${item.status.toLowerCase()}`;badge.textContent=expenseStatuses[item.status];const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeExpenseId=item.expenseId;button.textContent='Dağılımı aç';action.append(badge,button);const tr=document.createElement('tr');tr.append(ref,basis,cell(amount(item.sourceAmount,item.currency)),cell(amount(item.distributableAmount,item.currency)),cell(`${item.shareCount} pay · ${item.documentCount} belge`),action);return tr;});if(!append){expensesBody.replaceChildren();expenseRowCount=0;resetExpense();}expensesBody.append(...rows);expenseRowCount+=rows.length;expensesCount.textContent=`${expenseRowCount} kayıt`;expensesTable.hidden=expenseRowCount===0;expensesMoreButton.hidden=!payload.hasMore;expensesMoreButton.disabled=!payload.hasMore;expensesMoreButton.dataset.cursor=payload.nextCursor||'';setExpensesState(expenseRowCount?'READY':'EMPTY',expenseRowCount?'Masraflar yüklendi.':'Seçili filtrelerde masraf bulunamadı.');};
  const getExpenseFilters=()=>Object.freeze({from:expensesFrom.value||undefined,to:expensesTo.value||undefined,status:expensesStatus.value||undefined,limit:25});
  const setExpenseState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_EXPENSE_STATE');expenseDetail.hidden=false;expenseDetail.dataset.state=next;expenseState.hidden=next==='READY';expenseState.textContent=message||({EMPTY:'Masraf seçilmedi.',LOADING:'Masraf dağılımı yükleniyor…',READY:'Masraf dağılımı yüklendi.',ERROR:'Masraf dağılımı yüklenemedi.'})[next];expenseContent.hidden=next!=='READY';};
  const renderExpenseDetail=payload=>{if(!payload||!uuidPattern.test(payload.expenseId||'')||!expenseStatuses[payload.status]||!/^[A-Z]{3}$/.test(payload.currency||'')||!payload.source||!payload.distributable||!Array.isArray(payload.shares)||!Array.isArray(payload.documents))throw new Error('INVALID_EXPENSE_DETAIL');const rows=payload.shares.map(share=>{if(!uuidPattern.test(share.shareId||'')||!uuidPattern.test(share.dealerAccountId||'')||!uuidPattern.test(share.branchId||'')||share.currency!==payload.currency)throw new Error('INVALID_EXPENSE_SHARE');const descriptor=document.createElement('td');const dealer=document.createElement('div');dealer.className='finance-statement-fee';dealer.textContent=`${share.dealerCode} · ${share.dealerName}`;const branch=document.createElement('small');branch.textContent=share.branchCode;descriptor.append(dealer,branch);const amountCell=document.createElement('td');amountCell.textContent=amount(share.shareAmount,share.currency);if(share.accrualId){const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeAccrualId=share.accrualId;button.textContent='Tahakkuku aç';amountCell.append(button);}const tr=document.createElement('tr');tr.append(descriptor,cell(share.allocationMethod),cell(share.allocationRate),cell(`${amount(share.netAmount,share.currency)} / ${amount(share.taxAmount,share.currency)}`),amountCell);return tr;});expenseSource.textContent=money({...payload.source,currency:payload.currency});expenseReference.textContent=payload.supplierReference;expenseDistributable.textContent=money({...payload.distributable,currency:payload.currency});expenseStatus.textContent=expenseStatuses[payload.status];expenseApproval.textContent=payload.approval?.status||'Onay kaydı yok';expenseDocuments.textContent=`${payload.documents.length} belge`;expenseShares.replaceChildren(...rows);const provenance=[`Dayanak: ${payload.contractualBasisReference}`,`Fiş: ${payload.journalEntryId||'Henüz yok'}`,`Ters fiş: ${payload.reversalJournalEntryId||'Yok'}`,`Kanıt hash: ${payload.evidenceHash}`];expenseProvenance.replaceChildren(...provenance.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));setExpenseState('READY');};
  const disputeStatuses=Object.freeze({DRAFT:'Taslak',SUBMITTED:'Gönderildi',UNDER_REVIEW:'İncelemede',ACCEPTED:'Kabul',PARTIALLY_ACCEPTED:'Kısmi kabul',REJECTED:'Reddedildi',CLOSED:'Kapalı'});
  const setDisputesState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_DISPUTES_STATE');disputes.dataset.state=next;disputesState.textContent=message||({EMPTY:'İtiraz bulunamadı.',LOADING:'İtirazlar yükleniyor…',READY:'İtirazlar yüklendi.',ERROR:'İtiraz listesi yüklenemedi.'})[next];disputesState.hidden=next==='READY'&&disputeRowCount>0;disputesRefreshButton.disabled=!scopeReady||next==='LOADING';disputesStatus.disabled=!scopeReady||next==='LOADING';if(next==='LOADING')disputesMoreButton.disabled=true;};
  const resetDispute=()=>{disputeDetail.dataset.state='EMPTY';disputeDetail.hidden=activeScreenId!=='SCR-11';disputeState.hidden=false;disputeState.textContent='İtiraz listesinden bir dosya seçin.';disputeContent.hidden=true;disputeEvidence.replaceChildren();disputeProvenance.replaceChildren();};
  const resetDisputes=message=>{disputesBody.replaceChildren();disputeRowCount=0;disputesTable.hidden=true;disputesMoreButton.hidden=true;disputesMoreButton.disabled=true;disputesCount.textContent='0 kayıt';resetDispute();setDisputesState('EMPTY',message||'Henüz yetkili itiraz isteği yapılmadı.');};
  const renderDisputesPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string'))throw new Error('INVALID_DISPUTES');const rows=payload.items.map(item=>{if(!item||!uuidPattern.test(item.disputeId||'')||!uuidPattern.test(item.openItemId||'')||!disputeStatuses[item.status]||!/^[A-Z]{3}$/.test(item.currency||'')||!Number.isInteger(item.documentCount)||typeof item.createdAtUtc!=='string')throw new Error('INVALID_DISPUTE_ITEM');const descriptor=document.createElement('td');const caseNo=document.createElement('div');caseNo.className='finance-statement-fee';caseNo.textContent=item.caseNo;const opened=document.createElement('small');opened.textContent=new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAtUtc));descriptor.append(caseNo,opened);const fee=document.createElement('td');fee.textContent=item.feeCode;const reason=document.createElement('small');reason.textContent=item.reasonCode;fee.append(document.createElement('br'),reason);const action=document.createElement('td');const badge=document.createElement('span');badge.className=`finance-statement-status is-${item.status.toLowerCase()}`;badge.textContent=disputeStatuses[item.status];const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeDisputeId=item.disputeId;button.textContent='Dosyayı aç';action.append(badge,button);const tr=document.createElement('tr');tr.append(descriptor,fee,cell(amount(item.disputedAmount,item.currency)),cell(item.acceptedAmount==null?'—':amount(item.acceptedAmount,item.currency)),cell(`${item.documentCount} belge`),action);return tr;});if(!append){disputesBody.replaceChildren();disputeRowCount=0;resetDispute();}disputesBody.append(...rows);disputeRowCount+=rows.length;disputesCount.textContent=`${disputeRowCount} kayıt`;disputesTable.hidden=disputeRowCount===0;disputesMoreButton.hidden=!payload.hasMore;disputesMoreButton.disabled=!payload.hasMore;disputesMoreButton.dataset.cursor=payload.nextCursor||'';setDisputesState(disputeRowCount?'READY':'EMPTY',disputeRowCount?'İtirazlar yüklendi.':'Seçili filtrelerde itiraz bulunamadı.');};
  const getDisputeFilters=()=>Object.freeze({status:disputesStatus.value||undefined,limit:25});
  const setDisputeState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_DISPUTE_STATE');disputeDetail.hidden=false;disputeDetail.dataset.state=next;disputeState.hidden=next==='READY';disputeState.textContent=message||({EMPTY:'İtiraz seçilmedi.',LOADING:'İtiraz dosyası yükleniyor…',READY:'İtiraz dosyası yüklendi.',ERROR:'İtiraz dosyası yüklenemedi.'})[next];disputeContent.hidden=next!=='READY';};
  const renderDisputeDetail=payload=>{const amounts=payload?.amounts;const target=payload?.target;if(!payload||!uuidPattern.test(payload.disputeId||'')||!disputeStatuses[payload.status]||!amounts||!/^[A-Z]{3}$/.test(amounts.currency||'')||!target||!uuidPattern.test(target.openItemId||'')||!Array.isArray(payload.documents))throw new Error('INVALID_DISPUTE_DETAIL');const rows=payload.documents.map(evidenceDocument=>{if(!uuidPattern.test(evidenceDocument.documentId||'')||typeof evidenceDocument.documentType!=='string'||typeof evidenceDocument.contentHash!=='string')throw new Error('INVALID_DISPUTE_DOCUMENT');const tr=document.createElement('tr');tr.append(cell(evidenceDocument.documentType),cell(evidenceDocument.externalDocumentId||evidenceDocument.documentId),cell(evidenceDocument.contentHash));return tr;});if(!rows.length){const tr=document.createElement('tr');const td=cell('Aktif kanıt belgesi yok');td.colSpan=3;tr.append(td);rows.push(tr);}disputeAmount.textContent=amount(amounts.disputedAmount,amounts.currency);disputeCase.textContent=payload.caseNo;disputeAccepted.textContent=amounts.acceptedAmount==null?'Karar bekliyor':amount(amounts.acceptedAmount,amounts.currency);disputeStatus.textContent=disputeStatuses[payload.status];disputeApproval.textContent=payload.approval?.status||'Onay kaydı yok';disputeDocuments.textContent=`${payload.documents.length} belge`;const provenance=[`Açık kalem: ${target.openItemId}`,`Tahakkuk: ${target.accrualId}`,`Karar gerekçesi: ${payload.decision?.reasonCode||'Henüz yok'}`,`Düzeltme fişi: ${payload.correctionJournal?.journalEntryId||'Henüz yok'}`,`Correlation: ${payload.correlationId}`];disputeProvenance.replaceChildren(...provenance.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));disputeEvidence.replaceChildren(...rows);setDisputeState('READY');window.dispatchEvent(new CustomEvent('ototr:finance-dispute-rendered',{detail:payload}));};
  const exportPackageStatuses=Object.freeze({DRAFT:'Taslak',READY:'Hazır',EXPORT_QUEUED:'Aktarım kuyruğunda',EXPORTED:'Aktarıldı',INVOICED:'Faturalandı',PARTIALLY_ACCEPTED:'Kısmi kabul',ACCEPTED:'Kabul edildi',REJECTED:'Reddedildi'});
  const setExportPackagesState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_EXPORT_PACKAGES_STATE');exportPackages.dataset.state=next;exportPackagesState.textContent=message||({EMPTY:'Paket bulunamadı.',LOADING:'Paketler yükleniyor…',READY:'Paketler yüklendi.',ERROR:'Paket listesi yüklenemedi.'})[next];exportPackagesState.hidden=next==='READY'&&exportPackageRowCount>0;exportPackagesRefreshButton.disabled=!scopeReady||next==='LOADING';exportPackagesType.disabled=!scopeReady||next==='LOADING';exportPackagesStatus.disabled=!scopeReady||next==='LOADING';if(next==='LOADING')exportPackagesMoreButton.disabled=true;};
  const resetExportPackage=()=>{exportPackageDetail.dataset.state='EMPTY';exportPackageDetail.hidden=activeScreenId!=='SCR-13';exportPackageState.hidden=false;exportPackageState.textContent='Paket listesinden bir kayıt seçin.';exportPackageContent.hidden=true;exportPackageRows.replaceChildren();exportPackageProvenance.replaceChildren();};
  const resetExportPackages=message=>{exportPackagesBody.replaceChildren();exportPackageRowCount=0;exportPackagesTable.hidden=true;exportPackagesMoreButton.hidden=true;exportPackagesMoreButton.disabled=true;exportPackagesCount.textContent='0 kayıt';resetExportPackage();setExportPackagesState('EMPTY',message||'Henüz genel merkez paket isteği yapılmadı.');};
  const renderExportPackagesPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string'))throw new Error('INVALID_EXPORT_PACKAGES');const rows=payload.items.map(item=>{if(!item||!uuidPattern.test(item.packageId||'')||!['BILLING','ACCOUNTING'].includes(item.packageType)||!exportPackageStatuses[item.status]||!/^[A-Z]{3}$/.test(item.currency||'')||!Number.isInteger(item.itemCount)||typeof item.createdAtUtc!=='string')throw new Error('INVALID_EXPORT_PACKAGE_ITEM');const descriptor=document.createElement('td');const batch=document.createElement('div');batch.className='finance-statement-fee';batch.textContent=item.batchNo;const created=document.createElement('small');created.textContent=new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAtUtc));descriptor.append(batch,created);const type=document.createElement('td');type.textContent=item.packageType==='BILLING'?'Faturalama':'Muhasebe';const mapping=document.createElement('small');mapping.textContent=item.mappingVersion||'Mapping bekliyor';type.append(document.createElement('br'),mapping);const action=document.createElement('td');const badge=document.createElement('span');badge.className=`finance-statement-status is-${item.status.toLowerCase()}`;badge.textContent=exportPackageStatuses[item.status];const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeExportPackageId=item.packageId;button.dataset.financeExportPackageType=item.packageType;button.textContent='Paketi aç';action.append(badge,button);const tr=document.createElement('tr');tr.append(descriptor,type,cell(amount(item.grossTotal,item.currency)),cell(`${item.itemCount} kayıt`),cell(item.externalStatus||'Harici sonuç yok'),action);return tr;});if(!append){exportPackagesBody.replaceChildren();exportPackageRowCount=0;resetExportPackage();}exportPackagesBody.append(...rows);exportPackageRowCount+=rows.length;exportPackagesCount.textContent=`${exportPackageRowCount} kayıt`;exportPackagesTable.hidden=exportPackageRowCount===0;exportPackagesMoreButton.hidden=!payload.hasMore;exportPackagesMoreButton.disabled=!payload.hasMore;exportPackagesMoreButton.dataset.cursor=payload.nextCursor||'';setExportPackagesState(exportPackageRowCount?'READY':'EMPTY',exportPackageRowCount?'Paketler yüklendi.':'Seçili filtrelerde paket bulunamadı.');};
  const getExportPackageFilters=()=>Object.freeze({packageType:exportPackagesType.value||undefined,status:exportPackagesStatus.value||undefined,limit:25});
  const setExportPackageState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_EXPORT_PACKAGE_STATE');exportPackageDetail.hidden=false;exportPackageDetail.dataset.state=next;exportPackageState.hidden=next==='READY';exportPackageState.textContent=message||({EMPTY:'Paket seçilmedi.',LOADING:'Paket detayı yükleniyor…',READY:'Paket detayı yüklendi.',ERROR:'Paket detayı yüklenemedi.'})[next];exportPackageContent.hidden=next!=='READY';};
  const renderExportPackageDetail=payload=>{if(!payload||!uuidPattern.test(payload.packageId||'')||!['BILLING','ACCOUNTING'].includes(payload.packageType)||!exportPackageStatuses[payload.status]||!/^[A-Z]{3}$/.test(payload.currency||''))throw new Error('INVALID_EXPORT_PACKAGE_DETAIL');const sourceRows=payload.packageType==='BILLING'?payload.items:payload.packages;if(!Array.isArray(sourceRows))throw new Error('INVALID_EXPORT_PACKAGE_ROWS');const rows=sourceRows.map(item=>{const id=item.itemId||item.packageId;if(!uuidPattern.test(id||''))throw new Error('INVALID_EXPORT_PACKAGE_ROW');const scope=item.accrualId||`${item.dealerAccountId||'—'} / ${item.branchId||'—'}`;const total=item.grossAmount||item.debitAmount;const tr=document.createElement('tr');tr.append(cell(id),cell(scope),cell(amount(total,payload.currency)),cell(item.status));return tr;});const total=payload.packageType==='BILLING'?payload.totals?.grossAmount:payload.totals?.debitAmount;if(typeof total!=='string')throw new Error('INVALID_EXPORT_PACKAGE_TOTAL');exportPackageTotal.textContent=amount(total,payload.currency);exportPackageBatch.textContent=`${payload.packageType} · ${payload.batchNo}`;exportPackageStatus.textContent=exportPackageStatuses[payload.status];exportPackageAdapter.textContent=`${payload.targetAdapterCode||'Adaptör bekliyor'} · ${payload.mappingVersion||'Mapping bekliyor'}`;exportPackageExternal.textContent=payload.packageType==='BILLING'?(payload.externalInvoice?.status||'Fatura bekliyor'):(payload.externalBatchId||'Aktarım bekliyor');exportPackageItems.textContent=`${rows.length} alt kayıt`;exportPackageRows.replaceChildren(...rows);const provenance=[`Dönem: ${payload.financePeriodId}`,`İçerik hash: ${payload.contentHash}`,`Export job: ${payload.exportJobId||'Henüz yok'}`,`Correlation: ${payload.correlationId}`];exportPackageProvenance.replaceChildren(...provenance.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));setExportPackageState('READY');};
  const integrationErrorStatuses=Object.freeze({RETRYABLE:'Yeniden denenebilir',ACTION_REQUIRED:'Aksiyon gerekli',RESOLVED:'Çözüldü',IGNORED:'Onayla yok sayıldı'});
  const setIntegrationErrorsState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_INTEGRATION_ERRORS_STATE');integrationErrors.dataset.state=next;integrationErrorsState.textContent=message||({EMPTY:'Hata bulunamadı.',LOADING:'Hata kuyruğu yükleniyor…',READY:'Hata kuyruğu yüklendi.',ERROR:'Hata kuyruğu yüklenemedi.'})[next];integrationErrorsState.hidden=next==='READY'&&integrationErrorRowCount>0;integrationErrorsRefreshButton.disabled=!scopeReady||next==='LOADING';integrationErrorsStatus.disabled=!scopeReady||next==='LOADING';integrationErrorsSource.disabled=!scopeReady||next==='LOADING';if(next==='LOADING')integrationErrorsMoreButton.disabled=true;};
  const resetIntegrationError=()=>{integrationErrorDetail.dataset.state='EMPTY';delete integrationErrorDetail.dataset.errorId;delete integrationErrorDetail.dataset.errorVersion;delete integrationErrorDetail.dataset.retryable;integrationErrorDetail.hidden=activeScreenId!=='SCR-14';integrationErrorState.hidden=false;integrationErrorState.textContent='Hata kuyruğundan bir kayıt seçin.';integrationErrorContent.hidden=true;integrationErrorTrace.replaceChildren();integrationErrorProvenance.replaceChildren();window.dispatchEvent(new CustomEvent('ototr:finance-integration-error-rendered'));};
  const resetIntegrationErrors=message=>{integrationErrorsBody.replaceChildren();integrationErrorRowCount=0;integrationErrorsTable.hidden=true;integrationErrorsMoreButton.hidden=true;integrationErrorsMoreButton.disabled=true;integrationErrorsCount.textContent='0 kayıt';resetIntegrationError();setIntegrationErrorsState('EMPTY',message||'Henüz yetkili hata kuyruğu isteği yapılmadı.');};
  const renderIntegrationErrorsPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||!(payload.nextCursor==null||typeof payload.nextCursor==='string'))throw new Error('INVALID_INTEGRATION_ERRORS');const rows=payload.items.map(item=>{if(!item||!uuidPattern.test(item.errorId||'')||!integrationErrorStatuses[item.status]||!Number.isInteger(item.retryCount)||typeof item.occurredAtUtc!=='string'||!uuidPattern.test(item.correlationId||''))throw new Error('INVALID_INTEGRATION_ERROR_ITEM');const action=document.createElement('td');const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeIntegrationErrorId=item.errorId;button.textContent='Güvenli detayı aç';action.append(button);const tr=document.createElement('tr');tr.append(cell(`${item.sourceSystem} / ${item.safeErrorCode}`),cell(integrationErrorStatuses[item.status]),cell(String(item.retryCount)),cell(new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.occurredAtUtc))),cell(item.correlationId),action);return tr;});if(!append){integrationErrorsBody.replaceChildren();integrationErrorRowCount=0;resetIntegrationError();}integrationErrorsBody.append(...rows);integrationErrorRowCount+=rows.length;integrationErrorsCount.textContent=`${integrationErrorRowCount} kayıt`;integrationErrorsTable.hidden=integrationErrorRowCount===0;integrationErrorsMoreButton.hidden=!payload.hasMore;integrationErrorsMoreButton.disabled=!payload.hasMore;integrationErrorsMoreButton.dataset.cursor=payload.nextCursor||'';setIntegrationErrorsState(integrationErrorRowCount?'READY':'EMPTY',integrationErrorRowCount?'Hata kuyruğu yüklendi.':'Seçili filtrelerde hata bulunamadı.');};
  const getIntegrationErrorFilters=()=>Object.freeze({status:integrationErrorsStatus.value||undefined,sourceSystem:integrationErrorsSource.value||undefined,limit:25});
  const setIntegrationErrorState=(next,message)=>{if(!['EMPTY','LOADING','READY','ERROR'].includes(next))throw new Error('INVALID_INTEGRATION_ERROR_STATE');integrationErrorDetail.hidden=false;integrationErrorDetail.dataset.state=next;integrationErrorState.hidden=next==='READY';integrationErrorState.textContent=message||({EMPTY:'Hata seçilmedi.',LOADING:'Güvenli hata detayı yükleniyor…',READY:'Güvenli hata detayı yüklendi.',ERROR:'Hata detayı yüklenemedi.'})[next];integrationErrorContent.hidden=next!=='READY';};
  const renderIntegrationErrorDetail=payload=>{if(!payload||!uuidPattern.test(payload.errorId||'')||!integrationErrorStatuses[payload.status]||!Number.isInteger(payload.retryCount)||!Number.isInteger(payload.version)||!Array.isArray(payload.trace)||!payload.safeDetail||typeof payload.safeDetail!=='object'||uuidPattern.test(payload.correlationId||'')===false)throw new Error('INVALID_INTEGRATION_ERROR_DETAIL');const forbidden=JSON.stringify(payload).toLowerCase();if(forbidden.includes('payload')||forbidden.includes('dealeraccountid')||forbidden.includes('branchid')||forbidden.includes('secret'))throw new Error('UNSAFE_INTEGRATION_ERROR_DETAIL');const rows=payload.trace.map(item=>{if(!['INBOX','OUTBOX'].includes(item.direction)||typeof item.occurredAtUtc!=='string')throw new Error('INVALID_INTEGRATION_TRACE');const safeMetadata=item.direction==='INBOX'?`Şema ${item.schemaVersion}`:`${item.eventType} · Deneme ${item.attemptCount??0} · ${item.safeErrorCode||'Kod yok'}`;const tr=document.createElement('tr');tr.append(cell(new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.occurredAtUtc))),cell(`${item.direction} / ${item.system}`),cell(item.status),cell(safeMetadata));return tr;});integrationErrorDetail.dataset.errorId=payload.errorId;integrationErrorDetail.dataset.errorVersion=String(payload.version);integrationErrorDetail.dataset.retryable=String(payload.retryable===true&&payload.status==='RETRYABLE');integrationErrorCode.textContent=payload.safeErrorCode;integrationErrorSource.textContent=`${payload.sourceSystem} · ${payload.errorClass}`;integrationErrorStatus.textContent=integrationErrorStatuses[payload.status];integrationErrorRetry.textContent=`${payload.retryCount} tekrar · ${payload.retryable?'Tekrar denenebilir':'Operatör aksiyonu gerekli'}`;integrationErrorMessage.textContent=payload.safeDetail.safeMessage||'Güvenli açıklama sağlanmadı';integrationErrorTrace.replaceChildren(...rows);integrationErrorProvenance.replaceChildren(...[`Correlation: ${payload.correlationId}`,`Sürüm: ${payload.version}`,`Ham payload ve kapsam kimlikleri gösterilmez`].map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));setIntegrationErrorState('READY');window.dispatchEvent(new CustomEvent('ototr:finance-integration-error-rendered'));};
  const approvalStatuses=Object.freeze({PENDING:'Bekliyor',APPROVED:'Onaylandı',REJECTED:'Reddedildi',CANCELLED:'İptal'});
  const setApprovalsState=(next,message)=>{approvals.dataset.state=next;approvalsState.textContent=message||'Onay listesi güncellendi.';approvalsState.hidden=next==='READY'&&approvalRowCount>0;approvalsRefreshButton.disabled=!scopeReady||next==='LOADING';approvalsStatus.disabled=!scopeReady||next==='LOADING';};
  const resetApproval=()=>{selectedApproval=null;approvalDetail.hidden=activeScreenId!=='SCR-15';approvalDetailState.hidden=false;approvalDetailState.textContent='Onay listesinden bir kayıt seçin.';approvalContent.hidden=true;approvalSteps.replaceChildren();approvalProvenance.replaceChildren();approvalActionButton.disabled=true;approvalEvidenceButton.disabled=true;};
  const resetApprovals=message=>{approvalsBody.replaceChildren();approvalRowCount=0;approvalsTable.hidden=true;approvalsMoreButton.hidden=true;approvalsCount.textContent='0 kayıt';resetApproval();setApprovalsState('EMPTY',message||'Henüz yetkili onay isteği yapılmadı.');};
  const renderApprovalsPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean'||payload.rawSnapshotExposed!==false||payload.rawEvidenceReferenceExposed!==false)throw new Error('INVALID_APPROVALS');const rows=payload.items.map(item=>{if(!uuidPattern.test(item.requestId||'')||!approvalStatuses[item.status]||!uuidPattern.test(item.correlationId||'')||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(item.riskLevel)||!Number.isInteger(item.evidenceCount)||item.evidenceCount<0)throw new Error('INVALID_APPROVAL_ITEM');const action=document.createElement('td');const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeApprovalId=item.requestId;button.textContent='Karar izini aç';action.append(button);const tr=document.createElement('tr');tr.dataset.risk=item.riskLevel;tr.append(cell(item.riskLevel),cell(`${item.subjectType} / ${item.subjectId}`),cell(item.amount==null?'Parasal değil':`${item.amount} ${item.currency||''}`),cell(`${item.evidenceCount} belge`),cell(item.policyVersion),cell(item.preparedBy),cell(approvalStatuses[item.status]),cell(new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAtUtc))),action);return tr;});if(!append){approvalsBody.replaceChildren();approvalRowCount=0;resetApproval();}approvalsBody.append(...rows);approvalRowCount+=rows.length;approvalsCount.textContent=`${approvalRowCount} kayıt · risk ve yaş önceliği`;approvalsTable.hidden=!approvalRowCount;approvalsMoreButton.hidden=!payload.hasMore;approvalsMoreButton.disabled=!payload.hasMore;approvalsMoreButton.dataset.cursor=payload.nextCursor||'';setApprovalsState(approvalRowCount?'READY':'EMPTY',approvalRowCount?'Onay iş listesi risk önceliğiyle yüklendi.':'Onay kaydı bulunamadı.');};
  const getApprovalFilters=()=>Object.freeze({status:approvalsStatus.value||undefined,limit:25});
  const setApprovalState=(next,message)=>{approvalDetail.hidden=false;approvalDetailState.hidden=next==='READY';approvalDetailState.textContent=message||'Onay detayı yükleniyor…';approvalContent.hidden=next!=='READY';};
  const renderApprovalDetail=payload=>{if(!payload||!uuidPattern.test(payload.requestId||'')||!approvalStatuses[payload.status]||!Array.isArray(payload.steps)||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(payload.riskLevel)||!Number.isInteger(payload.evidenceCount)||payload.rawSnapshotExposed!==false||payload.rawEvidenceReferenceExposed!==false||!payload.action||typeof payload.action.available!=='boolean')throw new Error('INVALID_APPROVAL_DETAIL');const serialized=JSON.stringify(payload).toLowerCase();if(serialized.includes('subject_snapshot')||serialized.includes('"evidenceref":')||serialized.includes('secret'))throw new Error('UNSAFE_APPROVAL_DETAIL');const rows=payload.steps.map(step=>{const tr=document.createElement('tr');tr.append(cell(String(step.stepNo)),cell(step.requiredRole),cell(step.decision||'Bekliyor'),cell(step.decidedBy?`${step.decidedBy} / ${step.decidedAtUtc||'—'}`:'—'));return tr;});selectedApproval=Object.freeze(payload);approvalSteps.replaceChildren(...rows);approvalProvenance.replaceChildren(...[`Öncelik: ${payload.riskLevel}`,`Konu: ${payload.subjectType} / ${payload.subjectId}`,`Tutar: ${payload.amount==null?'Parasal değil':`${payload.amount} ${payload.currency||''}`}`,`Kanıt: ${payload.evidenceCount} belge`,`Politika: ${payload.policyVersion}`,`Snapshot hash: ${payload.snapshotHash||'Yok'}`,`Correlation: ${payload.correlationId}`].map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));approvalActionButton.disabled=!payload.action.available;approvalEvidenceButton.disabled=payload.evidenceCount<1||!payload.action.screenId;setApprovalState('READY');};
  const setAuditState=(next,message)=>{audit.dataset.state=next;auditState.textContent=message||'Audit listesi güncellendi.';auditState.hidden=next==='READY'&&auditRowCount>0;auditRefreshButton.disabled=!scopeReady||next==='LOADING';auditExportButton.disabled=!scopeReady||next==='LOADING';for(const control of[auditFrom,auditTo,auditAction,auditSubject])control.disabled=!scopeReady||next==='LOADING';};
  const resetAuditTrace=()=>{auditTrace.hidden=activeScreenId!=='SCR-16';auditTraceState.hidden=false;auditTraceState.textContent='Audit listesinden bir correlation seçin.';auditTraceContent.hidden=true;auditTraceBody.replaceChildren();auditProvenance.replaceChildren();};
  const resetAudit=message=>{auditBody.replaceChildren();auditRowCount=0;auditTable.hidden=true;auditMoreButton.hidden=true;auditCount.textContent='0 kayıt';resetAuditTrace();setAuditState('EMPTY',message||'Henüz yetkili audit isteği yapılmadı.');};
  const renderAuditPage=(payload,{append=false}={})=>{if(!payload||!Array.isArray(payload.items)||typeof payload.hasMore!=='boolean')throw new Error('INVALID_AUDIT');const rows=payload.items.map(item=>{if(!uuidPattern.test(item.eventId||'')||!uuidPattern.test(item.correlationId||''))throw new Error('INVALID_AUDIT_ITEM');const action=document.createElement('td');const button=document.createElement('button');button.type='button';button.className='finance-inline-action';button.dataset.financeAuditCorrelation=item.correlationId;button.textContent='Correlation izini aç';action.append(button);const tr=document.createElement('tr');tr.append(cell(`${new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAtUtc))} / ${item.actorType}`),cell(item.actionCode),cell(`${item.subjectType} / ${item.subjectId}`),cell(`${item.decision||'—'} / ${item.reasonCode||'—'}`),cell(item.correlationId),action);return tr;});if(!append){auditBody.replaceChildren();auditRowCount=0;resetAuditTrace();}auditBody.append(...rows);auditRowCount+=rows.length;auditCount.textContent=`${auditRowCount} kayıt`;auditTable.hidden=!auditRowCount;auditMoreButton.hidden=!payload.hasMore;auditMoreButton.disabled=!payload.hasMore;auditMoreButton.dataset.cursor=payload.nextCursor||'';setAuditState(auditRowCount?'READY':'EMPTY',auditRowCount?'Audit kayıtları yüklendi.':'Audit kaydı bulunamadı.');};
  const getAuditFilters=()=>Object.freeze({from:auditFrom.value||undefined,to:auditTo.value||undefined,actionCode:auditAction.value.trim().toUpperCase()||undefined,subjectType:auditSubject.value.trim().toUpperCase()||undefined,limit:25});
  const downloadAuditExport=payload=>{if(!payload||payload.documentType!=='OTOTR_FINANCE_AUDIT_EXPORT'||payload.rawContextExposed!==false||!Array.isArray(payload.items)||payload.rowCount!==payload.items.length||typeof payload.truncated!=='boolean')throw new Error('INVALID_AUDIT_EXPORT');const forbidden=JSON.stringify(payload).toLowerCase();if(forbidden.includes('safe_context')||forbidden.includes('secret')||forbidden.includes('payload'))throw new Error('UNSAFE_AUDIT_EXPORT');const csvValue=value=>{let text=value==null?'':String(value);if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};const headers=['eventId','createdAtUtc','actorId','actorType','actionCode','subjectType','subjectId','decision','reasonCode','correlationId','integrityHash','previousIntegrityHash'];const rows=[headers,...payload.items.map(item=>headers.map(key=>item[key]??''))];const csv='\ufeff'+rows.map(row=>row.map(csvValue).join(',')).join('\r\n');const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),anchor=document.createElement('a');anchor.href=href;anchor.download=`ototr-finans-audit-${new Date(payload.generatedAtUtc).toISOString().slice(0,10)}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),0);};
  const setAuditTraceState=(next,message)=>{auditTrace.hidden=false;auditTraceState.hidden=next==='READY';auditTraceState.textContent=message||'Correlation izi yükleniyor…';auditTraceContent.hidden=next!=='READY';};
  const renderAuditTrace=payload=>{if(!payload||!uuidPattern.test(payload.correlationId||'')||!Array.isArray(payload.items)||payload.rawContextExposed!==false||payload.chainProjection!=='SHA256_V2_VERIFIED'||payload.chainVerification?.valid!==true||payload.chainVerification?.invalidEventCount!==0)throw new Error('INVALID_AUDIT_TRACE');const serialized=JSON.stringify(payload).toLowerCase();if(serialized.includes('safe_context')||serialized.includes('secret')||serialized.includes('payload'))throw new Error('UNSAFE_AUDIT_TRACE');const rows=payload.items.map(item=>{const tr=document.createElement('tr');tr.append(cell(new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.createdAtUtc))),cell(item.actionCode),cell(`${item.subjectType} / ${item.subjectId}`),cell(item.decision||'—'),cell(`${item.integrityHash} / ${item.previousIntegrityHash||'GENESIS'}`));return tr;});auditTraceBody.replaceChildren(...rows);auditProvenance.replaceChildren(...[`Correlation: ${payload.correlationId}`,`Olay sayısı: ${payload.eventCount}`,`Bütünlük: SHA-256 V2 doğrulandı (${payload.chainVerification.checkedEventCount} olay)`,`Legacy olay: ${payload.chainVerification.legacyEventCount}`,`Ham bağlam gösterilmez`].map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));setAuditTraceState('READY');};

  const setPaymentState = (next, message) => {
    if (!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_PAYMENT_STATE');
    paymentDetail.hidden = false;
    paymentDetail.dataset.state = next;
    paymentState.hidden = next === 'READY';
    paymentState.textContent = message || ({EMPTY:'Ödeme seçilmedi.',LOADING:'Yetkili ödeme detayı yükleniyor…',READY:'Ödeme detayı yüklendi.',ERROR:'Ödeme detayı yüklenemedi.'})[next];
    paymentContent.hidden = next !== 'READY';
  };
  const resetPayment = () => {
    paymentDetail.dataset.state = 'EMPTY';
    paymentDetail.hidden = activeScreenId !== 'SCR-08';
    paymentState.hidden = false;
    paymentState.textContent = 'Ödeme listesinden bir kayıt seçin.';
    paymentContent.hidden = true;
    paymentAllocations.replaceChildren();
  };
  const renderPaymentDetail = payload => {
    const payment = payload?.payment;
    const unallocated = payload?.unallocatedAmount;
    const allocations = payload?.allocations;
    if (!payment || !uuidPattern.test(payment.paymentId || '') || !paymentStatuses[payment.status] || !payment.amount || !unallocated || payment.amount.currency !== unallocated.currency || !Array.isArray(allocations)) throw new Error('INVALID_FINANCE_PAYMENT');
    const rows = allocations.map(allocation => {
      if (!allocation || !uuidPattern.test(allocation.allocationId || '') || !uuidPattern.test(allocation.openItemId || '') || !allocation.amount || allocation.amount.currency !== payment.amount.currency || typeof allocation.status !== 'string') throw new Error('INVALID_FINANCE_PAYMENT_ALLOCATION');
      const tr = document.createElement('tr'); tr.append(cell(allocation.allocationId),cell(allocation.openItemId),cell(amount(allocation.amount.amount,allocation.amount.currency)),cell(allocation.status)); return tr;
    });
    paymentAmount.textContent = amount(payment.amount.amount,payment.amount.currency);
    paymentUnallocated.textContent = amount(unallocated.amount,unallocated.currency);
    paymentStatus.textContent = paymentStatuses[payment.status];
    paymentReference.textContent = payment.externalReference || payment.paymentId;
    paymentMethod.textContent = payment.paymentMethodCode || 'Belirtilmedi';
    paymentDate.textContent = payment.paymentDate || 'Belirtilmedi';
    paymentAllocations.replaceChildren(...rows);
    if (!rows.length) { const tr=document.createElement('tr'); const td=cell('Henüz tahsis yok'); td.colSpan=4; tr.appendChild(td); paymentAllocations.appendChild(tr); }
    setPaymentState('READY');
    window.dispatchEvent(new CustomEvent('ototr:finance-payment-rendered',{detail:payload}));
  };
  const setAccrualState = (next, message) => {
    if (!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_ACCRUAL_STATE');
    accrualDetail.hidden = false;
    accrualDetail.dataset.state = next;
    accrualState.hidden = next === 'READY';
    accrualState.textContent = message || ({EMPTY:'Tahakkuk seçilmedi.',LOADING:'Yetkili tahakkuk izi yükleniyor…',READY:'Tahakkuk izi yüklendi.',ERROR:'Tahakkuk izi yüklenemedi.'})[next];
    accrualContent.hidden = next !== 'READY';
  };
  const resetAccrual = () => {
    selectedAccrualDetail=null;
    accrualDetail.dataset.state = 'EMPTY';
    accrualDetail.hidden = activeScreenId !== 'SCR-06';
    accrualState.hidden = false;
    accrualState.textContent = 'Tahakkuk listesinden bir kayıt seçin.';
    accrualContent.hidden = true;
    accrualLines.replaceChildren();
    accrualProvenance.replaceChildren();
  };
  const renderAccrualDetail = payload => {
    const calculation = payload?.calculation;
    const journal = payload?.journalEntry;
    const amounts = calculation?.amounts;
    const lines = journal?.lines;
    const trace=payload?.calculationTrace;
    if (!uuidPattern.test(payload?.accrualId || '') || typeof payload.status !== 'string' || !amounts || typeof amounts.grossAmount !== 'string' || !/^[A-Z]{3}$/.test(amounts.currency || '') || !journal || !uuidPattern.test(journal.journalEntryId || '') || journal.currency !== amounts.currency || !Array.isArray(lines) || lines.length < 2||!trace||trace.rawInputExposed!==false||!trace.fee||!trace.basis||!trace.calculation||!trace.tax||!trace.rounding||!trace.period||!trace.provenance||!trace.dispute) throw new Error('INVALID_FINANCE_ACCRUAL');
    const rows = lines.map(line => {
      if (!line || typeof line.accountCode !== 'string' || !['DEBIT','CREDIT'].includes(line.direction) || typeof line.amount !== 'string') throw new Error('INVALID_FINANCE_JOURNAL_LINE');
      const tr=document.createElement('tr'); tr.append(cell(line.accountCode),cell(line.direction === 'DEBIT' ? 'Borç' : 'Alacak'),cell(amount(line.amount,journal.currency)),cell(line.description || line.accountCode)); return tr;
    });
    accrualAmount.textContent = amount(amounts.grossAmount,amounts.currency);
    accrualStatus.textContent = `${payload.status} · ${calculation.status || 'Hesaplandı'}`;
    accrualJournal.textContent = journal.entryNumber || journal.journalEntryId;
    accrualDate.textContent = journal.postingDate || 'Belirtilmedi';
    accrualSource.textContent = journal.source?.sourceType || payload.sourceEventId || 'Belirtilmedi';
    accrualRule.textContent = payload.feeRuleId || 'Kural referansı yok';
    const basisDefinition=trace.basis.definition||{},parameters=trace.calculation.parameters||{};const parameterText=Object.entries(parameters).map(([key,value])=>`${key}: ${typeof value==='object'?JSON.stringify(value):value}`).join(' · ');
    accrualFee.textContent=`${trace.fee.code} · ${trace.fee.family}`;accrualBasis.textContent=[basisDefinition.kind||basisDefinition.type||'Tanımlı matrah',trace.basis.amount?amount(trace.basis.amount,trace.basis.currency):null].filter(Boolean).join(' · ');
    accrualMethod.textContent=trace.calculation.method||'Yöntem belirtilmedi';accrualParameters.textContent=parameterText||'Ek parametre yok';
    accrualTax.textContent=trace.tax.rate==null?'KDV oranı yok':`%${trace.tax.rate}`;accrualTaxPolicy.textContent=trace.tax.priceIncludesTax?'KDV dahil matrah':'KDV hariç matrah';
    accrualRounding.textContent=[trace.rounding.mode,trace.rounding.decimalScale!=null?`${trace.rounding.decimalScale} hane`:null,trace.rounding.currency].filter(Boolean).join(' · ')||'Yuvarlama belirtilmedi';accrualPeriod.textContent=`${trace.period.status} · ${trace.period.businessDate}`;
    const short=value=>typeof value==='string'&&value.length>20?`${value.slice(0,12)}…${value.slice(-8)}`:value||'—';accrualProvenance.replaceChildren(...[`Hesaplama: ${trace.provenance.calculationRunId}`,`Girdi hash: ${short(trace.provenance.inputHash)}`,`Sonuç hash: ${short(trace.provenance.resultHash)}`,`Snapshot hash: ${short(trace.provenance.snapshotHash)}`].map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));
    selectedAccrualDetail=payload;accrualRuleOpen.disabled=!uuidPattern.test(payload.contractVersionId||'')||!uuidPattern.test(payload.feeRuleId||'');accrualSourceOpen.disabled=!uuidPattern.test(journal.trace?.correlationId||'');accrualDispute.disabled=trace.dispute.eligible!==true||!/^\d+(\.\d{1,8})?$/.test(trace.dispute.maximumAmount||'')||!/^([A-Z]{3})$/.test(trace.dispute.currency||'');accrualDispute.textContent=accrualDispute.disabled?'İtiraz Edilebilir Açık Tutar Yok':'Bu Tahakkuka İtiraz Et';
    accrualLines.replaceChildren(...rows);
    setAccrualState('READY');
  };
  accrualRuleOpen.addEventListener('click',()=>{if(!selectedAccrualDetail||accrualRuleOpen.disabled)return;selectScreen(screens.find(screen=>screen[0]==='SCR-04'));window.dispatchEvent(new CustomEvent('ototr:finance-contract-rule-requested',{detail:{contractVersionId:selectedAccrualDetail.contractVersionId,feeRuleId:selectedAccrualDetail.feeRuleId}}));});
  accrualSourceOpen.addEventListener('click',()=>{const correlationId=selectedAccrualDetail?.journalEntry?.trace?.correlationId;if(!uuidPattern.test(correlationId||'')||accrualSourceOpen.disabled)return;selectScreen(screens.find(screen=>screen[0]==='SCR-16'));window.dispatchEvent(new CustomEvent('ototr:finance-audit-trace-requested',{detail:{correlationId}}));});
  accrualDispute.addEventListener('click',()=>{const dispute=selectedAccrualDetail?.calculationTrace?.dispute;if(!selectedAccrualDetail||accrualDispute.disabled||dispute?.eligible!==true)return;selectScreen(screens.find(screen=>screen[0]==='SCR-11'));window.dispatchEvent(new CustomEvent('ototr:finance-dispute-create-requested',{detail:{targetRecordType:'ACCRUAL',targetRecordId:selectedAccrualDetail.accrualId,maximumAmount:dispute.maximumAmount,currencyCode:dispute.currency}}));});
  accrualExplanationDownload.addEventListener('click',()=>{if(!selectedAccrualDetail)return;const payload={schemaVersion:1,documentType:'OTOTR_FINANCE_CALCULATION_EXPLANATION',generatedAtUtc:new Date().toISOString(),accrualId:selectedAccrualDetail.accrualId,contractVersionId:selectedAccrualDetail.contractVersionId,feeRuleId:selectedAccrualDetail.feeRuleId,status:selectedAccrualDetail.status,calculationTrace:selectedAccrualDetail.calculationTrace,journalEntry:{journalEntryId:selectedAccrualDetail.journalEntry.journalEntryId,entryNumber:selectedAccrualDetail.journalEntry.entryNumber,postingDate:selectedAccrualDetail.journalEntry.postingDate,currency:selectedAccrualDetail.journalEntry.currency,source:selectedAccrualDetail.journalEntry.source,trace:selectedAccrualDetail.journalEntry.trace,lines:selectedAccrualDetail.journalEntry.lines},rawInputExposed:false};const href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),anchor=document.createElement('a');anchor.href=href;anchor.download=`ototr-finans-hesaplama-${selectedAccrualDetail.accrualId}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),0);});
  const setRefundState = (next,message) => {
    if (!['EMPTY','LOADING','READY','ERROR'].includes(next)) throw new Error('INVALID_FINANCE_REFUND_STATE');
    refundDetail.hidden=false; refundDetail.dataset.state=next; refundState.hidden=next==='READY'; refundContent.hidden=next!=='READY';
    refundState.textContent=message || ({EMPTY:'İade seçilmedi.',LOADING:'Royalty iade izi yükleniyor…',READY:'Royalty iade izi yüklendi.',ERROR:'Royalty iade izi yüklenemedi.'})[next];
  };
  const resetRefund = () => { refundDetail.dataset.state='EMPTY';refundDetail.hidden=activeScreenId!=='SCR-17';refundState.hidden=false;refundState.textContent='İade listesinden bir kayıt seçin.';refundContent.hidden=true;refundProvenance.replaceChildren(); };
  const renderRefundTrace = payload => {
    const refund=payload?.refundEvent, original=payload?.originalRoyaltyAccrual, reversal=payload?.reversalAccrual, periods=payload?.periodProvenance, collection=payload?.originalCollection, credit=payload?.creditOpenItem, carry=payload?.creditCarryForward;
    if (!refund || !uuidPattern.test(refund.refundId || '') || !original || !uuidPattern.test(original.accrualId || '') || !reversal || !uuidPattern.test(reversal.accrualId || '') || !periods || !uuidPattern.test(periods.originalPeriodId || '') || !uuidPattern.test(periods.postingPeriodId || '') || refund.currency!==original.currency || refund.currency!==reversal.currency || !collection || collection.currency!==refund.currency || !credit || credit.currency!==refund.currency || !carry || carry.creditOpenItemId!==credit.openItemId || carry.currency!==credit.currency || !Array.isArray(carry.applications)) throw new Error('INVALID_FINANCE_REFUND_TRACE');
    refundGross.textContent=amount(refund.refundedGrossAmount,refund.currency); refundId.textContent=refund.refundId;
    refundOriginal.textContent=amount(original.grossAmount,original.currency); refundOriginalPeriod.textContent=`Orijinal dönem: ${periods.originalPeriodId}`;
    refundReversal.textContent=amount(String(reversal.grossAmount).replace(/^-/,''),reversal.currency); refundPostingPeriod.textContent=`Kayıt dönemi: ${periods.postingPeriodId}`;
    const collectionTrace=document.createElement('span');collectionTrace.textContent=`Tahsilat: ${amount(collection.collectedGrossAmount,collection.currency)} · ${collection.collectionId} `;const collectionButton=document.createElement('button');collectionButton.type='button';collectionButton.className='finance-inline-action';collectionButton.dataset.financeRefundOriginalAccrual=original.accrualId;collectionButton.textContent='Tahsilat ve ilk tahakkuku aç';collectionTrace.append(collectionButton);
    const reversalTrace=document.createElement('span');reversalTrace.textContent=`Ters tahakkuk: ${reversal.accrualId} `;const reversalButton=document.createElement('button');reversalButton.type='button';reversalButton.className='finance-inline-action';reversalButton.dataset.financeRefundReversalAccrual=reversal.accrualId;reversalButton.textContent='Ters tahakkuku aç';reversalTrace.append(reversalButton);
    const disputeTrace=document.createElement('span');disputeTrace.textContent=`Alacak açık kalemi: ${credit.openItemId} `;const disputeButton=document.createElement('button');disputeButton.type='button';disputeButton.className='finance-inline-action';disputeButton.dataset.financeRefundDisputeAccrual=reversal.accrualId;disputeButton.dataset.financeRefundDisputeMaximum=String(reversal.grossAmount).replace(/^-/,'');disputeButton.dataset.financeRefundDisputeCurrency=reversal.currency;disputeButton.textContent='Ters kayda itiraz et';disputeTrace.append(disputeButton);
    const carryTrace=document.createElement('span');carryTrace.textContent=`Royalty kredisi: ${amount(carry.originalCreditAmount,carry.currency)} · Mahsup: ${amount(carry.appliedAmount,carry.currency)} · Devreden: ${amount(carry.remainingCreditAmount,carry.currency)} · ${carry.status}`;
    const applicationTrace=document.createElement('span');applicationTrace.textContent=carry.applications.length?`Mahsup izi: ${carry.applications.map(item=>`${amount(item.appliedAmount,carry.currency)} → ${item.billingBatchId?`fatura batch ${item.billingBatchId}`:`borç ${item.debitAccrualId}`}`).join(' · ')}`:'Henüz sonraki royalty borcuna mahsup edilmedi.';
    refundProvenance.replaceChildren(collectionTrace,reversalTrace,carryTrace,applicationTrace,disputeTrace);
    setRefundState('READY');
  };
  const resetCurrentPeriod = message => {
    periodContent.hidden=true; periodEmpty.hidden=false; periodEmpty.textContent=message || 'Kapsam ve yetkili dönem verisi bekleniyor.'; periodDetailState.textContent='EMPTY · YETKİLİ VERİ BEKLENİYOR';
  };
  const renderCurrentPeriod = payload => {
    if (payload===null) { resetCurrentPeriod('Seçili iş tarihinde şubeye ait finans dönemi bulunamadı.'); return; }
    if (!payload || !uuidPattern.test(payload.periodId || '') || !uuidPattern.test(payload.dealerAccountId || '') || !uuidPattern.test(payload.branchId || '') || !/^\d{4}-\d{2}-\d{2}$/.test(payload.periodStart || '') || !/^\d{4}-\d{2}-\d{2}$/.test(payload.periodEnd || '') || typeof payload.status!=='string' || !Number.isInteger(payload.version)) throw new Error('INVALID_FINANCE_PERIOD');
    const shortHash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/i.test(value)?`${value.slice(0,12)}…${value.slice(-8)}`:'Henüz oluşmadı';
    periodStatus.textContent=payload.status; periodRange.textContent=`${payload.periodStart} – ${payload.periodEnd}`; periodVersion.textContent=`v${payload.version}`; periodLocked.textContent=payload.lockedAtUtc?`Kilit: ${new Date(payload.lockedAtUtc).toLocaleString('tr-TR')}`:'Kilitlenmedi'; periodSourceHash.textContent=shortHash(payload.sourceSnapshotHash); periodCheckHash.textContent=shortHash(payload.checkSnapshotHash);
    periodContent.hidden=false; periodEmpty.hidden=true; periodDetailState.textContent='READY · SCOPED PERIOD';
    window.dispatchEvent(new CustomEvent('ototr:finance-period-rendered',{detail:payload}));
  };

  const resetAmounts = () => {
    Object.values(kpis).forEach(node => { node.textContent = '—'; });
    overdue.textContent = 'Açık kalem projectionı yok';
  };

  const setConnectionState = (next, message) => {
    const states = {
      UNCONFIGURED: ['ADAY UI · LIVE BAĞLANTI KAPALI', 'EMPTY · SOURCE UNCONFIGURED'],
      LOADING: ['LIVE · YETKİLİ İSTEK', 'LOADING · FINANCE API'],
      READY: ['LIVE · YETKİLİ VERİ', 'READY · LEDGER PROJECTION'],
      ERROR: ['LIVE · BAĞLANTI HATASI', 'ERROR · FAIL CLOSED'],
    };
    if (!states[next]) throw new Error('INVALID_FINANCE_UI_STATE');
    [environment.textContent, state.textContent] = states[next];
    const syntheticDemo=document.documentElement.dataset.financeDemo==='synthetic';
    if(syntheticDemo){environment.textContent='SENTETİK DEMO · CANLI VERİ DEĞİL';state.textContent=`${next} · SYNTHETIC TEST DATA`;}
    description.textContent = syntheticDemo ? (next==='READY'?'Sentetik finans verileri yüklendi; canlı sisteme yazılmaz.':'Sentetik test servisi bekleniyor.') : (message || (next === 'READY' ? 'Yetkili finans projectionı yüklendi.' : 'Yetkili finans API bağlantısı bekleniyor; demo veya tahmini tutar gösterilmiyor.'));
    if (next !== 'READY') resetAmounts();
  };

  const applySummaryKpis = summary => {
    kpis.accrued.textContent=money(summary.accrued);kpis.invoiced.textContent=money(summary.invoiced);kpis.collected.textContent=money(summary.collected);kpis.open.textContent=money(summary.open);overdue.textContent=`Geciken: ${money(summary.overdue)}`;period.textContent=summary.asOf||'Seçilmedi';
  };
  const displayCachedSummary=()=>{const summary=activeScreenId==='SCR-01'?cachedHeadquartersSummary:cachedDealerSummary;if(summary) applySummaryKpis(summary);};
  const renderSummary = (summary, scope) => {
    if (!summary || typeof summary !== 'object') throw new Error('INVALID_FINANCE_SUMMARY');
    for (const key of ['legalEntityId','dealerAccountId','branchId']) {
      if (summary[key] !== scope[key]) throw new Error('FINANCE_SCOPE_MISMATCH');
      contextFields[key].textContent = summary[key];
    }
    cachedDealerSummary=summary;
    const calculatedAt = summary.calculatedAtUtc ? new Date(summary.calculatedAtUtc) : null;
    if (calculatedAt && Number.isNaN(calculatedAt.getTime())) throw new Error('INVALID_FINANCE_TIMESTAMP');
    freshness.textContent = calculatedAt ? calculatedAt.toLocaleString('tr-TR') : 'Bilinmiyor';
    if(!Array.isArray(summary.feeFamilies)||!Array.isArray(summary.branchBreakdown)||!summary.operationalContribution||!['SOURCE_NOT_CONNECTED','CALCULATED'].includes(summary.operationalContribution.status))throw new Error('INVALID_FINANCE_DEALER_BREAKDOWN');
    const familyRows=summary.feeFamilies.map(item=>{if(!item||typeof item.feeFamily!=='string'||item.currency!==summary.currencyCode)throw new Error('INVALID_FINANCE_DEALER_FAMILY');const tr=document.createElement('tr');tr.append(cell(item.feeFamily),cell(amount(item.netAmount,item.currency)),cell(amount(item.taxAmount,item.currency)),cell(amount(item.grossAmount,item.currency)));return tr;});
    const branchRows=summary.branchBreakdown.map(item=>{if(!item||!uuidPattern.test(item.branchId||'')||typeof item.branchCode!=='string'||item.currency!==summary.currencyCode)throw new Error('INVALID_FINANCE_DEALER_BRANCH');const tr=document.createElement('tr');tr.append(cell(item.branchCode),cell(amount(item.accruedGrossAmount,item.currency)),cell(amount(item.collectedGrossAmount,item.currency)),cell(amount(item.openGrossAmount,item.currency)),cell(amount(item.overdueGrossAmount,item.currency)));return tr;});
    dealerFamilies.replaceChildren(...familyRows);dealerBranches.replaceChildren(...branchRows);dealerFamiliesTable.hidden=!familyRows.length;dealerBranchesTable.hidden=!branchRows.length;dealerBreakdownEmpty.hidden=familyRows.length>0||branchRows.length>0;dealerBreakdownState.textContent='READY · BRANCH-SCOPED PROJECTION';
    const contribution=summary.operationalContribution;
    if(contribution.status==='CALCULATED'){
      if(contribution.currency!==summary.currencyCode||contribution.method!=='CUSTOMER_NET_REVENUE_MINUS_GM_ACCRUALS'||contribution.isAccountingProfit!==false||contribution.rawCustomerRecordsExposed!==false)throw new Error('INVALID_OPERATIONAL_CONTRIBUTION');
      operationalContribution.textContent=`Operasyonel katkı: ${amount(contribution.amount,contribution.currency)} · Müşteri net cirosu ${amount(contribution.customerNetRevenueAmount,contribution.currency)} - GM tahakkukları ${amount(contribution.gmAccruedGrossAmount,contribution.currency)} · Muhasebe kârı değildir.`;
    }else operationalContribution.textContent='Operasyonel katkı hesaplanmadı: ERP müşteri cirosu adaptörü bağlı değil; tahmini kazanç üretilmez.';
    if(activeScreenId!=='SCR-01') applySummaryKpis(summary);
    setConnectionState('READY');
  };
  const resetOperationalHealth=()=>{operationalHealth.hidden=true;operationalHealth.dataset.status='';healthStatus.textContent='—';healthGenerated.textContent='Yetkili sağlık özeti bekleniyor';healthPending.textContent='—';healthAge.textContent='En yaşlı kayıt: —';healthDead.textContent='—';healthErrors.textContent='Açık hata: —';healthAudit.textContent='—';healthAuditCount.textContent='Kontrol edilen: —';};
  const renderOperationalHealth=payload=>{if(!payload||!['HEALTHY','DEGRADED','CRITICAL'].includes(payload.status)||!payload.outbox||!payload.integrationErrors||!payload.auditIntegrity||typeof payload.auditIntegrity.valid!=='boolean'||payload.rawPayloadExposed!==false)throw new Error('INVALID_OPERATIONAL_HEALTH');for(const value of[payload.outbox.pending,payload.outbox.failed,payload.outbox.deadLetter,payload.outbox.oldestPendingAgeSeconds,payload.integrationErrors.open,payload.integrationErrors.retryScheduled,payload.auditIntegrity.checkedEventCount,payload.auditIntegrity.invalidEventCount])if(!Number.isInteger(value)||value<0)throw new Error('INVALID_OPERATIONAL_HEALTH');operationalHealth.hidden=false;operationalHealth.dataset.status=payload.status;healthStatus.textContent=({HEALTHY:'SAĞLIKLI',DEGRADED:'İZLEME GEREKİYOR',CRITICAL:'KRİTİK'})[payload.status];healthGenerated.textContent=`Güncelleme: ${new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(payload.generatedAtUtc))}`;healthPending.textContent=String(payload.outbox.pending);healthAge.textContent=`En yaşlı kayıt: ${payload.outbox.oldestPendingAgeSeconds} sn`;healthDead.textContent=String(payload.outbox.deadLetter);healthErrors.textContent=`Açık hata: ${payload.integrationErrors.open} · Retry: ${payload.integrationErrors.retryScheduled}`;healthAudit.textContent=payload.auditIntegrity.valid?'DOĞRULANDI':'GEÇERSİZ';healthAuditCount.textContent=`Kontrol edilen: ${payload.auditIntegrity.checkedEventCount} · Hatalı: ${payload.auditIntegrity.invalidEventCount}`;};
  window.OTOTRFinanceOperationalUI=Object.freeze({renderOperationalHealth,resetOperationalHealth});
  const resetHeadquartersSummary=message=>{cachedHeadquartersSummary=null;headquarters.dataset.state='EMPTY';headquartersState.textContent='EMPTY · YETKİLİ VERİ BEKLENİYOR';headquartersCounts.hidden=true;resetOperationalHealth();headquartersFamiliesTable.hidden=true;headquartersRankingTable.hidden=true;headquartersFamilies.replaceChildren();headquartersRanking.replaceChildren();headquartersEmpty.hidden=false;headquartersEmpty.textContent=message||'Yetkili genel merkez özeti bekleniyor.';};
  const renderHeadquartersSummary=summary=>{
    if(summary===null){resetHeadquartersSummary('Seçili tarih ve para biriminde genel merkez snapshotı bulunamadı.');return;}
    if(!summary||!uuidPattern.test(summary.legalEntityId||'')||!/^\d{4}-\d{2}-\d{2}$/.test(summary.asOf||'')||!/^[A-Z]{3}$/.test(summary.currency||'')||!Number.isInteger(summary.dealerCount)||!Number.isInteger(summary.branchCount)||!Array.isArray(summary.feeFamilies)||!Array.isArray(summary.dealerRanking)) throw new Error('INVALID_HEADQUARTERS_SUMMARY');
    for(const key of ['accrued','invoiced','collected','open','overdue','refunded','disputed']) money(summary[key]);
    const familyRows=summary.feeFamilies.map(item=>{if(!item||typeof item.feeFamily!=='string'||item.currency!==summary.currency) throw new Error('INVALID_HEADQUARTERS_FAMILY');const tr=document.createElement('tr');tr.append(cell(item.feeFamily),cell(amount(item.netAmount,item.currency)),cell(amount(item.taxAmount,item.currency)),cell(amount(item.grossAmount,item.currency)));return tr;});
    const rankingRows=summary.dealerRanking.map(item=>{if(!item||!uuidPattern.test(item.dealerAccountId||'')||!uuidPattern.test(item.branchId||'')||item.currency!==summary.currency) throw new Error('INVALID_HEADQUARTERS_RANKING');const descriptor=document.createElement('td');const dealer=document.createElement('div');dealer.className='finance-statement-fee';dealer.textContent=`${item.dealerCode} · ${item.dealerName}`;const branch=document.createElement('small');branch.textContent=item.branchCode;descriptor.append(dealer,branch);const tr=document.createElement('tr');tr.append(descriptor,cell(amount(item.accruedGrossAmount,item.currency)),cell(amount(item.collectedGrossAmount,item.currency)),cell(amount(item.openGrossAmount,item.currency)),cell(amount(item.overdueGrossAmount,item.currency)));return tr;});
    cachedHeadquartersSummary=summary;headquartersDealers.textContent=String(summary.dealerCount);headquartersBranches.textContent=String(summary.branchCount);headquartersRefunded.textContent=money(summary.refunded);headquartersDisputed.textContent=money(summary.disputed);headquartersFamilies.replaceChildren(...familyRows);headquartersRanking.replaceChildren(...rankingRows);headquartersCounts.hidden=false;headquartersFamiliesTable.hidden=!familyRows.length;headquartersRankingTable.hidden=!rankingRows.length;headquartersEmpty.hidden=true;headquarters.dataset.state='READY';headquartersState.textContent='READY · HEADQUARTERS AGGREGATION';if(activeScreenId==='SCR-01') applySummaryKpis(summary);
  };

  const setScopeContext = scope => {
    const ready = scope && ['legalEntityId','dealerAccountId','branchId'].every(key => typeof scope[key] === 'string' && scope[key]);
    for (const key of ['legalEntityId','dealerAccountId','branchId']) contextFields[key].textContent = ready ? scope[key] : 'Seçilmedi';
    scopeReady = Boolean(ready);
    connectButton.disabled = !ready;
    statementRefreshButton.disabled = !ready;
    statementStatus.disabled = !ready;
    statementFrom.disabled = !ready;statementTo.disabled = !ready;
    paymentsRefreshButton.disabled = !ready;
    paymentsStatus.disabled = !ready;paymentsFrom.disabled=!ready;paymentsTo.disabled=!ready;
    refundsRefreshButton.disabled = !ready;refundsFrom.disabled=!ready;refundsTo.disabled=!ready;
    serviceUsagesRefreshButton.disabled=!ready;serviceUsagesFrom.disabled=!ready;serviceUsagesTo.disabled=!ready;serviceUsagesFamily.disabled=!ready;serviceUsagesChargeStatus.disabled=!ready;
    expensesRefreshButton.disabled=!ready;expensesFrom.disabled=!ready;expensesTo.disabled=!ready;expensesStatus.disabled=!ready;
    disputesRefreshButton.disabled=!ready;disputesStatus.disabled=!ready;
    exportPackagesRefreshButton.disabled=!ready;exportPackagesType.disabled=!ready;exportPackagesStatus.disabled=!ready;
    integrationErrorsRefreshButton.disabled=!ready;integrationErrorsStatus.disabled=!ready;integrationErrorsSource.disabled=!ready;
    approvalsRefreshButton.disabled=!ready;approvalsStatus.disabled=!ready;auditRefreshButton.disabled=!ready;auditExportButton.disabled=!ready;for(const control of[auditFrom,auditTo,auditAction,auditSubject])control.disabled=!ready;
    contractRefreshButton.disabled = !ready;
    contractRuleStatus.disabled = !ready;
    contextStatus.textContent = ready ? 'KAPSAM HAZIR · SUNUCU ONAYI GEREKİR' : 'KAPSAM BEKLENİYOR';
    contextStatus.classList.toggle('is-ready', Boolean(ready));
    resetStatement(ready ? 'Henüz yetkili ekstre isteği yapılmadı.' : 'Kapsam ve yetkili bağlantı bekleniyor.');
    resetPayments(ready ? 'Henüz yetkili ödeme isteği yapılmadı.' : 'Kapsam ve yetkili bağlantı bekleniyor.');
    resetRefunds(ready ? 'Henüz yetkili iade isteği yapılmadı.' : 'Kapsam ve yetkili bağlantı bekleniyor.');
    resetServiceUsages(ready?'Henüz yetkili kullanım isteği yapılmadı.':'Kapsam ve yetkili bağlantı bekleniyor.');
    resetExpenses(ready?'Henüz genel merkez masraf isteği yapılmadı.':'Genel merkez finans kapsamı bekleniyor.');
    resetDisputes(ready?'Henüz yetkili itiraz isteği yapılmadı.':'Kapsam ve yetkili bağlantı bekleniyor.');
    resetExportPackages(ready?'Henüz genel merkez paket isteği yapılmadı.':'Genel merkez finans kapsamı bekleniyor.');
    resetIntegrationErrors(ready?'Henüz yetkili hata kuyruğu isteği yapılmadı.':'Kapsam ve yetkili bağlantı bekleniyor.');
    resetApprovals(ready?'Henüz yetkili onay isteği yapılmadı.':'Kapsam ve yetkili bağlantı bekleniyor.');resetAudit(ready?'Henüz yetkili audit isteği yapılmadı.':'Kapsam ve yetkili bağlantı bekleniyor.');
    resetContract(ready ? 'Henüz yetkili sözleşme isteği yapılmadı.' : 'Kapsam ve yetkili bağlantı bekleniyor.');
    resetCurrentPeriod(ready ? 'Yetkili veri getirildiğinde şube dönemi burada gösterilir.' : 'Kapsam ve yetkili dönem verisi bekleniyor.');
    resetHeadquartersSummary(ready?'Yetkili veri getirildiğinde genel merkez özeti burada gösterilir.':'Genel merkez finans kapsamı bekleniyor.');
    if (!ready) setConnectionState('UNCONFIGURED', 'ERP kimlik köprüsünden tüzel kişi, bayi hesabı ve şube kapsamı bekleniyor.');
    return Boolean(ready);
  };

  const screenGroups = new Map([
    ['SCR-01','YÖNETİM ÖZETİ'],['SCR-02','YÖNETİM ÖZETİ'],
    ['SCR-03','SÖZLEŞME VE BEDELLER'],['SCR-04','SÖZLEŞME VE BEDELLER'],
    ['SCR-05','TAHAKKUK VE TAHSİLAT'],['SCR-06','TAHAKKUK VE TAHSİLAT'],['SCR-07','TAHAKKUK VE TAHSİLAT'],['SCR-08','TAHAKKUK VE TAHSİLAT'],
    ['SCR-09','HİZMET VE MASRAFLAR'],['SCR-10','HİZMET VE MASRAFLAR'],['SCR-17','HİZMET VE MASRAFLAR'],
    ['SCR-11','KONTROL VE ONAY'],['SCR-12','KONTROL VE ONAY'],['SCR-15','KONTROL VE ONAY'],
    ['SCR-13','ENTEGRASYON VE İZ'],['SCR-14','ENTEGRASYON VE İZ'],['SCR-16','ENTEGRASYON VE İZ']
  ]);
  let previousGroup = '';
  screens.forEach(screen => {
    const group = screenGroups.get(screen[0]) || 'FİNANS';
    if (group !== previousGroup) {
      const heading = document.createElement('div');
      heading.className = 'finance-screen-group-label';
      heading.textContent = group;
      nav.appendChild(heading);
      previousGroup = group;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'finance-screen-button';
    button.dataset.financeScreen = screen[0];
    const id = document.createElement('span');
    id.textContent = screen[0];
    const label = document.createElement('b');
    label.textContent = screen[1];
    button.append(id, label);
    button.addEventListener('click', () => selectScreen(screen));
    nav.appendChild(button);
  });
  contractRulesBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-contract-rule-id]');if(!button)return;const item=contractRuleItems.get(button.dataset.financeContractRuleId);if(item)renderContractRuleDetail(item);window.dispatchEvent(new CustomEvent('ototr:finance-contract-rule-requested',{detail:{contractVersionId:contractRulesVersionId,feeRuleId:button.dataset.financeContractRuleId}}));});
  contractRuleDetailClose.addEventListener('click',resetContractRuleDetail);
  statementBody.addEventListener('click', event => {
    const button = event.target.closest('[data-finance-payment-id]');
    if (button) {
      selectScreen(screens.find(screen => screen[0] === 'SCR-08'));
      window.dispatchEvent(new CustomEvent('ototr:finance-payment-requested',{detail:{paymentId:button.dataset.financePaymentId}}));
    }
    const accrualButton = event.target.closest('[data-finance-accrual-id]');
    if (accrualButton) {
      selectScreen(screens.find(screen => screen[0] === 'SCR-06'));
      window.dispatchEvent(new CustomEvent('ototr:finance-accrual-requested',{detail:{accrualId:accrualButton.dataset.financeAccrualId}}));
    }
    const refundButton=event.target.closest('[data-finance-refund-accrual-id]');
    if (refundButton) { selectScreen(screens.find(screen=>screen[0]==='SCR-17')); window.dispatchEvent(new CustomEvent('ototr:finance-refund-requested',{detail:{reversalAccrualId:refundButton.dataset.financeRefundAccrualId}})); }
    const disputeButton=event.target.closest('[data-finance-dispute-target-id]');if(disputeButton){selectScreen(screens.find(screen=>screen[0]==='SCR-11'));window.dispatchEvent(new CustomEvent('ototr:finance-dispute-create-requested',{detail:{targetRecordType:'ACCRUAL',targetRecordId:disputeButton.dataset.financeDisputeTargetId,maximumAmount:disputeButton.dataset.financeDisputeMaximum,currencyCode:disputeButton.dataset.financeDisputeCurrency}}));}
    const reversalButton=event.target.closest('[data-finance-reversal-target-id]');if(reversalButton){selectScreen(screens.find(screen=>screen[0]==='SCR-11'));window.dispatchEvent(new CustomEvent('ototr:finance-dispute-create-requested',{detail:{targetRecordType:'ACCRUAL',targetRecordId:reversalButton.dataset.financeReversalTargetId,maximumAmount:reversalButton.dataset.financeReversalMaximum,currencyCode:reversalButton.dataset.financeReversalCurrency,reasonCode:'ACCRUAL_REVERSAL_REQUEST',requestKind:'REVERSAL'}}));}
  });
  paymentsBody.addEventListener('click', event => {
    const button=event.target.closest('[data-finance-payment-id]');
    if(button) window.dispatchEvent(new CustomEvent('ototr:finance-payment-requested',{detail:{paymentId:button.dataset.financePaymentId}}));
  });
  refundsBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-refund-accrual-id]');if(button) window.dispatchEvent(new CustomEvent('ototr:finance-refund-requested',{detail:{reversalAccrualId:button.dataset.financeRefundAccrualId}}));});
  refundProvenance.addEventListener('click',event=>{const accrualButton=event.target.closest('[data-finance-refund-original-accrual],[data-finance-refund-reversal-accrual]');if(accrualButton){const accrualId=accrualButton.dataset.financeRefundOriginalAccrual||accrualButton.dataset.financeRefundReversalAccrual;selectScreen(screens.find(screen=>screen[0]==='SCR-06'));window.dispatchEvent(new CustomEvent('ototr:finance-accrual-requested',{detail:{accrualId}}));return;}const disputeButton=event.target.closest('[data-finance-refund-dispute-accrual]');if(disputeButton){selectScreen(screens.find(screen=>screen[0]==='SCR-11'));window.dispatchEvent(new CustomEvent('ototr:finance-dispute-create-requested',{detail:{targetRecordType:'ACCRUAL',targetRecordId:disputeButton.dataset.financeRefundDisputeAccrual,maximumAmount:disputeButton.dataset.financeRefundDisputeMaximum,currencyCode:disputeButton.dataset.financeRefundDisputeCurrency}}));}});
  serviceUsagesBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-accrual-id]');if(button){selectScreen(screens.find(screen=>screen[0]==='SCR-06'));window.dispatchEvent(new CustomEvent('ototr:finance-accrual-requested',{detail:{accrualId:button.dataset.financeAccrualId}}));}});
  expensesBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-expense-id]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-expense-requested',{detail:{expenseId:button.dataset.financeExpenseId}}));});
  expenseShares.addEventListener('click',event=>{const button=event.target.closest('[data-finance-accrual-id]');if(button){selectScreen(screens.find(screen=>screen[0]==='SCR-06'));window.dispatchEvent(new CustomEvent('ototr:finance-accrual-requested',{detail:{accrualId:button.dataset.financeAccrualId}}));}});
  disputesBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-dispute-id]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-dispute-requested',{detail:{disputeId:button.dataset.financeDisputeId}}));});
  exportPackagesBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-export-package-id]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-export-package-requested',{detail:{packageType:button.dataset.financeExportPackageType,packageId:button.dataset.financeExportPackageId}}));});
  integrationErrorsBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-integration-error-id]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-integration-error-requested',{detail:{errorId:button.dataset.financeIntegrationErrorId}}));});
  approvalsBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-approval-id]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-approval-requested',{detail:{requestId:button.dataset.financeApprovalId}}));});
  const openApprovalSubject=()=>{if(!selectedApproval?.action?.screenId)return;const target=screens.find(screen=>screen[0]===selectedApproval.action.screenId);if(!target)return;selectScreen(target);const detail={subjectType:selectedApproval.subjectType,subjectId:selectedApproval.subjectId,requestId:selectedApproval.requestId,version:selectedApproval.version,operationId:selectedApproval.action.operationId,evidenceCount:selectedApproval.evidenceCount,sourceEventId:selectedApproval.sourceEventId||null,feeRuleId:selectedApproval.feeRuleId||null};if(selectedApproval.action.screenId==='SCR-10')window.dispatchEvent(new CustomEvent('ototr:finance-expense-requested',{detail:{expenseId:selectedApproval.subjectId}}));else if(selectedApproval.action.screenId==='SCR-11')window.dispatchEvent(new CustomEvent('ototr:finance-dispute-requested',{detail:{disputeId:selectedApproval.subjectId}}));else if(selectedApproval.action.screenId==='SCR-03')window.dispatchEvent(new CustomEvent('ototr:finance-contract-workspace-requested',{detail}));else window.dispatchEvent(new CustomEvent('ototr:finance-approval-subject-requested',{detail}));};
  approvalActionButton.addEventListener('click',openApprovalSubject);approvalEvidenceButton.addEventListener('click',openApprovalSubject);
  auditBody.addEventListener('click',event=>{const button=event.target.closest('[data-finance-audit-correlation]');if(button)window.dispatchEvent(new CustomEvent('ototr:finance-audit-trace-requested',{detail:{correlationId:button.dataset.financeAuditCorrelation}}));});
  paymentCloseButton.addEventListener('click', resetPayment);
  accrualCloseButton.addEventListener('click', resetAccrual);
  refundCloseButton.addEventListener('click',resetRefund);
  expenseCloseButton.addEventListener('click',resetExpense);
  disputeCloseButton.addEventListener('click',resetDispute);
  exportPackageCloseButton.addEventListener('click',resetExportPackage);
  integrationErrorCloseButton.addEventListener('click',resetIntegrationError);
  approvalCloseButton.addEventListener('click',resetApproval);auditCloseButton.addEventListener('click',resetAuditTrace);

  const loadReadiness=async()=>{
    const failClosed=()=>{readiness.dataset.state='ERROR';readinessPassed.textContent='0 / 12';readinessDecision.textContent='NO_GO';readinessDecision.className='finance-readiness-decision is-no-go';readinessState.textContent='Hazırlık kaydı yüklenemedi veya doğrulanamadı; canlı geçiş kapalı.';readinessTable.hidden=true;readinessBody.replaceChildren();commercial.dataset.state='ERROR';commercialStatus.textContent='DOĞRULANAMADI';commercialStatus.className='finance-readiness-decision is-no-go';commercialState.textContent='Ticari yapılandırma doğrulanamadı; FIN-G01 kapalı.';commercialTable.hidden=true;commercialBody.replaceChildren();};
    try{
      const gatesUrl=new URL('assets/uat-preproduction-gates.json',window.location.href);const decisionUrl=new URL('assets/preproduction-decision.json',window.location.href);const commercialUrl=new URL('assets/commercial-configuration-public.json',window.location.href);const [gatesResponse,decisionResponse,commercialResponse]=await Promise.all([fetch(gatesUrl,{cache:'no-store'}),fetch(decisionUrl,{cache:'no-store'}),fetch(commercialUrl,{cache:'no-store'})]);
      if(!gatesResponse.ok||!decisionResponse.ok||!commercialResponse.ok)throw new Error('READINESS_FETCH_FAILED');
      const [registry,decision,commercialConfiguration]=await Promise.all([gatesResponse.json(),decisionResponse.json(),commercialResponse.json()]);
      const expectedIds=Array.from({length:12},(_,index)=>`FIN-G${String(index+1).padStart(2,'0')}`);const allowedStatuses=new Set(['PENDING','PASSED','FAILED','BLOCKED']);
      if(registry?.schemaVersion!==1||registry?.module!=='OTOTR_FRANCHISE_FINANCE'||!Array.isArray(registry.gates)||registry.gates.length!==12||decision?.schemaVersion!==1||decision?.module!=='OTOTR_FRANCHISE_FINANCE')throw new Error('READINESS_SCHEMA_INVALID');
      registry.gates.forEach((gate,index)=>{if(gate?.id!==expectedIds[index]||typeof gate.name!=='string'||typeof gate.owner!=='string'||!allowedStatuses.has(gate.status)||typeof gate.blockingReason!=='string')throw new Error('READINESS_GATE_INVALID');});
      const passed=registry.gates.filter(gate=>gate.status==='PASSED').length;const isGo=passed===12&&decision.productionDecision==='GO'&&decision.decision==='GO';
      readinessBody.replaceChildren(...registry.gates.map(gate=>{const row=document.createElement('tr');const values=[`${gate.id} · ${gate.name}`,gate.owner,gate.status,gate.blockingReason||'Engel bildirilmedi.'];values.forEach((value,index)=>{const cell=document.createElement('td');cell.textContent=value;if(index===2)cell.className=`finance-readiness-status is-${gate.status.toLowerCase()}`;row.append(cell);});return row;}));
      readiness.dataset.state='READY';readinessPassed.textContent=`${passed} / 12`;readinessDecision.textContent=isGo?'GO':'NO_GO';readinessDecision.className=`finance-readiness-decision ${isGo?'is-go':'is-no-go'}`;readinessState.textContent=isGo?'Tüm kapılar geçti ve nihai karar onaylandı.':'Eksik kapılar var; canlı geçiş kapalı.';readinessTable.hidden=false;
      const familyCodes=['ROYALTY','ENTRY_FRANCHISE','QUERY','EXTERNAL_SERVICE','OPTIONAL_PRODUCT_SERVICE','PASS_THROUGH_EXPENSE','DEDUCTION_CREDIT'];if(commercialConfiguration?.schemaVersion!==1||commercialConfiguration?.module!=='OTOTR_FRANCHISE_FINANCE'||commercialConfiguration?.projection!=='COMMERCIAL_DECISION_STATUS_PUBLIC'||commercialConfiguration.productionValuesExposed!==false||commercialConfiguration.approvalIdentitiesExposed!==false||commercialConfiguration.evidenceMetadataExposed!==false||!Array.isArray(commercialConfiguration.feeFamilies)||commercialConfiguration.feeFamilies.length!==7||commercialConfiguration.feeFamilies.some((family,index)=>family?.code!==familyCodes[index]||typeof family.confirmedBehavior!=='string'||!Array.isArray(family.pendingFields)))throw new Error('COMMERCIAL_SCHEMA_INVALID');
      commercialBody.replaceChildren(...commercialConfiguration.feeFamilies.map(family=>{const row=document.createElement('tr');[family.code,family.decisionStatus,family.confirmedBehavior,family.pendingFields.length?family.pendingFields.join(', '):'Eksik alan yok'].forEach((value,index)=>{const cell=document.createElement('td');cell.textContent=value;if(index===1)cell.className=`finance-readiness-status is-${family.decisionStatus==='APPROVED'?'passed':'pending'}`;row.append(cell);});return row;}));const approved=commercialConfiguration.status==='APPROVED'&&commercialConfiguration.feeFamilies.every(family=>family.decisionStatus==='APPROVED');commercial.dataset.state='READY';commercialStatus.textContent=approved?'ONAYLI':'KARAR BEKLİYOR';commercialStatus.className=`finance-readiness-decision ${approved?'is-go':'is-no-go'}`;commercialState.textContent=approved?'Tüm ticari değerler onaylandı.':'Eksik üretim değerleri tamamlanmadan FIN-G01 geçemez.';commercialTable.hidden=false;
    }catch(error){failClosed();}
  };

  selectScreen(screens[0]);
  loadReadiness();
  window.OTOTRFinanceRuleDetailUI=Object.freeze({setContractRuleDetailState,renderContractRuleDetail});
  window.OTOTRFinanceComparisonUI=Object.freeze({setContractComparisonState,renderContractVersionComparison,resetContractComparison,getContractImpactScenario,setContractImpactState,renderContractImpactSimulation,contractImpactForm});
  window.OTOTRFinanceTimelineUI=Object.freeze({resetContractTimeline,setContractTimelineState,renderContractTimelinePage,contractTimelineMore});
  window.OTOTRFinanceUI = Object.freeze({setConnectionState, setScopeContext, renderSummary,renderHeadquartersSummary,resetHeadquartersSummary,setServiceUsagesState,renderServiceUsagesPage,resetServiceUsages,getServiceUsageFilters,setExpensesState,renderExpensesPage,resetExpenses,getExpenseFilters,setExpenseState,renderExpenseDetail,resetExpense,setDisputesState,renderDisputesPage,resetDisputes,getDisputeFilters,setDisputeState,renderDisputeDetail,resetDispute,setExportPackagesState,renderExportPackagesPage,resetExportPackages,getExportPackageFilters,setExportPackageState,renderExportPackageDetail,resetExportPackage,setIntegrationErrorsState,renderIntegrationErrorsPage,resetIntegrationErrors,getIntegrationErrorFilters,setIntegrationErrorState,renderIntegrationErrorDetail,resetIntegrationError,setApprovalsState,renderApprovalsPage,resetApprovals,getApprovalFilters,setApprovalState,renderApprovalDetail,resetApproval,setAuditState,renderAuditPage,resetAudit,getAuditFilters,downloadAuditExport,setAuditTraceState,renderAuditTrace,resetAuditTrace, setStatementState, renderStatementPage, resetStatement, getStatementFilters, setContractState, renderCurrentContract, resetContract, setContractRulesState, renderContractRulesPage, resetContractRules, setContractRulesVersion, getContractRulesVersion, getContractRuleFilters, setPaymentsState, renderPaymentsPage, resetPayments, getPaymentFilters, setRefundsState,renderRefundsPage,resetRefunds,getRefundFilters,setPaymentState, renderPaymentDetail, resetPayment, setAccrualState, renderAccrualDetail, resetAccrual, setRefundState, renderRefundTrace, resetRefund, renderCurrentPeriod, resetCurrentPeriod, connectButton, statementRefreshButton, statementMoreButton, statementStatus, contractRefreshButton, contractMoreButton, contractRuleStatus, paymentsRefreshButton, paymentsMoreButton, paymentsStatus,refundsRefreshButton,refundsMoreButton,serviceUsagesRefreshButton,serviceUsagesMoreButton,serviceUsagesFamily,serviceUsagesChargeStatus,expensesRefreshButton,expensesMoreButton,expensesStatus,disputesRefreshButton,disputesMoreButton,disputesStatus,exportPackagesRefreshButton,exportPackagesMoreButton,exportPackagesType,exportPackagesStatus,integrationErrorsRefreshButton,integrationErrorsMoreButton,integrationErrorsStatus,integrationErrorsSource,approvalsRefreshButton,approvalsMoreButton,approvalsStatus,auditRefreshButton,auditExportButton,auditMoreButton});
  window.OTOTRFinanceUI = Object.freeze({...window.OTOTRFinanceUI, renderStatementControl, downloadStatementExport, downloadStatementPdf, statementCurrency, statementExportButton, statementPdfButton,accrualFamily,accrualPeriodStatus});
})();
