(function(root){
  "use strict";
  const keys=new Set(['plate','vin','brand','kind','type','model_year','engine_no','color','fuel_type','vehicle_class','vehicle_category','registration_date','first_registration_date','document_serial_no','usage_purpose','engine_capacity','engine_power','net_weight','max_loaded_weight','seat_count','standing_passenger_count']);
  function preferences(value={}) {
    const threshold=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)&&v>=.5&&v<=1?v:fallback;
    return {general:threshold(value?.general,.90),vin:threshold(value?.vin,.95),preprocessing:value?.preprocessing==='contrast'?'contrast':'standard'};
  }
  function feedback(result,fields,edits,confirmed,synthetic){
    if(!result?.request_id||result.engine_version!=='0.2.0')throw Error('Bu sonuç kalite panelini desteklemiyor. Yeni sürümle tekrar okuyun.');
    const outcomes=fields.filter(f=>keys.has(f.key)&&confirmed.has(f.key)&&String(edits[f.key]??f.value??'').trim()).map(f=>({key:f.key,corrected:String(edits[f.key]??f.value??'').trim()!==String(f.value??'').trim(),originally_missing:f.value===null||f.value===undefined||f.value==='',confidence:Number.isFinite(f.confidence)?Math.min(1,Math.max(0,f.confidence)):0}));
    if(!outcomes.length)throw Error('Önce en az bir araç alanını fotoğrafla karşılaştırıp kontrol edin.');
    return {request_id:result.request_id,engine_version:result.engine_version,mode:result.mode,preprocessing:result.preprocessing||'standard',synthetic:synthetic===true,fields:outcomes};
  }
  const api={preferences,feedback};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RuhsatQualityPolicy=api;
})(typeof window==='object'?window:globalThis);
