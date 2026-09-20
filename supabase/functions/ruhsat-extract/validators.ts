import { FIELD_KEYS, RuhsatExtractResponse, OcrEvidence, RuhsatFieldKey } from "./schema.ts";

export const EXTRACTOR_VERSION = "ruhsat-ai-pro-v2";

export function normalizeVin(value: string | null): string | null {
  if (!value) return null;
  return value.toUpperCase().replace(/\s+/g, "");
}

export function normalizePlate(value: string | null): string | null {
  if (!value) return null;
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

export function validateExtraction(args: {
  scanSessionId: string;
  documentType: string;
  fields: Record<string, unknown>;
  evidence: OcrEvidence[];
  modelName: string;
  promptVersion: string;
}): RuhsatExtractResponse {
  const fields = {} as Record<RuhsatFieldKey, string | null>;
  const confidence = {} as RuhsatExtractResponse["confidence"];

  for (const key of FIELD_KEYS) {
    const raw = args.fields[key];
    const value = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    fields[key] = key === "vin"
      ? normalizeVin(value)
      : key === "plate"
      ? normalizePlate(value)
      : value;
    confidence[key] = {
      value: fields[key],
      evidence_id: nearestEvidence(fields[key], args.evidence),
      state: stateFor(key, fields[key], args.evidence),
      error_code: null,
    };
  }

  return {
    scan_session_id: args.scanSessionId,
    document_type: isDocumentType(args.documentType) ? args.documentType : "UNKNOWN",
    fields,
    confidence,
    model_name: args.modelName,
    prompt_version: args.promptVersion,
    extractor_version: EXTRACTOR_VERSION,
  };
}

function nearestEvidence(value: string | null, evidence: OcrEvidence[]) {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  return evidence.find((item) =>
    item.text.toUpperCase().replace(/\s+/g, "").includes(normalized)
  )?.id ?? null;
}

function stateFor(key: RuhsatFieldKey, value: string | null, evidence: OcrEvidence[]) {
  if (!value) return "NOT_READ";
  if (key === "vin") {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) return "INVALID";
    return "REVIEW_REQUIRED";
  }
  if (key === "engine_number") return "REVIEW_REQUIRED";
  if (key === "plate") {
    return /^[0-9]{2}\s?[A-Z]{1,3}\s?[0-9]{1,5}$/.test(value)
      ? "AUTO_ACCEPT_CANDIDATE"
      : "REVIEW_REQUIRED";
  }
  if (key === "model_year") {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) {
      return "INVALID";
    }
  }
  const exactEvidence = nearestEvidence(value, evidence);
  return exactEvidence ? "AUTO_ACCEPT_CANDIDATE" : "REVIEW_REQUIRED";
}

function isDocumentType(value: string): value is RuhsatExtractResponse["document_type"] {
  return ["MODERN_REGISTRATION", "OLD_REGISTRATION", "TEMPORARY_REGISTRATION", "UNKNOWN"].includes(value);
}
