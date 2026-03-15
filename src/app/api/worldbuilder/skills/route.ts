import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function toTierValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "N/A") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSkillResponse(skill: {
  id: string;
  name: string;
  type: string;
  tier: number | null;
  primaryAttribute: string;
  secondaryAttribute: string;
  definition: string | null;
  parentId: string | null;
  parent2Id: string | null;
  parent3Id: string | null;
  isFree: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; username: string | null } | null;
}) {
  return {
    id: skill.id,
    name: skill.name,
    type: skill.type,
    tier: skill.tier,
    primaryAttribute: skill.primaryAttribute,
    secondaryAttribute: skill.secondaryAttribute,
    definition: skill.definition,
    parentId: skill.parentId,
    parent2Id: skill.parent2Id,
    parent3Id: skill.parent3Id,
    isFree: skill.isFree,
    isPublished: skill.isPublished,
    createdBy: skill.createdBy ?? null,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const capabilities = getRoleCapabilities(user.roleId);
    const searchParams = request.nextUrl.searchParams;
    const filters: Prisma.SkillWhereInput[] = [];

    if (!capabilities.isAdmin) {
      filters.push({
        OR: [{ createdById: user.id }, { isFree: true }],
      });
    }

    const tier = searchParams.get("tier");
    if (tier) {
      const tierValue = toTierValue(tier);
      filters.push(tierValue === null ? { tier: null } : { tier: tierValue });
    }

    const attribute = searchParams.get("attribute");
    if (attribute) {
      filters.push({
        OR: [{ primaryAttribute: attribute }, { secondaryAttribute: attribute }],
      });
    }

    const type = searchParams.get("type");
    if (type) {
      filters.push({ type });
    }

    if (searchParams.get("is_special_ability") === "true") {
      filters.push({ type: "special ability" });
    }

    const where = filters.length ? { AND: filters } : undefined;
    const skills = await prisma.skill.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      skills: skills.map((skill) => toSkillResponse(skill)),
    });
  } catch (error) {
    console.error("GET /api/worldbuilder/skills failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const skill = await prisma.skill.create({
      data: {
        id: crypto.randomUUID(),
        createdById: user.id,
        name: body.name.trim(),
        type: typeof body.type === "string" ? body.type : "standard",
        tier: toTierValue(body.tier),
        primaryAttribute:
          typeof body.primaryAttribute === "string" ? body.primaryAttribute : "NA",
        secondaryAttribute:
          typeof body.secondaryAttribute === "string" ? body.secondaryAttribute : "NA",
        definition: typeof body.definition === "string" ? body.definition : null,
        parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
        parent2Id: typeof body.parent2Id === "string" && body.parent2Id ? body.parent2Id : null,
        parent3Id: typeof body.parent3Id === "string" && body.parent3Id ? body.parent3Id : null,
        isFree: Boolean(body.isFree),
        isPublished: Boolean(body.isPublished),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: skill.id,
      skill: toSkillResponse(skill),
    });
  } catch (error) {
    console.error("POST /api/worldbuilder/skills failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
