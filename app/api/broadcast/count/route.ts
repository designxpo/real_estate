// Live recipient count + a sample recipient's merge vars (for the composer preview).
import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { resolveSegment, type Segment } from "@/lib/broadcast";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const sp = new URL(req.url).searchParams;
    const segment = (sp.get("segment") || "tenants") as Segment;
    const filter = sp.get("filter") || undefined;
    const recipients = await resolveSegment(user.firmId, segment, filter);
    const optedOut = recipients.filter((r) => r.optedOut).length;
    return NextResponse.json({
      count: recipients.length,
      optedOut,
      sample: recipients[0]?.vars ?? { name: "Tenant", firm: "", unit: "", rentDue: "" },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
