import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.roleId,
        roleId: user.roleId,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/profile/me failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
