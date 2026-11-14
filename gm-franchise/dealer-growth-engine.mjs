const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};

export const GROWTH_DIMENSIONS = freeze([
  {code:'population_vehicle_park',label:'Nüfus ve araç parkı',polarity:'positive',weight:10,owner:'Pazarlama'},
  {code:'used_vehicle_sales',label:'İkinci el satış yoğunluğu',polarity:'positive',weight:10,owner:'Pazarlama'},
  {code:'competitor_density',label:'Rakip ekspertiz merkezleri',polarity:'inverse',weight:10,owner:'Franchise'},
  {code:'gallery_clusters',label:'Galeri kümeleri',polarity:'positive',weight:10,owner:'Pazarlama / Saha'},
  {code:'travel_time',label:'Ulaşım süresi',polarity:'positive',weight:10,owner:'Operasyon / Mimari'},
  {code:'rent_staff_cost',label:'Kira ve personel maliyetleri',polarity:'inverse',weight:10,owner:'Finans'},
  {code:'regional_price_level',label:'Bölgesel fiyat seviyesi',polarity:'positive',weight:10,owner:'Finans / Pazarlama'},
  {code:'existing_branch_impact',label:'Mevcut OTOTR şubelerine etkisi',polarity:'inverse',weight:10,owner:'Franchise / Operasyon'},
  {code:'candidate_financial_capacity',label:'Adayın finansal kapasitesi',polarity:'positive',weight:10,owner:'Finans'},
  {code:'operations_brand_fit',label:'Operasyon ve marka uyumu',polarity:'positive',weight:10,owner:'Franchise / Operasyon'}
]);

export const DEALER_GROWTH_PROFILES = freeze([
  {
    code:'bursa-nilufer-ucevler', candidate:'Demo Yatırımcı A.Ş.', location:'Bursa · Nilüfer · Üçevler',
    scores:{population_vehicle_park:89,used_vehicle_sales:91,competitor_density:42,gallery_clusters:94,travel_time:86,rent_staff_cost:52,regional_price_level:84,existing_branch_impact:28,candidate_financial_capacity:91,operations_brand_fit:88},
    economics:{monthlyRent:310000,expectedMonthlyRevenue:2000000,targetRentRevenueRatio:12.5},
    alternatives:[{name:'Üçevler Güney Mikro Bölgesi',distanceMeters:600,direction:'güney',demandRetentionPercent:96,costSavingPercent:18}]
  },
  {
    code:'istanbul-pendik-kaynarca', candidate:'Sentetik Marmara Otomotiv Ltd.', location:'İstanbul · Pendik · Kaynarca',
    scores:{population_vehicle_park:86,used_vehicle_sales:88,competitor_density:67,gallery_clusters:82,travel_time:74,rent_staff_cost:70,regional_price_level:90,existing_branch_impact:61,candidate_financial_capacity:78,operations_brand_fit:76},
    economics:{monthlyRent:460000,expectedMonthlyRevenue:2800000,targetRentRevenueRatio:13},
    alternatives:[{name:'Kaynarca Doğu Mikro Bölgesi',distanceMeters:950,direction:'doğu',demandRetentionPercent:93,costSavingPercent:14}]
  },
  {
    code:'ankara-cankaya-balgat', candidate:'Sentetik Başkent Ekspertiz A.Ş.', location:'Ankara · Çankaya · Balgat',
    scores:{population_vehicle_park:80,used_vehicle_sales:77,competitor_density:79,gallery_clusters:68,travel_time:71,rent_staff_cost:76,regional_price_level:82,existing_branch_impact:54,candidate_financial_capacity:66,operations_brand_fit:72},
    economics:{monthlyRent:390000,expectedMonthlyRevenue:2100000,targetRentRevenueRatio:13.5},
    alternatives:[{name:'Balgat Güneybatı Mikro Bölgesi',distanceMeters:1200,direction:'güneybatı',demandRetentionPercent:88,costSavingPercent:21}]
  }
]);

const numberInRange = (value,label,min=0,max=100) => {
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max) throw new TypeError(`${label} ${min}-${max} aralığında olmalıdır`);
  return number;
};

