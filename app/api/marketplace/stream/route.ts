// Server-Sent Events stream of marketplace changes for brokers. The broker's
// /marketplace page opens an EventSource here and refreshes when an owner
// activates / books / deactivates a listing — true real-time, no polling.
import { requireUser, AuthError } from "@/lib/auth";
import { marketplaceBus, type MarketplaceChange, type ChatEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let firmId: string;
  try {
    const user = await requireUser();
    firmId = user.firmId;
  } catch (e) {
    if (e instanceof AuthError) return new Response("Unauthorized", { status: 401 });
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      send("ping", "connected");

      const onChange = (change: MarketplaceChange) => {
        try {
          send("change", JSON.stringify(change));
        } catch {
          /* controller closed */
        }
      };
      marketplaceBus.on("change", onChange);

      const onChat = (e: ChatEvent) => {
        if (e.toFirmId !== firmId) return;
        try {
          send("chat", JSON.stringify({ threadId: e.threadId, listingId: e.listingId, message: e.message }));
        } catch {
          /* controller closed */
        }
      };
      marketplaceBus.on("chat", onChat);

      // Heartbeat keeps proxies/Next from closing the idle connection.
      const heartbeat = setInterval(() => {
        try {
          send("ping", String(Date.now()));
        } catch {
          /* ignore */
        }
      }, 25000);

      const cleanup = () => {
        clearInterval(heartbeat);
        marketplaceBus.off("change", onChange);
        marketplaceBus.off("chat", onChat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
