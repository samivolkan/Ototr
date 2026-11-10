(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.OTOTRBranchHealth=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0';
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const safe=(n,fallback=null)=>Number.isFinite(Number(n))?Number(n):fallback;
  const AREAS=[
    {id:'operations',label:'Operasyon',weight:.16,owner:'Operasyon',signals:['İşlem süresi','Geciken rapor','Kapasite']},
    {id:'customer',label:'Müşteri',weight:.15,owner:'Müşteri Deneyimi',signals:['NPS','Şikâyet','Tekrar ziyaret']},
    {id:'reputation',label:'İtibar',weight:.12,owner:'İtibar Yönetimi',signals:['Google puanı','Negatif yorum hızı']},
    {id:'quality',label:'Kalite',weight:.17,owner:'Kalite',signals:['Denetim','Hata','CAPA kapanışı']},
    {id:'finance',label:'Finans',weight:.14,owner:'Finans',signals:['Ciro','Paket ortalaması','Royalty']},
    {id:'people',label:'İnsan',weight:.10,owner:'İK / Academy',signals:['Personel devri','Eğitim','Sertifika']},
    {id:'legal',label:'Hukuk',weight:.09,owner:'Hukuk',signals:['Açık dosya','Risk tutarı','SLA']},
    {id:'growth',label:'Büyüme',weight:.07,owner:'Satış / Pazarlama',signals:['Lead','Randevu','Satış dönüşümü']}
  ];
  const get=(obj,path,fallback=null)=>path.split('.').reduce((v,k)=>v&&v[k]!==undefined?v[k]:undefined,obj)??fallback;
  function scoreInputs(branch,detail={},context={}){
    const active=branch.status==='Aktif';
    const complaints=safe(detail.complaints,0), sla=safe(detail.sla,active?75:0), capacity=safe(detail.capacity,0);
    const google=safe(branch.google,0), quality=safe(branch.quality,0), nps=safe(branch.nps,null);
    const revenue=safe(branch.revenue,0), royalty=safe(branch.royalty,0), training=safe(detail.training,0);
    const waitMinutes=safe(String(detail.wait||'').match(/\d+/)?.[0],active?35:0);
    const complaintScore=clamp(100-complaints*5.5);
    const revenueTarget=safe(context.revenueTarget,active?1200000:1);
    const royaltyExpected=revenue*.12;
    const legal=get(context,'legalByBranch.'+branch.name,{});
    const marketing=get(context,'growthByBranch.'+branch.name,{});
    const scores={
      operations:active?clamp(sla*.45+capacity*.30+clamp(110-waitMinutes*2)*.25):null,
      customer:active?clamp((nps===null?complaintScore:nps)*.48+complaintScore*.42+safe(context.repeatVisitScore,70)*.10):null,
      reputation:google>0?clamp(google*20*.72+clamp(100-safe(context.negativeReviewVelocity,complaints)*7)*.28):null,
      quality:quality>0?clamp(quality*.62+safe(context.capaClosureScore,sla)*.23+clamp(100-safe(context.errorRate,complaints*2))*.15):null,
      finance:active?clamp(clamp(revenue/revenueTarget*100)*.55+clamp(safe(detail.avgTicket,0)/1800*100)*.25+clamp(royaltyExpected?royalty/royaltyExpected*100:0)*.20):null,
      people:training>0?clamp(training*.60+safe(context.certificationScore,training)*.25+clamp(100-safe(context.turnoverRate,12)*2)*.15):null,
      legal:legal.score!==undefined?clamp(legal.score):active?clamp(100-complaints*2.5):null,
      growth:marketing.score!==undefined?clamp(marketing.score):active?clamp(70+safe(branch.growth,0)*1.2):null
    };
    return scores;
  }
  function calculate(branch,detail={},context={}){
    const scores=scoreInputs(branch,detail,context);
    const available=AREAS.filter(a=>scores[a.id]!==null);
    const availableWeight=available.reduce((s,a)=>s+a.weight,0);
    const healthScore=availableWeight?Math.round(available.reduce((s,a)=>s+scores[a.id]*a.weight,0)/availableWeight):0;
    const coverage=Math.round(availableWeight*100);
    const negative=available.map(a=>({...a,score:Math.round(scores[a.id]),impact:Math.round((100-scores[a.id])*a.weight*10)/10})).sort((a,b)=>b.impact-a.impact);
    const trendPenalty=clamp((safe(context.scoreDrop30d,Math.max(0,-safe(branch.growth,0)))*1.4),0,18);
    const rawRisk=clamp((100-healthScore)*1.05+trendPenalty+(coverage<70?8:0));
    const fallbackProbability=Math.round(100/(1+Math.exp(-(rawRisk-27)/9)));
    const prediction=context.prediction&&context.prediction.modelVersion&&safe(context.prediction.probability,null)!==null
      ?{probability:Math.round(clamp(context.prediction.probability*100)),source:'bigquery_ml',modelVersion:context.prediction.modelVersion,generatedAt:context.prediction.generatedAt||null}
      :{probability:fallbackProbability,source:'rules_preview',modelVersion:null,generatedAt:null};
    const level=prediction.probability>=70?'Kritik':prediction.probability>=45?'Yüksek':prediction.probability>=25?'İzlem':'Düşük';
    const reasons=negative.slice(0,3).map(a=>({area:a.id,label:a.label,score:a.score,impact:a.impact,owner:a.owner,explanation:`${a.label} alanı ${a.score}/100; bileşik skoru aşağı çeken başlıca sinyaller: ${a.signals.join(', ')}.`}));
    return {version:VERSION,healthScore,coverage,prediction,level,scores,reasons,missing:AREAS.filter(a=>scores[a.id]===null).map(a=>a.label),evaluatedAt:new Date().toISOString()};
  }
  function network(branches,details={},context={}){
    const rows=(branches||[]).map(b=>({branch:b,result:calculate(b,details[b.id]||{},context[b.id]||{})}));
    const usable=rows.filter(x=>x.result.coverage>=50);
    return {rows,healthScore:usable.length?Math.round(usable.reduce((s,x)=>s+x.result.healthScore,0)/usable.length):0,risky:rows.filter(x=>x.result.prediction.probability>=45).length,coverage:rows.length?Math.round(rows.reduce((s,x)=>s+x.result.coverage,0)/rows.length):0};
  }
  return {VERSION,AREAS,calculate,network,scoreInputs};
});
