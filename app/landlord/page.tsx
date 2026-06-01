import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { LandlordStatusSwitch } from "@/components/landlord-status-switch";
import { STATUS_LABELS } from "@/lib/property-status";

export const dynamic = "force-dynamic";

// Lightweight landlord portal. Lives OUTSIDE the broker (app) shell — no
// sidebar, no CRM. A landlord arrives here via magic link and sees only their
// own properties, each with a single Active/Booked toggle.
export default async function LandlordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/landlord/error?reason=not_found");
  if (user.role !== "landlord") {
    // A broker hitting this page — send them to their app.
    redirect("/home");
  }

  const properties = await prisma.property.findMany({
    where: { landlordUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { firm: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-gradient-to-br from-accent to-accent-glow mb-3 text-white font-bold text-xl">
            🏠
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Manage the availability of your {properties.length === 1 ? "property" : "properties"} below.
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-8 text-center text-ink-muted">
            No properties are linked to your account yet. Your broker will send you a fresh link
            once a listing is ready.
          </div>
        ) : (
          properties.map((p) => (
            <LandlordStatusSwitch
              key={p.id}
              property={{
                id: p.id,
                title: p.title,
                rent: formatINR(p.priceAmount.toString(), p.priceUnit),
                address: [p.locality, p.city, p.state].filter(Boolean).join(", "),
                status: p.status,
                statusLabel: STATUS_LABELS[p.status],
                firmName: p.firm.name,
              }}
            />
          ))
        )}

        <p className="text-center text-xs text-ink-faint">
          Listed by {properties[0]?.firm.name ?? "your brokerage"}. Need a change to the details?
          Contact your broker.
        </p>
      </div>
    </div>
  );
}
