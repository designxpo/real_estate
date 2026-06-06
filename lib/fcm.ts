// Firebase Cloud Messaging sender for owner push notifications. Uses the
// firebase-admin SDK with a service-account key. No-ops gracefully if no key is
// configured (so the app runs fine without push).
//
// Credential source, in priority order:
//   1. FIREBASE_SERVICE_ACCOUNT_B64  — base64 of the service-account JSON
//      (best for serverless/Vercel: no filesystem, no newline mangling).
//   2. FIREBASE_SERVICE_ACCOUNT_JSON — raw JSON string.
//   3. A file at FIREBASE_SERVICE_ACCOUNT_PATH (default ./firebase-service-account.json) for local dev.
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

function serviceAccountPath(): string {
  return process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "firebase-service-account.json");
}

// Parsed service account from env or disk, or null if none configured.
function loadServiceAccount(): admin.ServiceAccount | null {
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw) return JSON.parse(raw);
    const p = serviceAccountPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[fcm] failed to parse service account", e);
  }
  return null;
}

export function isFcmConfigured(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_B64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    fs.existsSync(serviceAccountPath())
  );
}

let _ready = false;
function ensureApp(): boolean {
  if (_ready) return true;
  const sa = loadServiceAccount();
  if (!sa) return false;
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    }
    _ready = true;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[fcm] init failed", e);
    return false;
  }
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Send a push to every device registered to this owner. Prunes dead tokens.
export async function sendToOwner(ownerId: string, msg: PushMessage): Promise<void> {
  if (!ensureApp()) return;
  const devices = await prisma.ownerDevice.findMany({ where: { ownerId }, select: { token: true } });
  const tokens = devices.map((d) => d.token);
  if (tokens.length === 0) return;

  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: msg.title, body: msg.body },
      data: msg.data,
      android: { priority: "high" },
    });
    // Remove tokens FCM reports as permanently invalid.
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code ?? "";
      if (!r.success && (code.includes("registration-token-not-registered") || code.includes("invalid-argument"))) {
        dead.push(tokens[i]);
      }
    });
    if (dead.length) {
      await prisma.ownerDevice.deleteMany({ where: { token: { in: dead } } });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[fcm] send failed", e);
  }
}
