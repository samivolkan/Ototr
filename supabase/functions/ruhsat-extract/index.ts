import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { buildPrompt, PROMPT_VERSION } from "./prompt.ts";
import { validateExtraction } from "./validators.ts";
import { OcrEvidence } from "./schema.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 8 * 1024 * 1024) {
    return json({ error: "request_too_large" }, 413);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "unauthenticated" }, 401);
  }

  const actor = await adminClient
    .from("app_users")
    .select("id, branch_id, role, is_active")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (actor.error || !actor.data?.branch_id) {
    return json({ error: "branch_forbidden" }, 403);
  }

  const body = await req.json();
  const evidence = Array.isArray(body.ocr_evidence)
    ? body.ocr_evidence as OcrEvidence[]
    : [];
  const imagePaths = Array.isArray(body.image_paths) ? body.image_paths : [];
  if (imagePaths.length > 2) return json({ error: "too_many_pages" }, 400);

  const scanSessionId = crypto.randomUUID();
  const modelName = Deno.env.get("RUHSAT_VISION_MODEL_PRIMARY") ?? "disabled";
  const fields = await callVisionProvider({
    modelName,
    prompt: buildPrompt(evidence.map((item) => item.text).join("\n")),
  });

  const response = validateExtraction({
    scanSessionId,
    documentType: String(fields.document_type ?? body.document_type_hint ?? "UNKNOWN"),
    fields: typeof fields.fields === "object" && fields.fields ? fields.fields as Record<string, unknown> : {},
    evidence,
    modelName,
    promptVersion: PROMPT_VERSION,
  });

  await adminClient.from("registration_scan_sessions").insert({
    id: scanSessionId,
    branch_id: actor.data.branch_id,
    created_by: actor.data.id,
    document_type: response.document_type,
    status: "EXTRACTED",
    image_sha256: null,
    extraction_json: response.fields,
    confidence_json: response.confidence,
    extractor_version: response.extractor_version,
    ocr_engine_version: "mlkit-text-recognition-v2",
    model_name: response.model_name,
    prompt_version: response.prompt_version,
    needs_rescan: Object.values(response.confidence).some((field) => field.state === "NOT_READ"),
    completed_at: new Date().toISOString(),
  });

  return json(response);
});

async function callVisionProvider(args: { modelName: string; prompt: string }) {
  const endpoint = Deno.env.get("RUHSAT_VISION_ENDPOINT");
  const apiKey = Deno.env.get("RUHSAT_VISION_API_KEY");
  if (!endpoint || !apiKey || args.modelName === "disabled") {
    return { document_type: "UNKNOWN", fields: {} };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: args.modelName,
      messages: [{ role: "user", content: args.prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) return { document_type: "UNKNOWN", fields: {} };
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { document_type: "UNKNOWN", fields: {} };
  try {
    return JSON.parse(content);
  } catch {
    return { document_type: "UNKNOWN", fields: {} };
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
