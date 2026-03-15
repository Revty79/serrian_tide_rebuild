import { NextRequest, NextResponse } from "next/server";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function toNpcResponse(
  npc: {
    id: string;
    createdById: string;
    name: string;
    alias: string | null;
    importance: string | null;
    role: string | null;
    race: string | null;
    occupation: string | null;
    location: string | null;
    timelineTag: string | null;
    tags: string | null;
    age: string | null;
    gender: string | null;
    descriptionShort: string | null;
    appearance: string | null;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    baseMovement: number;
    hpTotal: number | null;
    initiative: number | null;
    armorSoak: string | null;
    defenseNotes: string | null;
    challengeRating: number;
    skillAllocations: unknown;
    skillCheckpoint: unknown;
    isInitialSetupLocked: boolean;
    xpSpent: number;
    xpCheckpoint: number;
    personality: string | null;
    ideals: string | null;
    bonds: string | null;
    flaws: string | null;
    goals: string | null;
    secrets: string | null;
    backstory: string | null;
    motivations: string | null;
    hooks: string | null;
    faction: string | null;
    relationships: string | null;
    attitudeTowardParty: string | null;
    allies: string | null;
    enemies: string | null;
    affiliations: string | null;
    resources: string | null;
    notes: string | null;
    isFree: boolean;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  currentUserId: string,
  isAdmin: boolean
) {
  return {
    id: npc.id,
    name: npc.name,
    alias: npc.alias,
    importance: npc.importance,
    role: npc.role,
    race: npc.race,
    occupation: npc.occupation,
    location: npc.location,
    timelineTag: npc.timelineTag,
    tags: npc.tags,
    age: npc.age,
    gender: npc.gender,
    descriptionShort: npc.descriptionShort,
    appearance: npc.appearance,
    strength: npc.strength,
    dexterity: npc.dexterity,
    constitution: npc.constitution,
    intelligence: npc.intelligence,
    wisdom: npc.wisdom,
    charisma: npc.charisma,
    baseMovement: npc.baseMovement,
    hpTotal: npc.hpTotal,
    initiative: npc.initiative,
    armorSoak: npc.armorSoak,
    defenseNotes: npc.defenseNotes,
    challengeRating: npc.challengeRating,
    skillAllocations: (npc.skillAllocations as Record<string, number>) ?? {},
    skillCheckpoint: (npc.skillCheckpoint as Record<string, number>) ?? {},
    isInitialSetupLocked: npc.isInitialSetupLocked,
    xpSpent: npc.xpSpent,
    xpCheckpoint: npc.xpCheckpoint,
    personality: npc.personality,
    ideals: npc.ideals,
    bonds: npc.bonds,
    flaws: npc.flaws,
    goals: npc.goals,
    secrets: npc.secrets,
    backstory: npc.backstory,
    motivations: npc.motivations,
    hooks: npc.hooks,
    faction: npc.faction,
    relationships: npc.relationships,
    attitudeTowardParty: npc.attitudeTowardParty,
    allies: npc.allies,
    enemies: npc.enemies,
    affiliations: npc.affiliations,
    resources: npc.resources,
    notes: npc.notes,
    isFree: npc.isFree,
    isPublished: npc.isPublished,
    createdBy: npc.createdById,
    canEdit: isAdmin || npc.createdById === currentUserId,
    createdAt: npc.createdAt.toISOString(),
    updatedAt: npc.updatedAt.toISOString(),
  };
}

async function findAccessibleNpc(id: string, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.npc.findUnique({ where: { id } });
  }

  return prisma.npc.findFirst({
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
  const npc = await findAccessibleNpc(id, user.id, capabilities.isAdmin);
  if (!npc) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    npc: toNpcResponse(npc, user.id, capabilities.isAdmin),
    canEdit: capabilities.isAdmin || npc.createdById === user.id,
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
  const existing = await prisma.npc.findUnique({
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

  const updated = await prisma.npc.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name : undefined,
      alias: body.alias === undefined ? undefined : (body.alias as string | null),
      importance: body.importance === undefined ? undefined : (body.importance as string | null),
      role: body.role === undefined ? undefined : (body.role as string | null),
      race:
        body.race === undefined && body.Race === undefined
          ? undefined
          : ((body.race as string) || (body.Race as string) || null),
      occupation: body.occupation === undefined ? undefined : (body.occupation as string | null),
      location: body.location === undefined ? undefined : (body.location as string | null),
      timelineTag: body.timelineTag === undefined ? undefined : (body.timelineTag as string | null),
      tags: body.tags === undefined ? undefined : (body.tags as string | null),
      age: body.age === undefined ? undefined : (body.age as string | null),
      gender: body.gender === undefined ? undefined : (body.gender as string | null),
      descriptionShort:
        body.descriptionShort === undefined ? undefined : (body.descriptionShort as string | null),
      appearance: body.appearance === undefined ? undefined : (body.appearance as string | null),
      strength: Number.isFinite(Number(body.strength)) ? Number(body.strength) : undefined,
      dexterity: Number.isFinite(Number(body.dexterity)) ? Number(body.dexterity) : undefined,
      constitution: Number.isFinite(Number(body.constitution))
        ? Number(body.constitution)
        : undefined,
      intelligence: Number.isFinite(Number(body.intelligence))
        ? Number(body.intelligence)
        : undefined,
      wisdom: Number.isFinite(Number(body.wisdom)) ? Number(body.wisdom) : undefined,
      charisma: Number.isFinite(Number(body.charisma)) ? Number(body.charisma) : undefined,
      baseMovement: Number.isFinite(Number(body.baseMovement)) ? Number(body.baseMovement) : undefined,
      hpTotal: body.hpTotal === undefined
        ? undefined
        : Number.isFinite(Number(body.hpTotal))
          ? Number(body.hpTotal)
          : null,
      initiative: body.initiative === undefined
        ? undefined
        : Number.isFinite(Number(body.initiative))
          ? Number(body.initiative)
          : null,
      armorSoak: body.armorSoak === undefined ? undefined : (body.armorSoak as string | null),
      defenseNotes:
        body.defenseNotes === undefined ? undefined : (body.defenseNotes as string | null),
      challengeRating: Number.isFinite(Number(body.challengeRating))
        ? Number(body.challengeRating)
        : undefined,
      skillAllocations:
        body.skillAllocations === undefined
          ? undefined
          : ((body.skillAllocations as object) ?? {}),
      skillCheckpoint:
        body.skillCheckpoint === undefined
          ? undefined
          : ((body.skillCheckpoint as object) ?? {}),
      isInitialSetupLocked:
        typeof body.isInitialSetupLocked === "boolean"
          ? body.isInitialSetupLocked
          : undefined,
      xpSpent: Number.isFinite(Number(body.xpSpent)) ? Number(body.xpSpent) : undefined,
      xpCheckpoint: Number.isFinite(Number(body.xpCheckpoint))
        ? Number(body.xpCheckpoint)
        : undefined,
      personality:
        body.personality === undefined ? undefined : (body.personality as string | null),
      ideals: body.ideals === undefined ? undefined : (body.ideals as string | null),
      bonds: body.bonds === undefined ? undefined : (body.bonds as string | null),
      flaws: body.flaws === undefined ? undefined : (body.flaws as string | null),
      goals: body.goals === undefined ? undefined : (body.goals as string | null),
      secrets: body.secrets === undefined ? undefined : (body.secrets as string | null),
      backstory: body.backstory === undefined ? undefined : (body.backstory as string | null),
      motivations:
        body.motivations === undefined ? undefined : (body.motivations as string | null),
      hooks: body.hooks === undefined ? undefined : (body.hooks as string | null),
      faction: body.faction === undefined ? undefined : (body.faction as string | null),
      relationships:
        body.relationships === undefined ? undefined : (body.relationships as string | null),
      attitudeTowardParty:
        body.attitudeTowardParty === undefined
          ? undefined
          : (body.attitudeTowardParty as string | null),
      allies: body.allies === undefined ? undefined : (body.allies as string | null),
      enemies: body.enemies === undefined ? undefined : (body.enemies as string | null),
      affiliations:
        body.affiliations === undefined ? undefined : (body.affiliations as string | null),
      resources: body.resources === undefined ? undefined : (body.resources as string | null),
      notes: body.notes === undefined ? undefined : (body.notes as string | null),
      isFree: typeof body.isFree === "boolean" ? body.isFree : undefined,
      isPublished: typeof body.isPublished === "boolean" ? body.isPublished : undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    npc: toNpcResponse(updated, user.id, capabilities.isAdmin),
    canEdit: true,
  });
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
  const existing = await prisma.npc.findUnique({
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

  await prisma.npc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
