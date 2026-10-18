"use strict";
const RuhsatFieldSettings = (() => {
  const storageKey = "ototr.ruhsat.field-selection.v1";
  const catalog = [
    {key:"plate",label:"Plaka",group:"Araç kimliği",required:true},
    {key:"vin",label:"Şasi numarası",group:"Araç kimliği",required:true},
    {key:"brand",label:"Marka",group:"Araç kimliği"},
    {key:"kind",label:"Ticari adı",group:"Araç kimliği"},
    {key:"type",label:"Tipi",group:"Araç kimliği"},
    {key:"model_year",label:"Model yılı",group:"Araç kimliği"},
    {key:"engine_no",label:"Motor numarası",group:"Araç kimliği"},
    {key:"color",label:"Renk",group:"Araç özellikleri"},
    {key:"fuel_type",label:"Yakıt cinsi",group:"Araç özellikleri"},
    {key:"vehicle_category",label:"Cinsi",group:"Araç özellikleri"},
    {key:"vehicle_class",label:"Araç sınıfı",group:"Araç özellikleri"},
    {key:"engine_capacity",label:"Silindir hacmi",group:"Araç özellikleri"},
    {key:"engine_power",label:"Motor gücü",group:"Araç özellikleri"},
    {key:"usage_purpose",label:"Kullanım şekli",group:"Araç özellikleri"},
    {key:"registration_date",label:"Tescil tarihi",group:"Tescil bilgileri"},
    {key:"first_registration_date",label:"İlk tescil tarihi",group:"Tescil bilgileri"},
    {key:"document_serial_no",label:"Belge seri numarası",group:"Tescil bilgileri"},
    {key:"net_weight",label:"Net ağırlık",group:"Ek teknik bilgiler",extra:true},
    {key:"max_loaded_weight",label:"Azami yüklü ağırlık",group:"Ek teknik bilgiler",extra:true},
    {key:"seat_count",label:"Koltuk sayısı",group:"Ek teknik bilgiler",extra:true},
    {key:"standing_passenger_count",label:"Ayakta yolcu sayısı",group:"Ek teknik bilgiler",extra:true},
    {key:"owner_name",label:"Sahibin adı",group:"Geçici satıcı önerisi",transient:true},
    {key:"owner_surname",label:"Soyadı / unvanı",group:"Geçici satıcı önerisi",transient:true},
    {key:"tc_or_tax_no",label:"T.C. / vergi numarası",group:"Geçici satıcı önerisi",transient:true}
  ];
  const defaults = catalog.filter(f=>!f.extra).map(f=>f.key);
  function normalize(keys) {
    if (!Array.isArray(keys)) return [...defaults];
    const chosen = new Set(keys.filter(key=>typeof key === "string"));
    return catalog.filter(f=>f.required||chosen.has(f.key)).map(f=>f.key);
  }
  function preset(name) {
    return normalize(name === "all" ? catalog.map(f=>f.key) : name === "minimal" ? [] : defaults);
  }
  function read(storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey));
      return saved?.version === 1 ? normalize(saved.fields) : [...defaults];
    } catch { return [...defaults]; }
  }
  function save(storage, keys) {
    // Persist only version and known field keys. Never accept result objects,
    // names, identifiers, edited values, filenames, or raw OCR here.
    const safe = {version:1,fields:normalize(keys)};
    try { storage.setItem(storageKey,JSON.stringify(safe)); return true; }
    catch { return false; }
  }
  return {storageKey,catalog,defaults,normalize,preset,read,save};
})();
if (typeof module !== "undefined" && module.exports) module.exports = RuhsatFieldSettings;
