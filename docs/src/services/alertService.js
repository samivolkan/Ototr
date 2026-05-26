(function(global){
  function getLegalAlerts(legalModule, kpis){
    const alerts = [...(legalModule.legalAlerts || [])];
    if(kpis.hukukMaliyetOrani > 4){
      alerts.push({type:"Hukuki maliyet yükseldi",severity:"uyarı",branchId:"GENEL",description:`Hukuki maliyet oranı %${kpis.hukukMaliyetOrani} seviyesine çıktı.`});
    }
    if(kpis.hukukiRiskPuani > 65){
      alerts.push({type:"Hukuki risk puanı yüksek",severity:"kritik",branchId:"GENEL",description:`Hukuki risk puanı ${kpis.hukukiRiskPuani}/100 seviyesinde.`});
    }
    if(kpis.raporHataOrani > 8){
      alerts.push({type:"Rapor hatası riski",severity:"uyarı",branchId:"GENEL",description:`Rapor hata oranı %${kpis.raporHataOrani}; kalite kontrol artırılmalı.`});
    }
    return alerts;
  }

  const api = { getLegalAlerts };
  global.OTOTR_ALERT_SERVICE = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
