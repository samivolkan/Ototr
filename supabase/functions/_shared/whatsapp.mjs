const DEFAULT_COUNTRY_CODE = "90";
const DEFAULT_TEMPLATE_LANGUAGE = "tr";
const DEFAULT_TIMEOUT_MS = 8000;

function cleanTemplateText(value, fallback, maxLength = 160) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return (text || fallback).slice(0, maxLength);
}

export function normalizeWhatsAppRecipient(value, countryCode = DEFAULT_COUNTRY_CODE) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("0")) {
    digits = `${countryCode}${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("5")) {
    digits = `${countryCode}${digits}`;
  }

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function formatAppointmentDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "Tarih belirtilmedi";
}

export function buildAppointmentTemplatePayload(appointment, config) {
  const recipient = normalizeWhatsAppRecipient(appointment.phone);
  if (!recipient) throw new Error("INVALID_RECIPIENT");

  const location = [appointment.province, appointment.district]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
  const vehicle = [
    appointment.brandModel,
    appointment.plate ? `Plaka: ${appointment.plate}` : "",
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" - ");

  const parameters = [
    cleanTemplateText(appointment.fullName, "Değerli müşterimiz", 120),
    cleanTemplateText(appointment.referenceNo, "-", 40),
    cleanTemplateText(location, "Şube temsilci tarafından netleştirilecek", 160),
    cleanTemplateText(appointment.service, "Ekspertiz", 100),
    formatAppointmentDate(appointment.preferredDate),
    cleanTemplateText(appointment.preferredTime, "Saat belirtilmedi", 60),
    cleanTemplateText(vehicle, "Araç bilgisi belirtilmedi", 160),
  ].map((text) => ({ type: "text", text }));

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage || DEFAULT_TEMPLATE_LANGUAGE },
      components: [{ type: "body", parameters }],
    },
  };
}

function validateConfig(config) {
  if (!config.enabled) return "disabled";
  if (
    !config.accessToken ||
    !/^\d+$/.test(config.phoneNumberId || "") ||
    !/^v\d+\.\d+$/.test(config.apiVersion || "") ||
    !/^[a-z0-9_]+$/.test(config.templateName || "")
  ) {
    return "not_configured";
  }
  return null;
}

export async function sendAppointmentWhatsApp(appointment, config, fetchImpl = fetch) {
  const configStatus = validateConfig(config);
  if (configStatus) return { status: configStatus };

  let payload;
  try {
    payload = buildAppointmentTemplatePayload(appointment, config);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RECIPIENT") {
      return { status: "invalid_recipient" };
    }
    return { status: "failed", reason: "payload" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(config.timeoutMs) || DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    const providerBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: "failed",
        reason: "provider",
        httpStatus: response.status,
        providerCode: providerBody?.error?.code ?? null,
      };
    }

    return {
      status: "sent",
      messageId: providerBody?.messages?.[0]?.id ?? null,
    };
  } catch {
    return { status: "failed", reason: "network" };
  } finally {
    clearTimeout(timeout);
  }
}

