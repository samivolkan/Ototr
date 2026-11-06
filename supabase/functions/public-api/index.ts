import { createClient } from "@supabase/supabase-js";
import { corsHeaders as sdkCorsHeaders } from "@supabase/supabase-js/cors";
import { sendAppointmentWhatsApp } from "../_shared/whatsapp.mjs";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = (Deno.env.get("OTOTR_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const whatsappConfig = {
  enabled: (Deno.env.get("OTOTR_WHATSAPP_ENABLED") ?? "").toLowerCase() === "true",
  accessToken: Deno.env.get("OTOTR_WHATSAPP_ACCESS_TOKEN") ?? "",
  phoneNumberId: Deno.env.get("OTOTR_WHATSAPP_PHONE_NUMBER_ID") ?? "",
  apiVersion: Deno.env.get("OTOTR_WHATSAPP_GRAPH_API_VERSION") ?? "",
  templateName: Deno.env.get("OTOTR_WHATSAPP_APPOINTMENT_TEMPLATE") ?? "",
  templateLanguage: Deno.env.get("OTOTR_WHATSAPP_TEMPLATE_LANGUAGE") ?? "tr",
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "raw.githack.com" ||
      host.endsWith(".github.io") ||
      host === "ototr.com" ||
      host === "www.ototr.com" ||
      host === "ototr.com.tr" ||
      host === "www.ototr.com.tr"
    );
  } catch {
    return false;
  }
}

function responseHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const allowOrigin = originAllowed(origin) && origin ? origin : "https://www.ototr.com.tr";
  return {
    ...sdkCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req),
  });
}

