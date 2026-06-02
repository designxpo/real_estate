// Firebase Cloud Messaging sender for owner push notifications. Uses the
// firebase-admin SDK with a service-account key. No-ops gracefully if the key
// file is absent (so the app runs fine without push configured).
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

function serviceAccountPath(): string {
  return process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "firebase-service-account.json");
}

export function isFcmConfigured(): boolean {
  return fs.existsSync(serviceAccountPath());
}

let _ready = false;
function ensureApp(): boolean {
  if (_ready) return true;
  const p = serviceAccountPath();
  if (!fs.existsSync(p)) return false;
  try {
    if (admin.apps.length === 0) {
      const sa = JSON.parse(fs.readFileSync(p, "utf8"));
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
