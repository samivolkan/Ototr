(function(global){
  const DAY_COUNT = 30;
  const CASE_TYPES = ["hakem heyeti","dava","arabuluculuk"];
  const CASE_STAGES = ["ilk inceleme","savunma bekliyor","duruşma bekliyor","uzlaşma görüşmesi","kapanış"];
  const COMPLAINT_CATEGORIES = ["rapor itirazı","bekleme süresi","personel davranışı","fiyat itirazı","eksik kontrol"];
  const REPORT_CHECKS = ["boya","mekanik","elektronik","kaporta","yol testi","fotoğraf"];

  const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
  const sum = (arr,key) => arr.reduce((s,x)=>s+(Number(typeof key === "function" ? key(x) : x[key])||0),0);
  const money = n => Math.round(n / 100) * 100;
  const dateAdd = (iso, offset) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0,10);
  };

  function branchTone(branch){
    if(branch.id === "BR-009") return "high";
    if(branch.id === "BR-008") return "medium";
    if(branch.id === "BR-002") return "strong";
    if(branch.regionId === "ege") return "medium";
    return "normal";
  }

  function createContracts(branchRows){
    return branchRows.map((branch,index) => {
      const tone = branchTone(branch);
      const status = tone === "high" || branch.id === "BR-008" ? "ihlal" : index % 4 === 0 ? "yenilenecek" : "aktif";
      const violationCount = status === "ihlal" ? (tone === "high" ? 5 : 3) : status === "yenilenecek" ? 1 : 0;
      return {
        contractId:`CNT-${String(index+1).padStart(3,"0")}`,
        branchId:branch.id,
        branchName:branch.displayName,
        regionId:branch.regionId,
        region:branch.region,
        startDate:`2024-${String((index%9)+1).padStart(2,"0")}-01`,
        endDate:status === "yenilenecek" ? "2026-06-30" : `2027-${String((index%9)+1).padStart(2,"0")}-01`,
        royaltyRate:.10,
        status,
        violationCount,
        terminationRiskScore:clamp(violationCount*18 + (branch.trustScore < 75 ? 24 : 0) + (tone === "high" ? 22 : 0), 4, 96)
      };
    });
  }

  function createLegalCases(branchRows){
    const rows = [];
    const branchPlan = [
      ["BR-009",6],["BR-008",4],["BR-006",3],["BR-004",3],["BR-001",2],["BR-005",2],["BR-010",2],["BR-003",1],["BR-002",1]
    ];
    branchPlan.forEach(([branchId,count]) => {
      const branch = branchRows.find(b=>b.id===branchId);
      for(let i=0;i<count;i++){
        const riskLevel = branchId === "BR-009" && i < 3 ? "yüksek" : branchId === "BR-008" && i < 1 ? "yüksek" : i % 3 === 0 ? "orta" : "düşük";
        const status = i % 5 === 0 ? "kapandı" : i % 2 === 0 ? "devam ediyor" : "açık";
        const result = status === "kapandı" ? (i % 3 === 0 ? "kaybedildi" : i % 3 === 1 ? "uzlaşma" : "kazanıldı") : null;
        const claimedAmount = money((riskLevel === "yüksek" ? 180000 : riskLevel === "orta" ? 85000 : 34000) + i*7400);
        const awardedAmount = result === "kaybedildi" ? money(claimedAmount*.72) : result === "uzlaşma" ? money(claimedAmount*.38) : 0;
        const paidAmount = result ? money(awardedAmount*.82) : 0;
        const costAmount = money(claimedAmount * (riskLevel === "yüksek" ? .14 : .09));
        rows.push({
          caseId:`LC-${String(rows.length+1).padStart(3,"0")}`,
          branchId,
          branchName:branch?.displayName || branchId,
          regionId:branch?.regionId,
          region:branch?.region,
          type:CASE_TYPES[(rows.length+i)%CASE_TYPES.length],
          status,
          stage:CASE_STAGES[(rows.length+i)%CASE_STAGES.length],
          riskLevel,
          claimedAmount,
          reservedAmount:money(claimedAmount * (riskLevel === "yüksek" ? .65 : riskLevel === "orta" ? .42 : .18)),
          nextHearingDate:status === "kapandı" ? null : dateAdd("2026-04-30", 14 + rows.length*3),
          result,
          awardedAmount,
          paidAmount,
          costAmount
        });
      }
    });
    return rows;
  }

  function createLegalComplaints(branchRows){
    return branchRows.flatMap(branch => {
      const tone = branchTone(branch);
      const count = tone === "high" ? 11 : tone === "medium" ? 6 : tone === "strong" ? 2 : 4;
      return Array.from({length:count}, (_,i) => {
        const legalRisk = tone === "high" ? i < 7 : tone === "medium" ? i < 3 : i === 0 && branch.id !== "BR-002";
        const severity = legalRisk && tone === "high" && i < 3 ? "yüksek" : legalRisk ? "orta" : "düşük";
        return {
          complaintId:`CMP-${branch.id}-${String(i+1).padStart(2,"0")}`,
          branchId:branch.id,
          branchName:branch.displayName,
          regionId:branch.regionId,
          region:branch.region,
          kategori:COMPLAINT_CATEGORIES[(i + branch.id.charCodeAt(5)) % COMPLAINT_CATEGORIES.length],
          severity,
          status:i % 4 === 0 ? "açık" : i % 4 === 1 ? "incelemede" : "kapandı",
          legalRisk,
          legalRiskLevel:legalRisk ? severity : "düşük",
          cozumSuresiSaat: legalRisk ? 18 + i*4 : 4 + i,
          escalationLevel:severity === "yüksek" ? "kritik" : severity === "orta" ? "uyarı" : "bilgi"
        };
      });
    });
  }

  function createReports(branchRows){
    const reportResponsibilities = [];
    const reportQuality = [];
    const arbitrations = [];
    branchRows.forEach(branch => {
      const tone = branchTone(branch);
      for(let i=0;i<30;i++){
        const reportId = `RP-${branch.id}-${String(i+1).padStart(3,"0")}`;
        const riskScore = clamp((tone === "high" ? 72 : tone === "medium" ? 48 : tone === "strong" ? 14 : 28) + (i%7)*3, 5, 96);
        const errorFlag = riskScore > 70 || (tone === "medium" && i%9===0);
        const qualityScore = clamp(100 - riskScore*.55 - (errorFlag ? 8 : 0), 48, 98);
        const missingChecks = errorFlag ? REPORT_CHECKS.slice(0, (i%3)+1) : [];
        reportResponsibilities.push({
          reportId,
          branchId:branch.id,
          branchName:branch.displayName,
          regionId:branch.regionId,
          region:branch.region,
          expertId:`EXP-${branch.id.slice(-2)}-${(i%5)+1}`,
          riskScore,
          errorFlag,
          postSaleComplaint:riskScore > 62,
          legalExposure:money(riskScore * (tone === "high" ? 1900 : 900))
        });
        reportQuality.push({reportId, branchId:branch.id, qualityScore:Math.round(qualityScore), missingChecks, deviationFlag:qualityScore < 75});
        if(riskScore > 74 && i%5===0){
          arbitrations.push({
            arbitrationCaseId:`ARB-${branch.id}-${String(i).padStart(2,"0")}`,
            branchId:branch.id,
            branchName:branch.displayName,
            regionId:branch.regionId,
            region:branch.region,
            result:i%3===0 ? "kaybedildi" : i%3===1 ? "uzlaşma" : "kazanıldı",
            amount:money(riskScore*1100)
          });
        }
      }
    });
    return {reportResponsibilities, reportQuality, arbitrations};
  }

  function createCompliance(branchRows, contracts){
    return branchRows.map(branch => {
      const contract = contracts.find(c=>c.branchId===branch.id);
      const score = clamp((branch.trustScore || 80) - (contract?.violationCount || 0)*8 - (branch.id === "BR-009" ? 14 : 0), 38, 99);
      return {
        branchId:branch.id,
        branchName:branch.displayName,
        regionId:branch.regionId,
        region:branch.region,
        complianceScore:Math.round(score),
        violationsCount:contract?.violationCount || 0
      };
    });
  }

  function createInsurance(branchRows, reportResponsibilities){
    return branchRows.map(branch => {
      const exposure = sum(reportResponsibilities.filter(x=>x.branchId===branch.id), "legalExposure");
      const coverageAmount = branch.id === "BR-009" ? 900000 : 1200000;
      const usedAmount = money(Math.min(coverageAmount*.92, exposure*.18));
      return {
        branchId:branch.id,
        branchName:branch.displayName,
        regionId:branch.regionId,
        region:branch.region,
        coverageAmount,
        usedAmount,
        remainingCoverage:coverageAmount-usedAmount
      };
    });
  }

  function createLegalAlerts(data){
    const alerts = [];
    const push = (type,severity,branchId,description) => {
      const source = data.contracts.find(x=>x.branchId===branchId) || data.legalCases.find(x=>x.branchId===branchId) || data.compliance.find(x=>x.branchId===branchId);
      alerts.push({type,severity,branchId,branchName:source?.branchName||branchId,regionId:source?.regionId,region:source?.region,description});
    };
    data.legalComplaints.filter(x=>x.legalRisk && x.severity==="yüksek").forEach(x=>push("Yüksek riskli şikayet","kritik",x.branchId,`${x.branchName} şikayeti hukuki risk taşıyor: ${x.kategori}.`));
    data.legalCases.filter(x=>x.status==="açık" || x.status==="devam ediyor").slice(0,8).forEach(x=>push("Dava açıldı",x.riskLevel==="yüksek"?"kritik":"uyarı",x.branchId,`${x.branchName} ${x.type} dosyası ${x.stage} aşamasında.`));
    data.legalCases.filter(x=>x.result==="kaybedildi").forEach(x=>push("Dava kaybedildi","kritik",x.branchId,`${x.branchName} dosyasında kayıp/ödeme riski oluştu.`));
    data.reportResponsibilities.filter(x=>x.errorFlag && x.riskScore>78).slice(0,8).forEach(x=>push("Rapor hatası riski","uyarı",x.branchId,`${x.branchName} raporunda hata ve hukuki maruziyet sinyali var.`));
    data.insurance.filter(x=>x.usedAmount/x.coverageAmount>.70).forEach(x=>push("Sigorta limiti doluyor","kritik",x.branchId,`${x.branchName} sigorta kullanım oranı kritik seviyeye yaklaştı.`));
    data.contracts.filter(x=>x.terminationRiskScore>70).forEach(x=>push("Bayi fesih riski","kritik",x.branchId,`${x.branchName} fesih risk skoru ${x.terminationRiskScore}/100.`));
    return alerts;
  }

  function createLegalData(branchRows){
    const contracts = createContracts(branchRows);
    const legalCases = createLegalCases(branchRows);
    const legalComplaints = createLegalComplaints(branchRows);
    const reportData = createReports(branchRows);
    const compliance = createCompliance(branchRows, contracts);
    const insurance = createInsurance(branchRows, reportData.reportResponsibilities);
    const legal = {contracts, legalCases, legalComplaints, compliance, insurance, ...reportData};
    return {...legal, legalAlerts:createLegalAlerts(legal)};
  }

  const api = { createLegalData };
  global.OTOTR_LEGAL_DEMO = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
