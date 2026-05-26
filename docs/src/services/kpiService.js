(function(global){
  const sum = (arr,key) => arr.reduce((s,x)=>s+(Number(typeof key === "function" ? key(x) : x[key])||0),0);
  const avg = (arr,key) => arr.length ? sum(arr,key) / arr.length : 0;
  const pct = (part,total) => total ? Math.round((part/total)*100) : 0;
  const clamp = (n,min,max) => Math.max(min, Math.min(max, n));

  function calculateLegalKPIs(legalModule, revenue=1){
    const closedCases = legalModule.legalCases.filter(x => x.status === "kapandı");
    const wonCases = closedCases.filter(x => x.result === "kazanıldı");
    const lawsuits = legalModule.legalCases.filter(x => x.type === "dava");
    const legalComplaints = legalModule.legalComplaints.filter(x => x.legalRisk);
    const totalCost = sum(legalModule.legalCases,"costAmount") + sum(legalModule.legalCases,"paidAmount");
    const reportErrors = legalModule.reportResponsibilities.filter(x => x.errorFlag).length;
    const arbitrationCases = legalModule.arbitrations.length;
    const potentialCases = legalModule.reportResponsibilities.filter(x => x.postSaleComplaint || x.riskScore > 70).length;
    const insuranceUsed = sum(legalModule.insurance,"usedAmount");
    const insuranceCoverage = sum(legalModule.insurance,"coverageAmount");
    const complianceAvg = Math.round(avg(legalModule.compliance,"complianceScore"));
    const highRiskCaseCount = legalModule.legalCases.filter(x => x.riskLevel === "yüksek" && x.status !== "kapandı").length;
    const complaintRiskScore = clamp(legalComplaints.length * 4, 0, 100);
    const caseRiskScore = clamp(highRiskCaseCount * 16 + lawsuits.length * 2, 0, 100);
    const reportRiskScore = clamp(reportErrors * 3, 0, 100);
    const complianceRiskScore = clamp(100 - complianceAvg, 0, 100);
    const financeRiskScore = clamp(pct(totalCost, revenue) * 4, 0, 100);
    const legalRiskScore = Math.round(
      complaintRiskScore*.20 +
      caseRiskScore*.25 +
      reportRiskScore*.25 +
      complianceRiskScore*.15 +
      financeRiskScore*.15
    );
    return {
      davaKazanmaOrani:pct(wonCases.length, closedCases.length),
      sikayetDavaOrani:pct(lawsuits.length, Math.max(1, legalModule.legalComplaints.length)),
      ortalamaCozumSuresi:Math.round(avg(legalModule.legalComplaints,"cozumSuresiSaat")),
      hukukMaliyetOrani:pct(totalCost, revenue),
      davaBasinaMaliyet:Math.round(totalCost / Math.max(1, legalModule.legalCases.length)),
      erkenCozumOrani:pct(legalModule.legalCases.filter(x => x.result === "uzlaşma").length, closedCases.length),
      riskliDosyaOrani:pct(legalModule.legalCases.filter(x => x.riskLevel === "yüksek").length, legalModule.legalCases.length),
      bayiUyumOrtalamasi:complianceAvg,
      raporHataOrani:pct(reportErrors, legalModule.reportResponsibilities.length),
      ortalamaRaporKalitesi:Math.round(avg(legalModule.reportQuality,"qualityScore")),
      potansiyelDavaSayisi:potentialCases,
      hakemHeyetiOrani:pct(arbitrationCases, legalModule.legalCases.length),
      sigortaKullanimOrani:pct(insuranceUsed, insuranceCoverage),
      hukukiRiskPuani:legalRiskScore,
      toplamHukukMaliyeti:totalCost,
      toplamRiskTutari:sum(legalModule.legalCases,"reservedAmount") + sum(legalModule.reportResponsibilities,"legalExposure")
    };
  }

  const api = { calculateLegalKPIs };
  global.OTOTR_KPI_SERVICE = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
