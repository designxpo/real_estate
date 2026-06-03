// In-process pub/sub for marketplace changes, used to push real-time updates to
// brokers over SSE. Kept on globalThis so it survives Next.js dev hot-reloads
// and is shared across route modules in the single server process.
//
// NOTE: this is single-node only. For multi-instance / serverless deployment,
// swap the bus for Redis pub/sub or a hosted realtime service — the emit/
// subscribe call sites stay the same.
import { EventEmitter } from "events";

const g = globalThis as unknown as { __marketplaceBus?: EventEmitter };

export const marketplaceBus: EventEmitter =
  g.__marketplaceBus ?? (g.__marketplaceBus = new EventEmitter());

// Many SSE connections may subscribe at once.
marketplaceBus.setMaxListeners(0);

export interface MarketplaceChange {
  listingId: string;
  status?: string;
  moderation?: string;
  action: "created" | "status_change" | "updated";
  at: number;
}

export function emitMarketplaceChange(change: Omit<MarketplaceChange, "at">): void {
  marketplaceBus.emit("change", { ...change, at: Date.now() });
}

// Chat message fan-out. Delivered to exactly one side: the owner (toOwnerId) or
// the broker firm (toFirmId). The SSE streams filter on these ids.
export interface ChatEvent {
  threadId: string;
  listingId: string;
  toOwnerId?: string;
  toFirmId?: string;
  message: { id: string; senderType: string; body: string; createdAt: string };
  at: number;
}

export function emitChat(e: Omit<ChatEvent, "at">): void {
  marketplaceBus.emit("chat", { ...e, at: Date.now() });
}
