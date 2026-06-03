// Owner side of a chat thread: list + send messages. Verifies the thread belongs
// to the authenticated owner.
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import { listMessages, markRead, postMessage, serializeMessage, ChatError } from "@/lib/chat";

export function OPTIONS() {
  return preflight();
}

async function ownedThread(ownerId: string, threadId: string) {
  const thread = await prisma.listingThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.ownerId !== ownerId) return null;
  return thread;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const thread = await ownedThread(owner.id, id);
    if (!thread) return fail("Thread not found", 404);
    await markRead(thread.id, "owner");
    const firm = await prisma.firm.findUnique({ where: { id: thread.firmId }, select: { name: true } });
    return ok({ threadId: thread.id, firmName: firm?.name ?? "Broker", messages: await listMessages(thread.id) });
  });
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const thread = await ownedThread(owner.id, id);
    if (!thread) return fail("Thread not found", 404);
    const parsed = sendSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("Invalid request", 400);
    try {
      const message = await postMessage({ thread, senderType: "owner", body: parsed.data.body });
      return ok({ message: serializeMessage(message) }, 201);
    } catch (e) {
      if (e instanceof ChatError) return fail(e.message, 400);
      throw e;
    }
  });
}
