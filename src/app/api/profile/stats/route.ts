import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const [skills, calendars, npcs, activeSessions] = await Promise.all([
      prisma.skill.count({ where: { createdById: user.id } }),
      prisma.calendar.count({ where: { createdById: user.id } }),
      prisma.npc.count({ where: { createdById: user.id } }),
      prisma.session.count({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      stats: {
        worldbuilder: {
          skills,
          calendars,
          npcs,
          total: skills + calendars + npcs,
        },
        account: {
          activeSessions,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/profile/stats failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
