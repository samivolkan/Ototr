"use strict";
// An allowlist prevents owner values (including edits and alternatives) and
// future unclassified fields from entering either downloadable JSON variant.
const RuhsatDataPolicy = (() => {
  const vehicleKeys = new Set([
    "plate", "vin", "brand", "kind", "type", "model_year", "engine_no",
    "color", "fuel_type", "vehicle_class", "vehicle_category",
    "registration_date", "first_registration_date", "document_serial_no",
    "usage_purpose", "engine_capacity", "engine_power", "net_weight",
    "max_loaded_weight", "seat_count", "standing_passenger_count"
  ]);
  const ownerKeys = new Set(["owner_name", "owner_surname", "tc_or_tax_no"]);
  function vehicleFields(result) { return (result?.fields ?? []).filter(f => vehicleKeys.has(f.key)); }
  function suggestionFields(result) {
    // Also isolate owner fields from an older in-memory API response.
    return [...(result?.seller_suggestion?.fields ?? []), ...(result?.fields ?? [])]
      .filter((f, i, all) => ownerKeys.has(f.key) && all.findIndex(other => other.key === f.key) === i);
  }
  function buildExport(result, edits, confirmed, reviewed, sample, selectedKeys=null) {
    const selected = selectedKeys === null ? null : new Set(selectedKeys);
    const fields = vehicleFields(result).filter(f=>selected===null||selected.has(f.key)).map(f => {
      const value = String(edits[f.key] ?? f.value ?? "").trim() || null;
      return {...f, value, ocr_value:f.value, edited:value !== f.value, human_confirmed:confirmed.has(f.key)};
    });
    return {
      schema_version:result.schema_version, source:"ototr-ruhsat-lab", synthetic_sample:sample,
      review_state:reviewed?"human_reviewed":"draft", created_at:new Date().toISOString(),
      models:result.models, elapsed_seconds:result.elapsed_seconds,
      confidence_is_calibrated:false, document_recognized:result.document_recognized,
      warnings:result.warnings, analysed:{Data:Object.fromEntries(fields.map(f=>[f.key,f.value]))},
      fields, privacy:{seller_suggestions_included:false, image_and_raw_text_included:false}
    };
  }
  return {vehicleFields, suggestionFields, buildExport};
})();
if (typeof module !== "undefined" && module.exports) module.exports = RuhsatDataPolicy;
