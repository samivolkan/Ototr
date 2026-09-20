export type DocumentType =
  | "MODERN_REGISTRATION"
  | "OLD_REGISTRATION"
  | "TEMPORARY_REGISTRATION"
  | "UNKNOWN";

export type FieldState =
  | "AUTO_ACCEPT_CANDIDATE"
  | "REVIEW_REQUIRED"
  | "INVALID"
  | "NOT_READ";

export type RuhsatFieldKey =
  | "plate"
  | "vin"
  | "engine_number"
  | "brand"
  | "commercial_name"
  | "model_year"
  | "type"
  | "vehicle_type"
  | "variant"
  | "version"
  | "fuel_type"
  | "color"
  | "first_registration_date"
  | "registration_date"
  | "document_serial_no";

export type OcrEvidence = {
  id: string;
  text: string;
  bbox: number[];
  page: number;
};

export type ExtractedField = {
  value: string | null;
  evidence_id: string | null;
  state: FieldState;
  error_code: string | null;
};

export type RuhsatExtractResponse = {
  scan_session_id: string;
  document_type: DocumentType;
  fields: Record<RuhsatFieldKey, string | null>;
  confidence: Record<RuhsatFieldKey, ExtractedField>;
  model_name: string;
  prompt_version: string;
  extractor_version: string;
};

export const FIELD_KEYS: RuhsatFieldKey[] = [
  "plate",
  "vin",
  "engine_number",
  "brand",
  "commercial_name",
  "model_year",
  "type",
  "vehicle_type",
  "variant",
  "version",
  "fuel_type",
  "color",
  "first_registration_date",
  "registration_date",
  "document_serial_no",
];
