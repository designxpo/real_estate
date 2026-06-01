export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  not_found: "This link is invalid. Please ask your broker to send a new one.",
  expired: "This link has expired. Please ask your broker for a fresh link.",
  consumed: "This link has already been used. If you need to make a change, ask your broker for a new link.",
};

export default async function LandlordErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason ?? ""] ?? "Something went wrong. Please ask your broker for a new link.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center rounded-card border border-line bg-surface p-8 shadow-card">
        <div className="text-4xl mb-3">🔗</div>
        <h1 className="text-lg font-semibold">Link not valid</h1>
        <p className="text-sm text-ink-muted mt-2">{message}</p>
      </div>
    </div>
  );
}
