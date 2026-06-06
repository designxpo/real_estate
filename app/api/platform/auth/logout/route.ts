import { NextResponse } from "next/server";
import { destroyPlatformSession } from "@/lib/platform-auth";

export async function POST() {
  await destroyPlatformSession();
  return NextResponse.json({ ok: true });
}
