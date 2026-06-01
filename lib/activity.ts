// Append-only activity log. Called on every meaningful mutation so each firm
// has an auditable history. Never throws into the caller's path — a logging
// failure should not break the action it records.
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface LogActivityInput {
  firmId: string;
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  // Accept any JSON-ish object; cast to Prisma's JSON input at write time.
  payload?: Record<string, unknown> | Prisma.InputJsonValue;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        firmId: input.firmId,
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[activity] failed to log", input.action, e);
  }
}
