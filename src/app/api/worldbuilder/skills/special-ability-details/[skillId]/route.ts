import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function assertSkillAccess(skillId: string, userId: string, isAdmin: boolean) {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { id: true, createdById: true },
  });

  if (!skill) {
    return { ok: false as const, status: 404, error: "SKILL_NOT_FOUND" };
  }

  if (!isAdmin && skill.createdById !== userId) {
    return { ok: false as const, status: 403, error: "FORBIDDEN" };
  }

  return { ok: true as const };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ skillId: string }> }
): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { skillId } = await context.params;
  const capabilities = getRoleCapabilities(user.roleId);
  const permission = await assertSkillAccess(skillId, user.id, capabilities.isAdmin);
  if (!permission.ok) {
    return NextResponse.json({ ok: false, error: permission.error }, { status: permission.status });
  }

  const details = await prisma.skillSpecialAbilityDetail.findFirst({
    where: { skillId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, details });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ skillId: string }> }
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { skillId } = await context.params;
  const capabilities = getRoleCapabilities(user.roleId);
  const permission = await assertSkillAccess(skillId, user.id, capabilities.isAdmin);
  if (!permission.ok) {
    return NextResponse.json({ ok: false, error: permission.error }, { status: permission.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const payload = {
    abilityType: toNullableString(body.abilityType),
    scalingMethod: toNullableString(body.scalingMethod),
    prerequisites: toNullableString(body.prerequisites),
    scalingDetails: toNullableString(body.scalingDetails),
    stage1Tag: toNullableString(body.stage1Tag),
    stage1Desc: toNullableString(body.stage1Desc),
    stage1Points: toNullableString(body.stage1Points),
    stage2Tag: toNullableString(body.stage2Tag),
    stage2Desc: toNullableString(body.stage2Desc),
    stage2Points: toNullableString(body.stage2Points),
    stage3Tag: toNullableString(body.stage3Tag),
    stage3Desc: toNullableString(body.stage3Desc),
    stage4Tag: toNullableString(body.stage4Tag),
    stage4Desc: toNullableString(body.stage4Desc),
    finalTag: toNullableString(body.finalTag),
    finalDesc: toNullableString(body.finalDesc),
    add1Tag: toNullableString(body.add1Tag),
    add1Desc: toNullableString(body.add1Desc),
    add2Tag: toNullableString(body.add2Tag),
    add2Desc: toNullableString(body.add2Desc),
    add3Tag: toNullableString(body.add3Tag),
    add3Desc: toNullableString(body.add3Desc),
    add4Tag: toNullableString(body.add4Tag),
    add4Desc: toNullableString(body.add4Desc),
    updatedAt: new Date(),
  };

  const existing = await prisma.skillSpecialAbilityDetail.findFirst({
    where: { skillId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const details = existing
    ? await prisma.skillSpecialAbilityDetail.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prisma.skillSpecialAbilityDetail.create({
        data: {
          id: crypto.randomUUID(),
          skillId,
          ...payload,
        },
      });

  return NextResponse.json({ ok: true, id: details.id });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ skillId: string }> }
): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { skillId } = await context.params;
  const capabilities = getRoleCapabilities(user.roleId);
  const permission = await assertSkillAccess(skillId, user.id, capabilities.isAdmin);
  if (!permission.ok) {
    return NextResponse.json({ ok: false, error: permission.error }, { status: permission.status });
  }

  await prisma.skillSpecialAbilityDetail.deleteMany({ where: { skillId } });
  return NextResponse.json({ ok: true });
}
