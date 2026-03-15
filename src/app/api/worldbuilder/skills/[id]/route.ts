import { NextRequest, NextResponse } from "next/server";
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
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
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
    createdBy: skill.createdById,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

async function findAccessibleSkill(id: string, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.skill.findUnique({ where: { id } });
  }

  return prisma.skill.findFirst({
    where: {
      id,
      OR: [{ createdById: userId }, { isFree: true }],
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const capabilities = getRoleCapabilities(user.roleId);
  const skill = await findAccessibleSkill(id, user.id, capabilities.isAdmin);
  if (!skill) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const canEdit = capabilities.isAdmin || skill.createdById === user.id;
  return NextResponse.json({
    ok: true,
    skill: toSkillResponse(skill),
    canEdit,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.skill.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const capabilities = getRoleCapabilities(user.roleId);
  if (!capabilities.isAdmin && existing.createdById !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      tier: body.tier !== undefined ? toTierValue(body.tier) : undefined,
      primaryAttribute:
        typeof body.primaryAttribute === "string" ? body.primaryAttribute : undefined,
      secondaryAttribute:
        typeof body.secondaryAttribute === "string" ? body.secondaryAttribute : undefined,
      definition: typeof body.definition === "string" ? body.definition : undefined,
      parentId: body.parentId === undefined ? undefined : (body.parentId as string | null),
      parent2Id: body.parent2Id === undefined ? undefined : (body.parent2Id as string | null),
      parent3Id: body.parent3Id === undefined ? undefined : (body.parent3Id as string | null),
      isFree: typeof body.isFree === "boolean" ? body.isFree : undefined,
      isPublished: typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, skill: toSkillResponse(updated) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.skill.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const capabilities = getRoleCapabilities(user.roleId);
  if (!capabilities.isAdmin && existing.createdById !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.skill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
