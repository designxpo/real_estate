// Broker ↔ owner chat for a listing (broker side). GET opens/returns the firm's
// thread + messages; POST sends a message. Contact details are redacted.
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { getOrCreateThread, listMessages, markRead, postMessage, serializeMessage, ChatError } from "@/lib/chat";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const thread = await getOrCreateThread(id, user.firmId);
    await markRead(thread.id, "broker");
    return NextResponse.json({ threadId: thread.id, messages: await listMessages(thread.id) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    if (e instanceof ChatError) return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    throw e;
  }
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const parsed = sendSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const thread = await getOrCreateThread(id, user.firmId);
    const message = await postMessage({
      thread,
      senderType: "broker",
      senderUserId: user.id,
      body: parsed.data.body,
    });
    return NextResponse.json({ threadId: thread.id, message: serializeMessage(message) }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    if (e instanceof ChatError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "not_found" ? 404 : 400 });
    }
    throw e;
  }
}
