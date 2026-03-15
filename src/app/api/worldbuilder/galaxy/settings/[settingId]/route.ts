import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canUseGalaxy, getEditableSetting, settingExists } from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/worldbuilder/galaxy/settings/[settingId]
export async function DELETE(
  req: Request,
  context: { params: Promise<{ settingId: string }> }
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

    const { settingId } = await context.params;
    const existing = await getEditableSetting({ id: user.id, roleId: user.roleId }, settingId);
    if (!existing) {
      const exists = await settingExists(settingId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.galaxySetting.delete({ where: { id: settingId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete galaxy setting error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
