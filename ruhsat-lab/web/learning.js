"use strict";
(function(){
  let managementRestricted=false, supportsConditions=false;
  let prefs=RuhsatQualityPolicy.preferences();
  try{prefs=RuhsatQualityPolicy.preferences(JSON.parse(preferenceStorage?.getItem('ototr-ocr-quality-v1')||'{}'));}catch{}
  $('qualityGeneral').value=prefs.general;
  $('qualityVin').value=prefs.vin;
  $('qualityPreprocessing').value=prefs.preprocessing;
  function parameters(){return {preprocessing:$('qualityPreprocessing').value,review_threshold:$('qualityGeneral').value,vin_threshold:$('qualityVin').value};}
  function auth(kind){const value=$(kind==='admin'?'qualityAdminToken':'qualityApiToken').value.trim();return value?{Authorization:'Bearer '+value}:{};}
  function sync(){
    ['qualityCondition','qualityGeneral','qualityVin','qualityPreprocessing','qualityRefresh','qualitySynthetic','qualityApiToken','qualityAdminToken'].forEach(id=>$(id).disabled=state.busy);
    $('qualityCondition').disabled=state.busy||!supportsConditions;
    $('qualitySave').disabled=managementRestricted||state.busy||!state.result?.request_id||!vehicleFields().some(f=>state.confirmed.has(f.key));
    if(managementRestricted){$('qualityRefresh').disabled=true;$('qualitySynthetic').disabled=true;}
  }
  function health(info){
    supportsConditions=["0.3.0","0.3.1","0.3.2","0.3.3"].includes(info.version);
    $('qualityAccess').hidden=info.access_mode!=='server_token';$('qualityCompatibility').hidden=['0.2.0','0.3.0','0.3.1','0.3.2','0.3.3'].includes(info.version);
    managementRestricted=['public_test','email_protected_preview'].includes(info.access_mode);
    if(managementRestricted)$('qualityMessage').textContent='Bu açık test bağlantısında geri bildirim yönetimi kapalıdır. Güven eşikleri ve görüntü iyileştirme kullanılabilir. Anonim sonuçları bilgisayarınızdaki yerel kalite panelinden kaydedebilirsiniz.';
  }
  for(const id of ['qualityGeneral','qualityVin','qualityPreprocessing'])$(id).addEventListener('change',()=>{
    const general=Number($('qualityGeneral').value),vin=Number($('qualityVin').value);
    if(!$('qualityGeneral').checkValidity()||!$('qualityVin').checkValidity()){toast('Güven eşiği 0,50 ile 1,00 arasında olmalı.',true);return;}
    prefs=RuhsatQualityPolicy.preferences({general,vin,preprocessing:$('qualityPreprocessing').value});
    try{preferenceStorage?.setItem('ototr-ocr-quality-v1',JSON.stringify(prefs));}catch{}
    $('qualityMessage').textContent='Ayarlar bir sonraki okumada uygulanacak. Mevcut sonuç değişmedi.';
  });
  async function stats(){
    const data=await apiRequest('/api/admin/feedback?synthetic='+$('qualitySynthetic').checked,{headers:auth('admin')});
    $('qualityStatsSummary').textContent=`${data.documents_reviewed} inceleme · ${data.synthetic?'Kurgusal test':'Gerçek belge'} · Yalnız insan tarafından kontrol edilen alanlar`;
    const body=$('qualityStatsBody');body.replaceChildren();
    for(const row of data.rows){const tr=node('tr');const label=RuhsatFieldSettings.catalog.find(f=>f.key===row.key)?.label||row.key;for(const text of [label,row.mode==='detailed'?'Ayrıntılı':'Hızlı',row.preprocessing==='contrast'?'Kontrast':'Standart',row.engine_version,({unknown:'Belirtilmedi',clear:'Net',blur:'Bulanık',glare:'Yansıma',skew:'Eğik',small:'Küçük yazı',mixed:'Birden fazla'})[row.condition]||'Belirtilmedi',String(row.reviewed),String(row.corrected),String(row.originally_missing),Math.round(row.unchanged_rate*100)+'%'])tr.append(node('td','',text));body.append(tr);}
    $('qualityStats').hidden=!data.rows.length;
  }
  $('qualityRefresh').addEventListener('click',async()=>{try{await stats();}catch(error){toast(error.message,true);}});
  $('qualitySave').addEventListener('click',async()=>{
    $('qualitySave').disabled=true;
    try{
      const payload=RuhsatQualityPolicy.feedback(state.result,vehicleFields(),state.edits,state.confirmed,state.sample,$('qualityCondition').value);
      await apiRequest('/api/admin/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-OTOTR-Client':'ruhsat-lab',...auth('admin')},body:JSON.stringify(payload)});
      $('qualityMessage').textContent=`${payload.fields.length} kontrol edilmiş alanın anonim sonucu kaydedildi. Fotoğraf ve alan değerleri kaydedilmedi. Model henüz eğitilmedi.`;
      $('qualitySynthetic').checked=payload.synthetic;await stats();toast('Anonim geri bildirim kaydedildi.');
    }catch(error){toast(error.message,true);}finally{sync();}
  });
  window.RuhsatLearning={parameters,auth,sync,health};
  window.addEventListener('pagehide',()=>{$('qualityApiToken').value='';$('qualityAdminToken').value='';});
  sync();
})();
