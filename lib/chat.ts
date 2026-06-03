// On-platform chat between owners and broker firms about a listing. One thread
// per (listing, firm). Messages are redacted of contact details and pushed live
// over SSE to the other side.
import { prisma } from "@/lib/db";
import { redact } from "@/lib/redact";
import { emitChat } from "@/lib/realtime";
import type { ListingMessage, ListingThread } from "@prisma/client";

export class ChatError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ChatError";
  }
}

const MAX_LEN = 2000;

// Broker side: open (or reuse) the thread for this firm on a listing.
export async function getOrCreateThread(listingId: string, firmId: string): Promise<ListingThread> {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true },
  });
  if (!listing) throw new ChatError("not_found", "Listing not found");

  return prisma.listingThread.upsert({
    where: { listingId_firmId: { listingId, firmId } },
    create: { listingId, firmId, ownerId: listing.ownerId },
    update: {},
  });
}

export function serializeMessage(m: ListingMessage) {
  return {
    id: m.id,
    senderType: m.senderType,
    body: m.body,
    redacted: m.redacted,
    createdAt: m.createdAt,
  };
}

export async function listMessages(threadId: string) {
  const messages = await prisma.listingMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return messages.map(serializeMessage);
}

// Reset the unread counter for whichever side just opened the thread.
export async function markRead(threadId: string, side: "owner" | "broker") {
  await prisma.listingThread.update({
    where: { id: threadId },
    data: side === "owner" ? { ownerUnread: 0 } : { firmUnread: 0 },
  });
}

interface PostInput {
  thread: ListingThread;
  senderType: "owner" | "broker";
  senderUserId?: string;
  body: string;
}

export async function postMessage({ thread, senderType, senderUserId, body }: PostInput) {
  const trimmed = (body ?? "").trim();
  if (!trimmed) throw new ChatError("empty", "Message is empty");
  if (trimmed.length > MAX_LEN) throw new ChatError("too_long", "Message is too long");

  const { body: clean, redacted } = redact(trimmed);

  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.listingMessage.create({
      data: { threadId: thread.id, senderType, senderUserId: senderUserId ?? null, body: clean, redacted },
    });
    await tx.listingThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: m.createdAt,
        // bump the *recipient's* unread counter
        ...(senderType === "broker" ? { ownerUnread: { increment: 1 } } : { firmUnread: { increment: 1 } }),
      },
    });
    return m;
  });

  // Push to the recipient's SSE stream.
  emitChat({
    threadId: thread.id,
    listingId: thread.listingId,
    ...(senderType === "broker" ? { toOwnerId: thread.ownerId } : { toFirmId: thread.firmId }),
    message: {
      id: message.id,
      senderType: message.senderType,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return message;
}
