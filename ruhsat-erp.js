"use strict";
(function (root) {
  // A second allowlist at the ERP boundary rejects seller fields and arbitrary keys.
  const mapping = Object.freeze({plate:"plate",vin:"vin",engine_no:"engineNo",brand:"vehicleMake",
    kind:"vehicleModel",model_year:"year",fuel_type:"fuel"});
  const extras = Object.freeze({type:'Tipi',color:'Renk',vehicle_category:'Cinsi',vehicle_class:'Araç sınıfı',
    registration_date:'Tescil tarihi',first_registration_date:'İlk tescil tarihi',engine_capacity:'Silindir hacmi (cm³)',
    engine_power:'Motor gücü (kW)',usage_purpose:'Kullanım şekli',document_serial_no:'Belge seri no',
    net_weight:'Net ağırlık (kg)',max_loaded_weight:'Azami yüklü ağırlık (kg)',seat_count:'Koltuk sayısı',standing_passenger_count:'Ayakta yolcu sayısı'});
  const textValue=value=>(typeof value==='string'||typeof value==='number')?String(value).trim().slice(0,120):'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function formValues(source={}) {
    return Object.fromEntries(Object.keys(extras).map(key=>['ruhsat_'+key,textValue(source['ruhsat_'+key]??source.ruhsatVehicle?.[key])]));
  }
  function persistence(source={}) {
    return {ruhsatVehicle:Object.fromEntries(Object.entries(formValues(source)).filter(([,v])=>v).map(([k,v])=>[k.slice(7),v]))};
  }
  function extraMarkup(source={}) {
    const values=formValues(source), count=Object.values(values).filter(Boolean).length;
    return `<details class="dealer-ruhsat-details" style="grid-column:1/-1;border:1px solid #dbe2ed;border-radius:10px;padding:12px;margin-top:8px" ${count?'open':''}><summary style="cursor:pointer;font-weight:700">Ruhsatın diğer araç bilgileri${count?' · '+count+' alan':''}</summary><p class="card-sub">Bu araç alanları iş emriyle kaydedilir. Ruhsat sahibinin kimliği, adı ve adresi dahil edilmez.</p><div class="dealer-ruhsat-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">${Object.entries(extras).map(([key,label])=>`<label class="dealer-wo-field"><span>${esc(label)}</span><input name="ruhsat_${key}" aria-label="${esc(label)}" value="${esc(values['ruhsat_'+key])}" autocomplete="off" maxlength="120"></label>`).join('')}</div></details>`;
  }
  function mergeDraft(previous={},incoming={}) {
    const draft={...previous};
    for(const key of [...Object.values(mapping),...Object.keys(extras).map(k=>'ruhsat_'+k),'vehicle','vehicleVariant'])delete draft[key];
    if(previous.vin&&previous.vin!==incoming.vin)delete draft.mileage;
    return {...draft,...incoming};
  }
  const fuelNames = Object.freeze({BENZIN:"Benzin",BENZINLI:"Benzin",DIZEL:"Dizel",MOTORIN:"Dizel",
    ELEKTRIK:"Elektrik",ELEKTRIKLI:"Elektrik",HIBRIT:"Hibrit",LPG:"LPG"});
  function fuelChoice(value) {
    const label=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
    if(fuelNames[label])return fuelNames[label];
    if(/\b(?:HIBRIT|HYBRID|HEV|PHEV)\b/.test(label)||(/\b(?:BENZIN\w*|DIZEL|MOTORIN)\b/.test(label)&&/\bELEKTRIK\w*\b/.test(label)))return "Hibrit";
    if(/\bLPG\b/.test(label))return "LPG";
    if(/\bBENZIN\w*\b/.test(label))return "Benzin";
    if(/\b(?:DIZEL|MOTORIN)\b/.test(label))return "Dizel";
    if(/\bELEKTRIK\w*\b/.test(label))return "Elektrik";
    return value;
  }
  function vehicleDraft(data) {
    const draft = {};
    for (const [source,target] of Object.entries(mapping)) {
      if (typeof data?.[source] === "string" || typeof data?.[source] === "number") {
        const value = String(data[source]).trim().slice(0,120);
        if (value) draft[target] = value;
      }
    }
    if (!draft.plate || !/^[A-HJ-NPR-Z0-9]{17}$/.test(draft.vin || "")) return null;
    for(const key of Object.keys(extras)) {const value=textValue(data?.[key]);if(value)draft['ruhsat_'+key]=value;}
    if (draft.fuel) draft.fuel = fuelChoice(draft.fuel);
    return draft;
  }
  function page() {
    return '<section class="card" style="padding:12px"><div class="card-head"><div><div class="card-title">Ruhsattan iş emri</div><div class="card-sub">1. Ruhsatı yükle → 2. Araç bilgilerini kontrol et → 3. Paketi seç ve iş emrini aç. Sahip bilgileri yalnız geçici öneridir.</div></div><button type="button" class="btn" data-ruhsat-return>İş emrine dön</button></div><iframe id="ototrRuhsatFrame" title="OTOTR Ruhsat Okuma" style="width:100%;height:calc(100vh - 170px);min-height:700px;border:0;border-radius:12px" referrerpolicy="no-referrer"></iframe></section>';
  }
  function onRoute(routeName) {
    const frame = document.getElementById("ototrRuhsatFrame");
    if (!frame) return;
    if (routeName === "ruhsat") {
      if (!frame.getAttribute("src") || frame.getAttribute("src") === "about:blank") frame.src = "./ruhsat/index.html?v=20261020-2";
    } else if (frame.getAttribute("src") !== "about:blank") {
      frame.src = "about:blank";
    }
  }
  let transferring = false, pending = null;
  if(typeof document!=='undefined') document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-ruhsat-start]')){
      event.preventDefault();
      const form=document.getElementById('dealerWorkOrderForm'),ui=dealerPortalState();
      if(ui.editingWorkOrderId||ui.viewingWorkOrderId){toast('Ruhsattan yeni kayıt için önce Yeni İş Emri Aç düğmesini kullanın.');return;}
      pending={data:form?Object.fromEntries(new FormData(form).entries()):{},mode:ui.workOrderMode==='full'?'full':'fast'};
      route('ruhsat');
    }
    if(event.target.closest?.('[data-ruhsat-return]')){
      event.preventDefault();const previous=pending;pending=null;
      saveDealerPortalState({tab:'is-emirleri',editingWorkOrderId:'',viewingWorkOrderId:'',workOrderMode:previous?.mode||'fast'});
      route('dealer');renderDealerPageOnly();
      if(previous)dealerApplyWorkOrderDraft(document.getElementById('dealerWorkOrderForm'),previous.data);
    }
  });
  if (typeof window !== "undefined") window.addEventListener("message", async event => {
    const frame = document.getElementById("ototrRuhsatFrame");
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow ||
        event.data?.type !== "ototr:ruhsat-reviewed" || event.data.version !== 1) return;
    let draft = vehicleDraft(event.data.data);
    if (!draft) { toast("Plaka ve şasi kontrolünü tamamlayın."); return; }
    if (transferring) return;
    transferring = true;
    try {
    // Load the schema before routing: its deferred first-load render otherwise wipes the draft.
    await window.OTOTR_ASSET_LOADER?.loadInspectionSchema?.();
    if (!frame.isConnected || location.hash !== "#ruhsat") return;
    if (typeof applyInspectionSchemaToReportData === "function") applyInspectionSchemaToReportData();
    // Existing user-entered party/package selections stay in memory during OCR.
    draft=mergeDraft(pending?.data,draft);
    const mode=pending?.mode||'fast';pending=null;
    dealerClearStoredWorkOrderDraft();
    saveDealerPortalState({tab:"is-emirleri",editingWorkOrderId:"",viewingWorkOrderId:"",workOrderMode:mode});
    route("dealer");
    renderDealerPageOnly();
    const form = document.getElementById("dealerWorkOrderForm");
    if (!form) { toast("İş emri formu açılamadı. Bayi portalından giriş durumunu kontrol edin."); return; }
    if (draft.vehicleMake) draft.vehicleMake = dealerFindVehicleMake(draft.vehicleMake,false) || draft.vehicleMake;
    dealerApplyWorkOrderDraft(form,draft);
    const notice = document.createElement("p");
    notice.className = "card-sub";
    notice.textContent = "Ruhsatta kontrol ettiğiniz araç bilgileri dolduruldu. Ek bilgiler aşağıdaki Ruhsatın diğer araç bilgileri bölümünde. Paketi seçip İş Emrini Aç düğmesine basın. Sahip bilgileri aktarılmadı; iş emri henüz kaydedilmedi.";
    form.prepend(notice);
    form.scrollIntoView({behavior:"smooth",block:"start"});
    toast("Araç bilgileri iş emri taslağına aktarıldı. Kaydetmeden önce formu tamamlayın.");
    } catch (_) {
      toast("İş emri ekranı hazırlanamadı. Bağlantıyı kontrol edip yeniden aktarın.");
    } finally { transferring = false; }
  });
  root.OtotrRuhsatERP = {page,onRoute,vehicleDraft,extraMarkup,formValues,persistence,mergeDraft};
  if (typeof module !== "undefined") module.exports = {vehicleDraft,extraMarkup,formValues,persistence,mergeDraft};
})(typeof window !== "undefined" ? window : globalThis);
