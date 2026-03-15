import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tierValue = Number(searchParams.get("tier") ?? "");
  if (!Number.isFinite(tierValue)) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST: tier required" },
      { status: 400 }
    );
  }

  const parentTier = tierValue - 1;
  if (parentTier < 1) {
    return NextResponse.json({ ok: true, skills: [] });
  }

  const primaryAttribute = searchParams.get("primaryAttribute");
  const secondaryAttribute = searchParams.get("secondaryAttribute");
  const attributes = [primaryAttribute, secondaryAttribute].filter(
    (value): value is string => Boolean(value && value !== "NA")
  );

  const skills = await prisma.skill.findMany({
    where: {
      createdById: user.id,
      tier: parentTier,
      ...(attributes.length
        ? {
            OR: [
              { primaryAttribute: { in: attributes } },
              { secondaryAttribute: { in: attributes } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, skills });
}
