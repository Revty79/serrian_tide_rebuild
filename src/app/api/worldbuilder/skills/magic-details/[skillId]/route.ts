import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function parseJsonField(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toJsonInput(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = parseJsonField(value);
  if (parsed === null) {
    return Prisma.JsonNull;
  }

  return parsed as Prisma.InputJsonValue;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNullableInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const details = await prisma.skillMagicDetail.findFirst({
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
    skillName: toNullableString(body.skillName),
    tradition: toNullableString(body.tradition),
    tier2Path: toNullableString(body.tier2Path),
    containersJson: toJsonInput(body.containersJson),
    modifiersJson: toJsonInput(body.modifiersJson),
    manaCost: toNullableInt(body.manaCost),
    castingTime: toNullableInt(body.castingTime),
    masteryLevel: toNullableInt(body.masteryLevel),
    notes: toNullableString(body.notes),
    flavorLine: toNullableString(body.flavorLine),
    updatedAt: new Date(),
  };

  const existing = await prisma.skillMagicDetail.findFirst({
    where: { skillId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const details = existing
    ? await prisma.skillMagicDetail.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prisma.skillMagicDetail.create({
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

  await prisma.skillMagicDetail.deleteMany({ where: { skillId } });
  return NextResponse.json({ ok: true });
}
