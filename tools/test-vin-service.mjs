import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const vin = require("../src/services/vinService.js");

const VALID_VIN = "JTDB4MEE30J123456";

function memoryStorage(){
  const data = new Map();
  return {
    getItem(key){ return data.has(key) ? data.get(key) : null; },
    setItem(key, value){ data.set(key, String(value)); },
    removeItem(key){ data.delete(key); },
    clear(){ data.clear(); }
  };
}

function decodedToyota(overrides = {}){
  return {
    vin: VALID_VIN,
    make: "Toyota",
    model: "Corolla",
    modelYear: 2021,
    manufacturer: "Toyota Motor Corporation",
    vehicleType: "Passenger Car",
    bodyClass: "Sedan",
    plantCountry: "Japan",
    source: "NHTSA_VPIC",
    raw: {},
    errors: [],
    status: "VIN_DECODED",
    ...overrides
  };
}

assert.equal(vin.normalizeVin(" jt-db4m-ee-30j123456 "), VALID_VIN, "normalizeVin bosluk ve tireleri temizlemeli");
assert.equal(vin.normalizeVin("jtdb4mee30j123456"), VALID_VIN, "normalizeVin lowercase girdiyi uppercase yapmali");

assert.equal(vin.validateVin(VALID_VIN).isValid, true, "17 karakter gecerli VIN true donmeli");
assert.equal(vin.validateVin(VALID_VIN.slice(0, 16)).isValid, false, "16 karakter VIN false donmeli");
assert.equal(vin.validateVin(`${VALID_VIN}7`).isValid, false, "18 karakter VIN false donmeli");
assert.equal(vin.validateVin("JTDB4MEE30I123456").isValid, false, "I/O/Q iceren VIN false donmeli");
assert.equal(vin.validateVin("JTDB4MEE30*123456").isValid, false, "Ozel karakter iceren VIN false donmeli");

assert.deepEqual(vin.extractVinParts(VALID_VIN), {
  wmi: "JTD",
  vds: "B4MEE3",
  vis: "0J123456"
}, "VIN wmi/vds/vis dogru ayrilmali");

const validResult = vin.validateVin(VALID_VIN);
const match = vin.compareSelectedVehicleWithDecodedVin({ vin: VALID_VIN, selectedMake: "Toyota", selectedModel: "Corolla", selectedYear: 2021 }, decodedToyota(), validResult);
assert.equal(match.status, "MATCH", "Ayni marka/model/yil MATCH olmali");
assert.equal(match.confidence, 100, "Tam uyum skoru 100 olmali");

const modelWarning = vin.compareSelectedVehicleWithDecodedVin({ vin: VALID_VIN, selectedMake: "Toyota", selectedModel: "Yaris", selectedYear: 2021 }, decodedToyota(), validResult);
assert.ok(["WARNING", "MISMATCH"].includes(modelWarning.status), "Marka ayni model farkliysa warning veya mismatch olmali");

const yearWarning = vin.compareSelectedVehicleWithDecodedVin({ vin: VALID_VIN, selectedMake: "Toyota", selectedModel: "Corolla", selectedYear: 2020 }, decodedToyota(), validResult);
assert.equal(yearWarning.status, "WARNING", "Yil farkliysa WARNING olmali");

const noDecoder = vin.compareSelectedVehicleWithDecodedVin({ vin: VALID_VIN, selectedMake: "Toyota", selectedModel: "Corolla", selectedYear: 2021 }, { vin: VALID_VIN, status: "VIN_FORMAT_VALID_DECODER_UNAVAILABLE" }, validResult);
assert.equal(noDecoder.status, "MANUAL_REVIEW", "Decoder yok ama format dogruysa MANUAL_REVIEW olmali");

const emptySelected = vin.compareSelectedVehicleWithDecodedVin({ vin: VALID_VIN }, decodedToyota(), validResult);
assert.equal(emptySelected.status, "MATCH", "Secili arac yokken guvenilir decoder sonucu otomatik doldurulabilir olmali");

globalThis.localStorage = memoryStorage();
let fetchCalls = 0;
const provider = vin.createNhtsaVinProvider({
  timeoutMs: 50,
  cacheStorageKey: "test-vin-cache",
  fetchImpl: async url => {
    fetchCalls += 1;
    assert.ok(String(url).includes("modelyear=2021"), "modelYear query parametre olarak gonderilmeli");
    return {
      ok: true,
      async json(){
        return {
          Results: [{
            Make: "Toyota",
            Model: "Corolla",
            ModelYear: "2021",
            Manufacturer: "Toyota Motor Corporation",
            VehicleType: "PASSENGER CAR",
            BodyClass: "Sedan",
            PlantCountry: "Japan",
            ErrorCode: "0"
          }]
        };
      }
    };
  }
});
const decoded = await provider.decode(VALID_VIN, 2021);
assert.equal(decoded.status, "VIN_DECODED", "Basarili NHTSA response parse edilmeli");
assert.equal(decoded.make, "Toyota");
assert.equal(decoded.model, "Corolla");
assert.equal(decoded.modelYear, 2021);
const cached = await provider.decode(VALID_VIN, 2021);
assert.equal(cached.fromCache, true, "Ayni VIN ve yil icin cache kullanilmali");
assert.equal(fetchCalls, 1, "Cache sonrasi tekrar API cagrisi yapilmamali");

const timeoutProvider = vin.createNhtsaVinProvider({
  timeoutMs: 5,
  cacheStorageKey: "test-timeout-cache",
  fetchImpl: () => new Promise(() => {})
});
const timeoutResult = await timeoutProvider.decode(VALID_VIN);
assert.equal(timeoutResult.status, "VIN_FORMAT_VALID_DECODER_UNAVAILABLE", "Timeout graceful fallback donmeli");

const errorProvider = vin.createNhtsaVinProvider({
  timeoutMs: 10,
  cacheStorageKey: "test-error-cache",
  fetchImpl: async () => ({ ok: false, async json(){ return {}; } })
});
const errorResult = await errorProvider.decode(VALID_VIN);
assert.equal(errorResult.status, "VIN_FORMAT_VALID_DECODER_UNAVAILABLE", "API hata donerse kayit akisi crash etmemeli");

console.log("VIN service tests passed");
