(function(global){
  const sum = (arr,key) => arr.reduce((s,x)=>s+(Number(typeof key === "function" ? key(x) : x[key])||0),0);

  function createLegalService(dashboardSeed){
    const permission = global.OTOTR_PERMISSION_SERVICE;
    const kpiService = global.OTOTR_KPI_SERVICE;
    const alertService = global.OTOTR_ALERT_SERVICE;
    const branches = dashboardSeed.branches || [];

    function visibleModule(role="CEO", regionId, branchId){
      const filter = rows => permission ? permission.filterRowsByRole(rows, branches, role, regionId, branchId) : rows;
      const legal = dashboardSeed.legalModule;
      return {
        contracts:filter(legal.contracts),
        legalCases:filter(legal.legalCases),
        legalComplaints:filter(legal.legalComplaints),
        compliance:filter(legal.compliance),
        insurance:filter(legal.insurance),
        reportResponsibilities:filter(legal.reportResponsibilities),
        reportQuality:filter(legal.reportQuality),
        arbitrations:filter(legal.arbitrations),
        legalAlerts:filter(legal.legalAlerts)
      };
    }

    function getLegalKPIs(role="CEO", regionId, branchId){
      const module = visibleModule(role, regionId, branchId);
      const visibleIds = new Set(module.contracts.map(x=>x.branchId));
      const revenue = sum((dashboardSeed.operations || []).filter(x=>visibleIds.has(x.branchId)), "grossRevenue");
      return kpiService.calculateLegalKPIs(module, revenue || 1);
    }

    function getLegalOverview(role="CEO", regionId, branchId){
      const module = visibleModule(role, regionId, branchId);
      const kpis = getLegalKPIs(role, regionId, branchId);
      const closed = module.legalCases.filter(x=>x.status === "kapandı");
      return {
        hukukiRiskPuani:kpis.hukukiRiskPuani,
        yuksekRiskliSikayet:module.legalComplaints.filter(x=>x.legalRisk && x.severity === "yüksek").length,
        potansiyelDava:kpis.potansiyelDavaSayisi,
        acikDosya:module.legalCases.filter(x=>x.status === "açık").length,
        devamEden:module.legalCases.filter(x=>x.status === "devam ediyor").length,
        kapanan:closed.length,
        kazanilan:closed.filter(x=>x.result === "kazanıldı").length,
        kaybedilen:closed.filter(x=>x.result === "kaybedildi").length,
        kazanmaOrani:kpis.davaKazanmaOrani,
        toplamMaliyet:kpis.toplamHukukMaliyeti,
        toplamRisk:kpis.toplamRiskTutari,
        maliyetOrani:kpis.hukukMaliyetOrani,
        raporHataOrani:kpis.raporHataOrani,
        kaliteSkoru:kpis.ortalamaRaporKalitesi,
        ortalamaUyum:kpis.bayiUyumOrtalamasi,
        riskliBayiSayisi:module.compliance.filter(x=>x.complianceScore<75 || x.violationsCount>2).length,
        sigortaKullanimOrani:kpis.sigortaKullanimOrani
      };
    }

    function getLegalRiskScore(role="CEO", regionId, branchId){
      return getLegalKPIs(role, regionId, branchId).hukukiRiskPuani;
    }

    function getLegalAlerts(role="CEO", regionId, branchId){
      const module = visibleModule(role, regionId, branchId);
      const alerts = alertService.getLegalAlerts(module, getLegalKPIs(role, regionId, branchId));
      const normalized = String(role || "CEO").toUpperCase();
      if(normalized.includes("BAYI") || normalized.includes("SUBE") || normalized.includes("ŞUBE")) return alerts.filter(a=>a.branchId === branchId);
      if(normalized.includes("BOLGE") || normalized.includes("BÖLGE")) return alerts.filter(a=>a.branchId !== "GENEL");
      return alerts;
    }

    function getLegalSummary(role="CEO", regionId, branchId){
      const module = visibleModule(role, regionId, branchId);
      const kpis = getLegalKPIs(role, regionId, branchId);
      const alerts = getLegalAlerts(role, regionId, branchId);
      return {
        ...getLegalOverview(role, regionId, branchId),
        totalLegalCases:module.legalCases.filter(x=>x.status !== "kapandı").length,
        highRiskCases:module.legalCases.filter(x=>x.status !== "kapandı" && x.riskLevel === "yüksek").length,
        riskyBranches:new Set(module.compliance.filter(x=>x.complianceScore<75 || x.violationsCount>2).map(x=>x.branchId)).size,
        complianceScoreAvg:kpis.bayiUyumOrtalamasi,
        legalAlerts:alerts
      };
    }

    return { visibleModule, getLegalOverview, getLegalKPIs, getLegalRiskScore, getLegalAlerts, getLegalSummary };
  }

  const api = { createLegalService };
  global.OTOTR_LEGAL_SERVICE = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
