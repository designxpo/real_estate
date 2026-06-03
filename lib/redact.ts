// Strip contact details from chat messages so the platform can't be bypassed:
// phone numbers, emails, and links are replaced with "•••". Best-effort — it's a
// deterrent, not DRM, and intentionally errs toward redacting.
const REPLACEMENT = "•••";

export function redact(input: string): { body: string; redacted: boolean } {
  let redacted = false;
  const mark = () => {
    redacted = true;
    return REPLACEMENT;
  };

  let out = input;
  // Emails
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, mark);
  // URLs / handles
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, mark);
  // Phone-like runs: any digit run (with optional + and separators) holding ≥8 digits.
  out = out.replace(/\+?\d[\d\s().\-]{6,}\d/g, (m) => {
    const digits = (m.match(/\d/g) ?? []).length;
    return digits >= 8 ? mark() : m;
  });
  return { body: out.trim(), redacted };
}