export function recommendationFor(score){
  if(score>=80)return {code:'strong',label:'Güçlü aday',tone:'ok'};
  if(score>=65)return {code:'conditional',label:'Şartlı ilerleme',tone:'wn'};
  if(score>=50)return {code:'manager_review',label:'Yönetici incelemesi',tone:'wn'};
  return {code:'not_recommended',label:'Önerilmiyor',tone:'rd'};
}

export function evaluateDealerGrowth(profile,{dimensions=GROWTH_DIMENSIONS}={}){
  if(!profile||typeof profile!=='object')throw new TypeError('Aday/lokasyon profili zorunludur');
  if(!Array.isArray(dimensions)||dimensions.length!==10)throw new TypeError('Karar motoru tam olarak 10 boyut içermelidir');
  const codes=new Set(dimensions.map(item=>item.code));
  if(codes.size!==10)throw new TypeError('Karar motoru boyut kodları tekil olmalıdır');
  const totalWeight=dimensions.reduce((sum,item)=>sum+numberInRange(item.weight,`${item.label} ağırlığı`,0,100),0);
  if(Math.abs(totalWeight-100)>0.001)throw new TypeError('Karar motoru ağırlıkları toplamı 100 olmalıdır');
  const metrics=dimensions.map(dimension=>{
    if(!Object.hasOwn(profile.scores||{},dimension.code))throw new TypeError(`${dimension.label} skoru eksik`);
    const rawScore=numberInRange(profile.scores[dimension.code],dimension.label);
    const adjustedScore=dimension.polarity==='inverse'?100-rawScore:rawScore;
    return {...dimension,rawScore,adjustedScore,contribution:adjustedScore*dimension.weight/100};
  });
  const score=Math.round(metrics.reduce((sum,item)=>sum+item.contribution,0)*10)/10;
  const recommendation=recommendationFor(score);
  const monthlyRent=numberInRange(profile.economics?.monthlyRent,'Aylık kira',0,1000000000);
  const expectedMonthlyRevenue=numberInRange(profile.economics?.expectedMonthlyRevenue,'Beklenen aylık ciro',1,1000000000);
  const targetRentRevenueRatio=numberInRange(profile.economics?.targetRentRevenueRatio,'Hedef kira/ciro oranı',0,100);
  const rentRevenueRatio=Math.round(monthlyRent/expectedMonthlyRevenue*1000)/10;
  const rentRatioAboveTarget=rentRevenueRatio>targetRentRevenueRatio;
  const alternatives=[...(profile.alternatives||[])].sort((a,b)=>b.costSavingPercent-a.costSavingPercent||b.demandRetentionPercent-a.demandRetentionPercent);
  const bestAlternative=alternatives[0]||null;
  const risks=metrics.filter(item=>item.adjustedScore<50).map(item=>`${item.label}: ${item.adjustedScore}/100 düzeltilmiş skor`);
  if(rentRatioAboveTarget)risks.unshift(`Kira/ciro oranı %${rentRevenueRatio}; hedef %${targetRentRevenueRatio}`);
  let narrative=`${profile.location} lokasyonu ${score>=80?'güçlü':score>=65?'şartlı olarak ilerlenebilir':score>=50?'yönetici incelemesi gerektiriyor':'mevcut varsayımlarla önerilmiyor'}.`;
  if(rentRatioAboveTarget)narrative+=` Ancak kira/ciro oranı %${rentRevenueRatio} ile %${targetRentRevenueRatio} hedefinin üzerinde.`;
  if(bestAlternative)narrative+=` ${bestAlternative.distanceMeters} metre ${bestAlternative.direction} yönündeki bölgede talebin %${bestAlternative.demandRetentionPercent} kadarı korunarak toplam yerleşim maliyeti %${bestAlternative.costSavingPercent} azaltılabilir.`;
  return freeze({
    profileCode:profile.code,candidate:profile.candidate,location:profile.location,score,recommendation,metrics,
    economics:{monthlyRent,expectedMonthlyRevenue,targetRentRevenueRatio,rentRevenueRatio,rentRatioAboveTarget},
    bestAlternative,risks,narrative,
    nextGate:{owner:'Franchise Sorumlusu',reviewers:['Finans Sorumlusu','Operasyon / Mimari','Hukuk'],finalApprover:'Genel Müdür / Kurul'},
    finalDecisionRequired:true,productionDataUsed:false,evidenceBoundary:'Sentetik demo verisi; canlı pazar, saha ve finans kanıtı değildir.'
  });
}