function cleanText(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanBool(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}

function cleanInt(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanDate(value: unknown): string | null {
  const text = cleanText(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function requestMeta(req: Request): Record<string, string> {
  return {
    origin: req.headers.get("Origin") ?? "",
    userAgent: req.headers.get("User-Agent") ?? "",
    referer: req.headers.get("Referer") ?? "",
  };
}

function commonPayload(payload: Record<string, unknown>, req: Request) {
  return {
    source: cleanText(payload.source, 120) || "public_web",
    full_name: cleanText(payload.fullName, 120),
    phone: cleanText(payload.phone, 40),
    province: cleanText(payload.province, 80),
    district: cleanText(payload.district, 80),
    kvkk_consent: cleanBool(payload.kvkkConsent),
    contact_consent: cleanBool(payload.contactConsent),
    consent_version: cleanText(payload.consentVersion, 80),
    utm: typeof payload.utm === "object" && payload.utm ? payload.utm : {},
    payload,
    request_meta: requestMeta(req),
  };
}

function validateLead(payload: ReturnType<typeof commonPayload>): string | null {
  if (!payload.full_name || !payload.phone || !payload.province || !payload.district) {
    return "Ad soyad, telefon, il ve ilçe zorunludur.";
  }
  if (!payload.kvkk_consent) {
    return "KVKK aydınlatma onayı zorunludur.";
  }
  return null;
}

function validateContact(payload: ReturnType<typeof commonPayload>): string | null {
  if (!payload.full_name || !payload.phone) {
    return "Ad soyad ve telefon zorunludur.";
  }
  if (!payload.kvkk_consent || !payload.contact_consent) {
    return "KVKK ve iletişim onayı zorunludur.";
  }
  return null;
}

async function body(req: Request): Promise<Record<string, unknown>> {
  const parsed = await req.json().catch(() => null);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

async function createAppointment(req: Request): Promise<Response> {
  const payload = await body(req);
  if (cleanText(payload.companyWebsite, 120)) return json(req, { ok: true, referenceNo: "WEB-FILTERED" }, 202);
  const common = commonPayload(payload, req);
  const error = validateContact(common);
  if (error) return json(req, { ok: false, error }, 400);

  const { data, error: insertError } = await supabase
    .from("public_appointment_requests")
    .insert({
      ...common,
      plate: cleanText(payload.plate, 30),
      service: cleanText(payload.service, 80),
      brand_model: cleanText(payload.brandModel, 120),
      model_year: cleanInt(payload.modelYear),
      mileage: cleanInt(payload.mileage),
      preferred_date: cleanDate(payload.preferredDate),
      preferred_time: cleanText(payload.preferredTime, 40),
      note: cleanText(payload.note, 1200),
    })
    .select("id")
    .single();

  if (insertError) return json(req, { ok: false, error: "Kayıt oluşturulamadı." }, 500);
  const referenceNo = `WEB-CRM-${String(data.id).slice(0, 8).toUpperCase()}`;
  const whatsapp = await sendAppointmentWhatsApp({
    phone: common.phone,
    fullName: common.full_name,
    province: common.province,
    district: common.district,
    plate: cleanText(payload.plate, 30),
    service: cleanText(payload.service, 80),
    brandModel: cleanText(payload.brandModel, 120),
    preferredDate: cleanDate(payload.preferredDate),
    preferredTime: cleanText(payload.preferredTime, 40),
    referenceNo,
  }, whatsappConfig);

  if (whatsapp.status === "failed") {
    console.error("Appointment WhatsApp notification failed", {
      reason: whatsapp.reason,
      httpStatus: whatsapp.httpStatus ?? null,
      providerCode: whatsapp.providerCode ?? null,
    });
  } else if (whatsapp.status === "not_configured") {
    console.warn("Appointment WhatsApp notification is enabled but not configured");
  }

  return json(req, { ok: true, referenceNo, whatsappStatus: whatsapp.status }, 201);
}

async function createFranchise(req: Request): Promise<Response> {
  const payload = await body(req);
  if (cleanText(payload.companyWebsite, 120)) return json(req, { ok: true, referenceNo: "WEB-FILTERED" }, 202);
  const common = commonPayload(payload, req);
  const error = validateLead(common);
  if (error) return json(req, { ok: false, error }, 400);
  const versionedConsent = /^FR-KVKK-[0-9]{4}-[0-9]{2}$/.test(common.consent_version);
  const hasProcessingDecision = Object.prototype.hasOwnProperty.call(payload, "processingConsent");
  const liveSource = common.source === "ototr.com/franchise";
  const deploymentIdentity = cleanText(payload.deploymentIdentity, 80);
  const rollbackReference = cleanText(payload.rollbackReference, 200);
  if (liveSource && !versionedConsent) {
    return json(req, { ok: false, error: "Sürümlü KVKK metni zorunludur." }, 400);
  }
  if (liveSource && !/^[a-f0-9]{40}$/.test(deploymentIdentity)) {
    return json(req, { ok: false, error: "Canlı kaynak commit kimliği zorunludur." }, 400);
  }
  if (liveSource && !/^revert:[a-f0-9]{40}$/.test(rollbackReference)) {
    return json(req, { ok: false, error: "Rollback referansı zorunludur." }, 400);
  }
  if (versionedConsent && (!hasProcessingDecision || !cleanBool(payload.processingConsent))) {
    return json(req, { ok: false, error: "Veri işleme izni zorunludur." }, 400);
  }

  const { data, error: insertError } = await supabase
    .from("public_franchise_applications")
    .insert({
      ...common,
      processing_consent: hasProcessingDecision
        ? cleanBool(payload.processingConsent)
        : null,
      application_type: cleanText(payload.applicationType, 160),
      budget: cleanText(payload.budget, 80),
      equity_band: cleanText(payload.equityBand, 80) || null,
      management_experience_years: cleanInt(payload.managementExperienceYears),
      sector_experience: cleanText(payload.sectorExperience, 80) || null,
      company_status: cleanText(payload.companyStatus, 80) || null,
      partnership_structure: cleanText(payload.partnershipStructure, 80) || null,
      region: cleanText(payload.region, 80),
      has_location: cleanText(payload.hasLocation, 80),
      square_meters: cleanText(payload.squareMeters, 40),
      daily_target: cleanText(payload.dailyTarget, 40),
      note: cleanText(payload.note, 1500),
    })
    .select("id")
    .single();

  if (insertError) return json(req, { ok: false, error: "Kayıt oluşturulamadı." }, 500);
  return json(req, { ok: true, referenceNo: `WEB-FR-${String(data.id).slice(0, 8).toUpperCase()}` }, 201);
}

async function createComplaint(req: Request): Promise<Response> {
  const payload = await body(req);
  if (cleanText(payload.companyWebsite, 120)) return json(req, { ok: true, referenceNo: "WEB-FILTERED" }, 202);
  const common = commonPayload(payload, req);
  const error = validateContact(common);
  if (error) return json(req, { ok: false, error }, 400);

  const reportNo = cleanText(payload.reportNo, 80);
  const complaintType = cleanText(payload.complaintType, 120);
  const description = cleanText(payload.description, 1500);
  if (!reportNo || !complaintType || !description) {
    return json(req, { ok: false, error: "Rapor no, itiraz tipi ve açıklama zorunludur." }, 400);
  }

  const { data, error: insertError } = await supabase
    .from("public_complaints")
    .insert({
      ...common,
      report_no: reportNo,
      plate: cleanText(payload.plate, 30),
      branch: cleanText(payload.branch, 160),
      complaint_type: complaintType,
      description,
      file_note: cleanText(payload.fileNote, 500),
    })
    .select("id")
    .single();

  if (insertError) return json(req, { ok: false, error: "Kayıt oluşturulamadı." }, 500);
  return json(req, { ok: true, referenceNo: `WEB-CMP-${String(data.id).slice(0, 8).toUpperCase()}` }, 201);
}

async function listBranches(req: Request): Promise<Response> {
  const { data, error } = await supabase
    .from("public_branches")
    .select("name,province,district,address,phone,maps_url,services")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return json(req, { ok: false, error: "Şube listesi alınamadı." }, 500);
  return json(req, {
    branches: (data ?? []).map((branch) => ({
      name: branch.name,
      city: branch.province,
      district: branch.district,
      address: branch.address,
      phone: branch.phone,
      mapsUrl: branch.maps_url,
      services: branch.services ?? [],
    })),
  });
}

async function stats(req: Request): Promise<Response> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const [branches, appointments, franchise, complaints] = await Promise.all([
    supabase.from("public_branches").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("public_appointment_requests").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("public_franchise_applications").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("public_complaints").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
  ]);

  return json(req, {
    activeBranches: branches.count ?? 0,
    monthlyAppointments: appointments.count ?? 0,
    monthlyFranchiseApplications: franchise.count ?? 0,
    monthlyComplaints: complaints.count ?? 0,
  });
}

async function verifyReport(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = cleanText(url.searchParams.get("query"), 80).toUpperCase();
  const verifyCode = cleanText(url.searchParams.get("verifyCode"), 40);
  if (!query || !verifyCode) return json(req, { ok: false, error: "Doğrulama bilgileri eksik." }, 400);

  const columns = "report_no,plate,report_date,package_name,branch,vehicle,finding,categories,summary_url,verification_status";
  const byReportNo = await supabase
    .from("public_report_records")
    .select(columns)
    .eq("verify_code", verifyCode)
    .eq("is_public", true)
    .eq("report_no", query)
    .maybeSingle();

  if (byReportNo.error) return json(req, { ok: false, error: "Rapor sorgusu tamamlanamadı." }, 500);

  const byPlate = byReportNo.data ? { data: null, error: null } : await supabase
    .from("public_report_records")
    .select(columns)
    .eq("verify_code", verifyCode)
    .eq("is_public", true)
    .eq("plate", query)
    .maybeSingle();

  if (byPlate.error) return json(req, { ok: false, error: "Rapor sorgusu tamamlanamadı." }, 500);
  const data = byReportNo.data ?? byPlate.data;
  if (!data) return json(req, { ok: false, error: "Rapor bulunamadı." }, 404);

  return json(req, {
    reportNo: data.report_no,
    plate: data.plate,
    reportDate: data.report_date,
    packageName: data.package_name,
    branch: data.branch,
    vehicle: data.vehicle,
    finding: data.finding,
    categories: data.categories ?? [],
    summaryUrl: data.summary_url,
    verificationStatus: data.verification_status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (!originAllowed(req.headers.get("Origin"))) return json(req, { ok: false, error: "Origin izinli değil." }, 403);
  if (!supabaseUrl || !serviceRoleKey) return json(req, { ok: false, error: "API yapılandırması eksik." }, 500);

  const path = new URL(req.url).pathname.replace(/^.*\/public-api/, "") || "/";

  if (req.method === "GET" && path === "/branches") return listBranches(req);
  if (req.method === "GET" && path === "/stats") return stats(req);
  if (req.method === "GET" && path === "/reports/verify") return verifyReport(req);
  if (req.method === "POST" && path === "/appointments") return createAppointment(req);
  if (req.method === "POST" && path === "/franchise-applications") return createFranchise(req);
  if (req.method === "POST" && path === "/complaints") return createComplaint(req);

  return json(req, { ok: false, error: "Endpoint bulunamadı." }, 404);
});

