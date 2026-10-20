(function(root){
  "use strict";
  const keys=new Set(['plate','vin','brand','kind','type','model_year','engine_no','color','fuel_type','vehicle_class','vehicle_category','registration_date','first_registration_date','document_serial_no','usage_purpose','engine_capacity','engine_power','net_weight','max_loaded_weight','seat_count','standing_passenger_count']);
  function preferences(value={}) {
    const threshold=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)&&v>=.5&&v<=1?v:fallback;
    return {general:threshold(value?.general,.90),vin:threshold(value?.vin,.95),preprocessing:value?.preprocessing==='contrast'?'contrast':'standard'};
  }
  function categoryCode(value){
    const text=String(value||"").toLocaleUpperCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/İ/g,"I");
    const m=text.match(/^OTOMOBIL\s*[-(]?\s*(AA|AB|AC|AD|AE|AF|AG)\s+([A-Z ]+)\)?$/);
    if(!m)return null;
    const names={AA:["SEDAN"],AB:["HECBEK","HATCHBACK"],AC:["STEYSIN","STATION WAGON"],AD:["KUPE","COUPE"],AE:["KABRIYO","CABRIOLET"],AF:["COK AMACLI"],AG:["TRUCK STATION WAGON"]};
    return names[m[1]].includes(m[2].trim())?m[1]:null;
  }
  function feedback(result,fields,edits,confirmed,synthetic,condition="unknown",revision=1){
    if(!result?.request_id||!['0.2.0','0.3.0','0.3.1','0.3.2','0.3.3'].includes(result.engine_version))throw Error('Bu sonuç kalite panelini desteklemiyor. Yeni sürümle tekrar okuyun.');
    const outcomes=fields.filter(f=>keys.has(f.key)&&confirmed.has(f.key)&&String(edits[f.key]??f.value??'').trim()).map(f=>({key:f.key,corrected:String(edits[f.key]??f.value??'').trim()!==String(f.value??'').trim(),originally_missing:f.value===null||f.value===undefined||f.value==='',confidence:Number.isFinite(f.confidence)?Math.min(1,Math.max(0,f.confidence)):0}));
    if(revision>=2)for(const outcome of outcomes){
      if(outcome.key==='vehicle_category'&&outcome.corrected){
        const code=categoryCode(edits[outcome.key]);if(code)outcome.category_target=code;
      }
    }
    if(!outcomes.length&&revision<2)throw Error('Önce en az bir araç alanını fotoğrafla karşılaştırıp kontrol edin.');
    const payload={request_id:result.request_id,engine_version:result.engine_version,mode:result.mode,preprocessing:result.preprocessing||'standard',synthetic:synthetic===true,condition:["unknown","clear","blur","glare","skew","small","mixed"].includes(condition)?condition:"unknown",fields:outcomes};
    if(!["0.3.0","0.3.1","0.3.2","0.3.3"].includes(result.engine_version))delete payload.condition;
    return payload;
  }
  function feedbackQueue(send,onSaved=()=>{},onError=()=>{}){
    const pending=new Map(),last=new Map();let running=false;
    async function drain(){
      if(running)return;running=true;
      try{while(pending.size){
        const [id,item]=pending.entries().next().value;pending.delete(id);
        try{await send(item.payload);onSaved(item.payload);}
        catch(error){if(last.get(id)===item.signature)last.delete(id);onError(error,item.payload);}
      }}finally{running=false;}
    }
    return {submit(payload){
      const signature=JSON.stringify(payload),id=payload.request_id;
      if(last.get(id)===signature)return;
      last.set(id,signature);if(last.size>100)last.delete(last.keys().next().value);
      pending.set(id,{payload,signature});void drain();
    }};
  }
  const api={preferences,feedback,categoryCode,feedbackQueue};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RuhsatQualityPolicy=api;
})(typeof window==='object'?window:globalThis);
