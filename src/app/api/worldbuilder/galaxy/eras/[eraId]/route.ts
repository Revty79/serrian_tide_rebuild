import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canUseGalaxy, eraExists, getEditableEra } from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/worldbuilder/galaxy/eras/[eraId]
export async function DELETE(
  req: Request,
  context: { params: Promise<{ eraId: string }> }
) {
  void req;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!canUseGalaxy(user.roleId)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { eraId } = await context.params;
    const existing = await getEditableEra({ id: user.id, roleId: user.roleId }, eraId);
    if (!existing) {
      const exists = await eraExists(eraId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.galaxyEra.delete({ where: { id: eraId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete galaxy era error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
