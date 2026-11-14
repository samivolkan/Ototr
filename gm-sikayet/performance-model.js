(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.OTOTRComplaintPerformance=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const LEVELS=["Bölge","Şube","Kişi"];
  const DEFAULT_TARGETS={
    "Bölge":{sla:92,recovery:78,repeatMax:8,csat:4.4},
    "Şube":{sla:90,recovery:75,repeatMax:10,csat:4.3},
    "Kişi":{sla:88,recovery:72,repeatMax:12,csat:4.2}
  };
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  function score(metrics,target){
    const sla=clamp((metrics.sla/target.sla)*100);
    const recovery=clamp((metrics.recovery/target.recovery)*100);
    const repeat=clamp(((target.repeatMax-Math.max(0,metrics.repeatRate-target.repeatMax))/target.repeatMax)*100);
    const csat=clamp((metrics.csat/target.csat)*100);
    const weighted=Math.round(sla*.45+recovery*.2+repeat*.2+csat*.15);
    if(metrics.sla<80) return Math.min(64,weighted);
    if(metrics.sla<target.sla) return Math.min(79,weighted);
    return weighted;
  }
  function status(value){return value>=95?"Hedef üstü":value>=80?"Hedefte":value>=65?"İzle":"Aksiyon gerekli";}
  function aggregate(cases,level,key){
    const rows=cases.filter(x=>level==="Bölge"?x.region===key:level==="Şube"?x.b===key:x.u===key);
    const open=rows.filter(x=>x.s<7), breached=open.filter(x=>x.left<0).length;
    const decided=rows.filter(x=>x.karar), recovered=decided.filter(x=>x.karar!=="Haksız").length;
    const repeated=rows.filter(x=>x.ro>0).length;
    return {count:rows.length,open:open.length,sla:Math.round(100*(1-breached/Math.max(1,open.length))),recovery:Math.round(100*recovered/Math.max(1,decided.length)),repeatRate:Math.round(100*repeated/Math.max(1,rows.length)),csat:+(4.7-Math.min(1.5,breached*.08+repeated*.05)).toFixed(1)};
  }
  function normalizeTarget(level,input){
    const base=DEFAULT_TARGETS[level]||DEFAULT_TARGETS["Şube"];
    return {sla:clamp(input.sla||base.sla,1,100),recovery:clamp(input.recovery||base.recovery,1,100),repeatMax:clamp(input.repeatMax||base.repeatMax,1,100),csat:Math.max(1,Math.min(5,Number(input.csat||base.csat)))};
  }
  function actionFor(metric){
    if(metric.sla<80) return {type:"Operasyon",owner:"Şube Müdürü",text:"SLA darboğazı için 7 günlük iyileştirme planı aç"};
    if(metric.repeatRate>12) return {type:"Academy",owner:"Kalite + İK",text:"Tekrarlayan kök neden için zorunlu eğitim ata"};
    if(metric.recovery<65) return {type:"Müşteri Deneyimi",owner:"CRM",text:"Geri kazanım araması ve yönetici incelemesi başlat"};
    return {type:"İzleme",owner:"Bölge Müdürü",text:"Hedefleri haftalık takip et"};
  }
  return {LEVELS,DEFAULT_TARGETS,score,status,aggregate,normalizeTarget,actionFor};
});
