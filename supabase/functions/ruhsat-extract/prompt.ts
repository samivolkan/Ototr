export const PROMPT_VERSION = "ruhsat-extract-v1";

export function buildPrompt(ocrText: string) {
  return [
    "You extract Turkish vehicle registration certificate fields.",
    "Never guess missing or unreadable fields. Use null.",
    "Do not infer mileage, transmission, customer phone, customer identity, owner name, TCKN, or address.",
    "Modern ruhsat mappings: A plate, B first_registration_date, I registration_date, D.1 brand, D.2 type, D.3 commercial_name, D.4 model_year, P.5 engine_number, E vin, J vehicle_type, R color, P.3 fuel_type.",
    "Old ruhsat labels: PLAKA NO, MARKASI, MODELİ model_year, CİNSİ vehicle_type, TİPİ type, RENGİ color, MOTOR NO, ŞASİ/ŞASE NO vin, TESCİL TARİHİ registration_date.",
    "Return only strict JSON with keys: document_type and fields.",
    `OCR evidence text:\n${ocrText.slice(0, 12000)}`,
  ].join("\n");
}
