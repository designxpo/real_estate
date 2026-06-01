// In-app notifications. `notify` always creates one; `notifyOnce` de-dupes
// against an existing UNREAD notification with the same title for that user
// (so e.g. a recurring "follow-up due" doesn't pile up).
import { prisma } from "@/lib/db";
import type { NotificationKind } from "@prisma/client";

export interface NotifyInput {
  firmId: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        firmId: input.firmId,
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[notify] failed", input.title, e);
  }
}

export async function notifyOnce(input: NotifyInput): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: { userId: input.userId, title: input.title, readAt: null },
    select: { id: true },
  });
  if (existing) return;
  await notify(input);
}
