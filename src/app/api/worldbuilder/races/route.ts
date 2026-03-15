import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// Races are intentionally not ported yet during the rebuild.
export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, races: [] });
}
