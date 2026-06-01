// WhatsApp Business (Meta Graph API) client + webhook helpers.
//   - sendTemplateMessage: POST a pre-approved template to a recipient
//   - verifyWebhookSignature: HMAC-SHA256 over the raw body (X-Hub-Signature-256)
//   - verifyChallenge: GET subscription handshake
//   - renderTemplate: substitute {{1}}, {{2}} … for local preview
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

function env(name: string): string | undefined {
  return process.env[name];
}

export function isWhatsappConfigured(): boolean {
  return Boolean(env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_ACCESS_TOKEN"));
}

export interface SendTemplateInput {
  to: string; // E.164 without '+'
  templateName: string;
  language?: string;
  variables?: string[]; // body {{1}}.. params
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTemplateMessage(input: SendTemplateInput): Promise<SendResult> {
  const phoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  const token = env("WHATSAPP_ACCESS_TOKEN");
  if (!phoneId || !token) return { ok: false, error: "WhatsApp not configured" };

  const components = input.variables?.length
    ? [{ type: "body", parameters: input.variables.map((v) => ({ type: "text", text: v })) }]
    : undefined;

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language ?? "en" },
        ...(components ? { components } : {}),
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: JSON.stringify(body) };
  return { ok: true, messageId: body?.messages?.[0]?.id };
}

// Verify X-Hub-Signature-256 against the raw request body.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// GET subscription handshake — returns the challenge string if the verify token matches.
export function verifyChallenge(params: URLSearchParams): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token && token === env("WHATSAPP_VERIFY_TOKEN")) {
    return challenge;
  }
  return null;
}

// Substitute {{1}}, {{2}} … with provided variables (local preview/rendering).
export function renderTemplate(body: string, variables: string[] = []): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => variables[Number(n) - 1] ?? `{{${n}}}`);
}
