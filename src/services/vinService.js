(function(global){
  const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
  const CACHE_KEY = "ototr-vin-decode-cache-v1";
  const SOURCE_NHTSA = "NHTSA_VPIC";

  const MAKE_ALIASES = {
    VW: "Volkswagen",
    VOLKSWAGEN: "Volkswagen",
    MERCEDES: "Mercedes-Benz",
    MERCEDESBENZ: "Mercedes-Benz",
    "MERCEDES-BENZ": "Mercedes-Benz",
    BMW: "BMW",
    CITROEN: "Citroen",
    "CITROEN": "Citroen",
    "CITROËN": "Citroen",
    PEUGEOT: "Peugeot"
  };

  const WMI_MAKE_PREFIXES = [
    ["JTD", "Toyota"],
    ["JT", "Toyota"],
    ["WBA", "BMW"],
    ["WBS", "BMW"],
    ["W1K", "Mercedes-Benz"],
    ["WDD", "Mercedes-Benz"],
    ["WAU", "Audi"],
    ["WVW", "Volkswagen"],
    ["WV1", "Volkswagen"],
    ["VF1", "Renault"],
    ["WF0", "Ford"],
    ["ZFA", "Fiat"],
    ["VF3", "Peugeot"],
    ["VR3", "Peugeot"],
    ["VF7", "Citroen"],
    ["KMH", "Hyundai"],
    ["TMA", "Hyundai"],
    ["KNA", "Kia"],
    ["U5Y", "Kia"],
    ["W0L", "Opel"],
    ["UU1", "Dacia"],
    ["SHH", "Honda"],
    ["JN1", "Nissan"],
    ["TMB", "Skoda"],
    ["VSS", "Seat"],
    ["YV1", "Volvo"],
    ["5YJ", "Tesla"],
    ["NLH", "Togg"]
  ];

  function normalizeVin(input){
    return String(input || "").trim().toUpperCase().replace(/[\s-]+/g, "");
  }

  function validateVin(vin){
    const normalized = normalizeVin(vin);
    const errors = [];
    if(normalized.length !== 17){
      errors.push({ code: "VIN_INVALID_LENGTH", message: "Şasi numarası 17 karakter olmalıdır." });
    }
    if(/[IOQ]/.test(normalized)){
      errors.push({ code: "VIN_FORBIDDEN_CHARACTER", message: "Şasi numarası I, O veya Q harflerini içeremez." });
    }
    if(/[^A-Z0-9]/.test(normalized)){
      errors.push({ code: "VIN_INVALID_CHARACTER", message: "Şasi numarası sadece büyük harf ve rakam içermelidir." });
    }
    if(normalized.length === 17 && !VIN_REGEX.test(normalized) && !errors.length){
      errors.push({ code: "VIN_INVALID_FORMAT", message: "Şasi numarası 17 karakter olmalı ve I, O, Q harflerini içermemelidir." });
    }
    return { isValid: errors.length === 0 && VIN_REGEX.test(normalized), errors };
  }

  function extractVinParts(vin){
    const normalized = normalizeVin(vin);
    return {
      wmi: normalized.slice(0, 3),
      vds: normalized.slice(3, 9),
      vis: normalized.slice(9, 17)
    };
  }

  function normalizeVehicleText(value){
    const ascii = String(value || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/İ/g, "I")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ş/g, "S")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/[^A-Z0-9]/g, "");
    return MAKE_ALIASES[ascii] || ascii;
  }

  function canonicalMake(value){
    const key = normalizeVehicleText(value);
    return MAKE_ALIASES[key] || value || "";
  }

  function vinWmiMake(vin){
    const normalized = normalizeVin(vin);
    const row = WMI_MAKE_PREFIXES
      .slice()
      .sort((a,b) => b[0].length - a[0].length)
      .find(([prefix]) => normalized.startsWith(prefix));
    return row ? row[1] : "";
  }

  function stringsCompatible(left, right){
    const a = normalizeVehicleText(left);
    const b = normalizeVehicleText(right);
    if(!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  }

  function readCache(cacheStorageKey = CACHE_KEY){
    try{
      if(!global.localStorage) return {};
      return JSON.parse(global.localStorage.getItem(cacheStorageKey) || "{}") || {};
    }catch(err){ return {}; }
  }

  function writeCache(cache, cacheStorageKey = CACHE_KEY){
    try{
      if(global.localStorage) global.localStorage.setItem(cacheStorageKey, JSON.stringify(cache || {}));
    }catch(err){}
  }

  function emptyDecodeResult(vin, status, errors = []){
    return {
      vin: normalizeVin(vin),
      make: "",
      model: "",
      modelYear: null,
      manufacturer: "",
      vehicleType: "",
      bodyClass: "",
      plantCountry: "",
      source: SOURCE_NHTSA,
      raw: {},
      errors,
      status
    };
  }

  function parseNhtsaResult(vin, payload){
    const row = Array.isArray(payload?.Results) ? payload.Results[0] || {} : {};
    const errorCode = String(row.ErrorCode || "").trim();
    const errors = [];
    if(errorCode && errorCode !== "0"){
      errors.push({ code: "VIN_DECODER_WARNING", message: row.ErrorText || "VIN decoder uyarı döndürdü." });
    }
    const result = {
      vin: normalizeVin(vin),
      make: row.Make || "",
      model: row.Model || "",
      modelYear: row.ModelYear ? Number(row.ModelYear) || null : null,
      manufacturer: row.Manufacturer || "",
      vehicleType: row.VehicleType || "",
      bodyClass: row.BodyClass || "",
      plantCountry: row.PlantCountry || "",
      source: SOURCE_NHTSA,
      raw: row,
      errors,
      status: "VIN_DECODED"
    };
    if(!result.make && !result.model && !result.modelYear){
      result.status = "VIN_FORMAT_VALID_DECODER_UNAVAILABLE";
      result.errors.push({ code: "VIN_DECODER_EMPTY", message: "VIN decoder araç bilgisi döndürmedi." });
    }
    return result;
  }

  function timeoutPromise(ms){
    return new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error("VIN decoder timeout"));
      }, ms);
    });
  }

  function createNhtsaVinProvider(options = {}){
    const fetchImpl = options.fetchImpl || global.fetch;
    const timeoutMs = Number(options.timeoutMs || 3500);
    const cacheStorageKey = options.cacheStorageKey || CACHE_KEY;
    return {
      async decode(vin, modelYear){
        const normalized = normalizeVin(vin);
        const validation = validateVin(normalized);
        if(!validation.isValid) return emptyDecodeResult(normalized, "VIN_FORMAT_INVALID", validation.errors);
        const cacheKey = `${normalized}|${modelYear || ""}`;
        const cache = readCache(cacheStorageKey);
        if(cache[cacheKey]) return { ...cache[cacheKey], fromCache: true };
        if(typeof fetchImpl !== "function"){
          return emptyDecodeResult(normalized, "VIN_FORMAT_VALID_DECODER_UNAVAILABLE", [{ code: "VIN_DECODER_UNAVAILABLE", message: "VIN decoder servisine ulaşılamadı." }]);
        }
        const yearQuery = modelYear ? `&modelyear=${encodeURIComponent(modelYear)}` : "";
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalized)}?format=json${yearQuery}`;
        try{
          const response = await Promise.race([fetchImpl(url, { method: "GET" }), timeoutPromise(timeoutMs)]);
          if(!response || response.ok === false){
            return emptyDecodeResult(normalized, "VIN_FORMAT_VALID_DECODER_UNAVAILABLE", [{ code: "VIN_DECODER_HTTP_ERROR", message: "VIN decoder servisi hata döndürdü." }]);
          }
          const payload = await response.json();
          const parsed = parseNhtsaResult(normalized, payload);
          cache[cacheKey] = parsed;
          writeCache(cache, cacheStorageKey);
          return parsed;
        }catch(err){
          return emptyDecodeResult(normalized, "VIN_FORMAT_VALID_DECODER_UNAVAILABLE", [{ code: "VIN_DECODER_UNAVAILABLE", message: "VIN decoder servisine ulaşılamadı." }]);
        }
      }
    };
  }

  function compareSelectedVehicleWithDecodedVin(selectedVehicle = {}, decodedResult = {}, validationResult){
    const vin = decodedResult?.vin || selectedVehicle.vin || "";
    const validation = validationResult || validateVin(vin);
    const selectedMake = selectedVehicle.selectedMake ?? selectedVehicle.make ?? "";
    const selectedModel = selectedVehicle.selectedModel ?? selectedVehicle.model ?? "";
    const selectedYear = Number(selectedVehicle.selectedYear ?? selectedVehicle.year) || null;
    const decodedMake = decodedResult?.make || "";
    const decodedModel = decodedResult?.model || "";
    const decodedYear = Number(decodedResult?.modelYear) || null;
    const wmiMake = decodedResult?.wmiMake || vinWmiMake(vin);
    const hasDecoder = decodedResult && decodedResult.status === "VIN_DECODED" && (decodedMake || decodedModel || decodedYear);
    const hasSelectedVehicle = !!(selectedMake || selectedModel || selectedYear);
    let confidence = 0;
    let makeMismatch = false;
    let modelMismatch = false;
    let yearMismatch = false;
    const messages = [];
    if(validation.isValid) confidence += 30;
    else messages.push("VIN formatı geçerli değil.");
    if(selectedMake && wmiMake){
      if(stringsCompatible(canonicalMake(selectedMake), wmiMake)){
        confidence += 20;
        messages.push(`WMI üretici bilgisi ${wmiMake} ile uyumlu.`);
      }else{
        messages.push(`WMI üretici bilgisi ${wmiMake}; seçilen marka ${selectedMake}.`);
      }
    }
    if(hasDecoder && selectedMake && decodedMake){
      if(stringsCompatible(canonicalMake(selectedMake), canonicalMake(decodedMake))) confidence += 20;
      else{
        makeMismatch = true;
        messages.push(`Marka uyuşmuyor. Seçilen: ${selectedMake}. Bulunan: ${decodedMake}.`);
      }
    }
    if(hasDecoder && selectedModel && decodedModel){
      if(stringsCompatible(selectedModel, decodedModel)) confidence += 20;
      else{
        modelMismatch = true;
        messages.push(`Model uyuşmuyor. Seçilen: ${selectedModel}. Bulunan: ${decodedModel}.`);
      }
    }
    if(hasDecoder && selectedYear && decodedYear){
      if(selectedYear === decodedYear) confidence += 10;
      else{
        yearMismatch = true;
        messages.push(`Model yılı uyuşmuyor. Seçilen: ${selectedYear}. Bulunan: ${decodedYear}.`);
      }
    }
    let status = "MANUAL_REVIEW";
    if(!validation.isValid) status = "MISMATCH";
    else if(!hasDecoder) status = "MANUAL_REVIEW";
    else if(!hasSelectedVehicle){
      confidence = Math.max(confidence, 80);
      status = "MATCH";
      messages.push("VIN decoder sonucu araç alanlarını doldurmak için kullanılabilir.");
    }
    else if(makeMismatch) status = "MISMATCH";
    else if(modelMismatch || yearMismatch) status = confidence >= 50 ? "WARNING" : "MISMATCH";
    else if(confidence >= 80) status = "MATCH";
    else if(confidence >= 50) status = "WARNING";
    else status = "MISMATCH";
    if(status === "MATCH") messages.unshift("Şasi numarası seçili araç bilgileriyle uyumlu.");
    if(status === "MANUAL_REVIEW") messages.unshift("VIN formatı doğru; decoder sonucu yok veya eksik. Manuel kontrol önerilir.");
    return {
      status,
      confidence: Math.max(0, Math.min(100, confidence)),
      messages,
      wmiMake,
      selected: { make: selectedMake, model: selectedModel, year: selectedYear },
      decoded: { make: decodedMake, model: decodedModel, year: decodedYear }
    };
  }

  const api = {
    VIN_REGEX,
    normalizeVin,
    validateVin,
    extractVinParts,
    vinWmiMake,
    normalizeVehicleText,
    compareSelectedVehicleWithDecodedVin,
    createNhtsaVinProvider,
    VinDecoderService: createNhtsaVinProvider
  };

  global.OTOTR_VIN_SERVICE = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
