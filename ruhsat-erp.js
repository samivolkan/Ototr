"use strict";
(function (root) {
  // A second allowlist at the ERP boundary rejects seller fields and arbitrary keys.
  const mapping = Object.freeze({plate:"plate",vin:"vin",engine_no:"engineNo",brand:"vehicleMake",
    kind:"vehicleModel",model_year:"year",fuel_type:"fuel"});
  const fuelNames = Object.freeze({BENZIN:"Benzin",BENZINLI:"Benzin",DIZEL:"Dizel",MOTORIN:"Dizel",
    ELEKTRIK:"Elektrik",ELEKTRIKLI:"Elektrik",HIBRIT:"Hibrit",LPG:"LPG"});
  function vehicleDraft(data) {
    const draft = {};
    for (const [source,target] of Object.entries(mapping)) {
      if (typeof data?.[source] === "string" || typeof data?.[source] === "number") {
        const value = String(data[source]).trim().slice(0,120);
        if (value) draft[target] = value;
      }
    }
    if (!draft.plate || !/^[A-HJ-NPR-Z0-9]{17}$/.test(draft.vin || "")) return null;
    if (draft.fuel) draft.fuel = fuelNames[draft.fuel.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()] || draft.fuel;
    return draft;
  }
  function page() {
    return '<section class="card" style="padding:12px"><div class="card-head"><div><div class="card-title">Ruhsat okuma</div><div class="card-sub">Fotoğrafı yükleyin, alanları kontrol edin ve araç bilgilerini iş emri taslağına aktarın. Sahip bilgileri yalnız geçici öneridir.</div></div></div><iframe id="ototrRuhsatFrame" title="OTOTR Ruhsat Okuma" style="width:100%;height:calc(100vh - 170px);min-height:700px;border:0;border-radius:12px" referrerpolicy="no-referrer"></iframe></section>';
  }
  function onRoute(routeName) {
    const frame = document.getElementById("ototrRuhsatFrame");
    if (!frame) return;
    if (routeName === "ruhsat") {
      if (!frame.getAttribute("src") || frame.getAttribute("src") === "about:blank") frame.src = "./ruhsat/index.html";
    } else if (frame.getAttribute("src") !== "about:blank") {
      frame.src = "about:blank";
    }
  }
  let transferring = false;
  if (typeof window !== "undefined") window.addEventListener("message", async event => {
    const frame = document.getElementById("ototrRuhsatFrame");
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow ||
        event.data?.type !== "ototr:ruhsat-reviewed" || event.data.version !== 1) return;
    const draft = vehicleDraft(event.data.data);
    if (!draft) { toast("Plaka ve şasi kontrolünü tamamlayın."); return; }
    if (transferring) return;
    transferring = true;
    try {
    // Load the schema before routing: its deferred first-load render otherwise wipes the draft.
    await window.OTOTR_ASSET_LOADER?.loadInspectionSchema?.();
    if (!frame.isConnected || location.hash !== "#ruhsat") return;
    if (typeof applyInspectionSchemaToReportData === "function") applyInspectionSchemaToReportData();
    // Only vehicle values cross this boundary. No automatic save or Supabase write.
    dealerClearStoredWorkOrderDraft();
    saveDealerPortalState({tab:"is-emirleri",editingWorkOrderId:"",viewingWorkOrderId:"",workOrderMode:"full"});
    route("dealer");
    renderDealerPageOnly();
    const form = document.getElementById("dealerWorkOrderForm");
    if (!form) { toast("İş emri formu açılamadı. Bayi portalından giriş durumunu kontrol edin."); return; }
    if (draft.vehicleMake) draft.vehicleMake = dealerFindVehicleMake(draft.vehicleMake,false) || draft.vehicleMake;
    dealerApplyWorkOrderDraft(form,draft);
    const notice = document.createElement("p");
    notice.className = "card-sub";
    notice.textContent = "Ruhsattan kontrol ettiğiniz plaka, şasi, motor no, marka, ticari ad, model yılı ve yakıt alanları taslağa aktarıldı. Diğer araç alanları ruhsat JSON çıktısında bulunur. Sahip bilgileri aktarılmadı. İş emri henüz kaydedilmedi.";
    form.prepend(notice);
    form.scrollIntoView({behavior:"smooth",block:"start"});
    toast("Araç bilgileri iş emri taslağına aktarıldı. Kaydetmeden önce formu tamamlayın.");
    } catch (_) {
      toast("İş emri ekranı hazırlanamadı. Bağlantıyı kontrol edip yeniden aktarın.");
    } finally { transferring = false; }
  });
  root.OtotrRuhsatERP = {page,onRoute,vehicleDraft};
  if (typeof module !== "undefined") module.exports = {vehicleDraft};
})(typeof window !== "undefined" ? window : globalThis);
