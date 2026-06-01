// Owner SSE stream: pushes live deal-progress updates for the authenticated
// owner's listings. The Flutter app opens this and animates the progress bar
// when a broker advances a linked lead (or unlocks the listing).
//
// Auth: the EventSource/stream request must carry the owner bearer token. Native
// SSE clients (and our Dart client) send it as the Authorization header.
import { requireOwner, OwnerAuthError } from "@/lib/owner-auth";
import { marketplaceBus } from "@/lib/realtime";

export const dynamic = "force-dynamic";

interface ProgressEvent {
  ownerId: string;
  listingId: string;
  progress: unknown;
}

export async function GET(req: Request) {
  let ownerId: string;
  try {
    const owner = await requireOwner(req);
    ownerId = owner.id;
  } catch (e) {
    if (e instanceof OwnerAuthError) return new Response("Unauthorized", { status: 401 });
    throw e;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));

      send("ping", "connected");

      const onProgress = (e: ProgressEvent) => {
        if (e.ownerId !== ownerId) return; // only this owner's listings
        try {
          send("progress", JSON.stringify({ listingId: e.listingId, progress: e.progress }));
        } catch {
          /* closed */
        }
      };
      marketplaceBus.on("owner_progress", onProgress);

      const heartbeat = setInterval(() => {
        try {
          send("ping", String(Date.now()));
        } catch {
          /* ignore */
        }
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        marketplaceBus.off("owner_progress", onProgress);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
