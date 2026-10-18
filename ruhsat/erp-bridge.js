"use strict";
// The ERP gets only explicitly reviewed vehicle values, never the full OCR result.
if (window.RUHSAT_CONFIG?.erp && window.parent !== window) {
  const transfer = document.createElement("button");
  transfer.type = "button";
  transfer.className = "primary-button";
  transfer.textContent = "Kontrol edilen araç bilgilerini iş emrine aktar";
  transfer.disabled = true;
  document.querySelector(".export-actions").append(transfer);
  const sync = () => { transfer.disabled = !reviewReady(); };
  document.addEventListener("change", sync);
  document.addEventListener("input", sync);
  // A new result/reset must invalidate the previous document's transfer state.
  new MutationObserver(sync).observe(document.getElementById("exportBtn"), {attributes:true, attributeFilter:["disabled"]});
  transfer.addEventListener("click", () => {
    if (!reviewReady()) return;
    const data = exportData(true).analysed.Data;
    window.parent.postMessage({type:"ototr:ruhsat-reviewed", version:1, data}, window.location.origin);
  });
}
