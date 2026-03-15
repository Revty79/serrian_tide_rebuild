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

export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const capabilities = getRoleCapabilities(user.roleId);
  const npcs = await prisma.npc.findMany({
    where: capabilities.isAdmin
      ? undefined
      : {
          OR: [{ createdById: user.id }, { isFree: true }],
        },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    ok: true,
    npcs: npcs.map((npc) => toNpcResponse(npc, user.id, capabilities.isAdmin)),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const npc = await prisma.npc.create({
    data: {
      createdById: user.id,
      name: body.name.trim(),
      alias: (body.alias as string) ?? null,
      importance: (body.importance as string) ?? null,
      role: (body.role as string) ?? null,
      race: ((body.race as string) || (body.Race as string)) ?? null,
      occupation: (body.occupation as string) ?? null,
      location: (body.location as string) ?? null,
      timelineTag: (body.timelineTag as string) ?? null,
      tags: (body.tags as string) ?? null,
      age: (body.age as string) ?? null,
      gender: (body.gender as string) ?? null,
      descriptionShort: (body.descriptionShort as string) ?? null,
      appearance: (body.appearance as string) ?? null,
      strength: Number.isFinite(Number(body.strength)) ? Number(body.strength) : 25,
      dexterity: Number.isFinite(Number(body.dexterity)) ? Number(body.dexterity) : 25,
      constitution: Number.isFinite(Number(body.constitution)) ? Number(body.constitution) : 25,
      intelligence: Number.isFinite(Number(body.intelligence)) ? Number(body.intelligence) : 25,
      wisdom: Number.isFinite(Number(body.wisdom)) ? Number(body.wisdom) : 25,
      charisma: Number.isFinite(Number(body.charisma)) ? Number(body.charisma) : 25,
      baseMovement: Number.isFinite(Number(body.baseMovement)) ? Number(body.baseMovement) : 5,
      hpTotal: Number.isFinite(Number(body.hpTotal)) ? Number(body.hpTotal) : null,
      initiative: Number.isFinite(Number(body.initiative)) ? Number(body.initiative) : null,
      armorSoak: (body.armorSoak as string) ?? null,
      defenseNotes: (body.defenseNotes as string) ?? null,
      challengeRating: Number.isFinite(Number(body.challengeRating))
        ? Number(body.challengeRating)
        : 1,
      skillAllocations: (body.skillAllocations as object) ?? {},
      skillCheckpoint: (body.skillCheckpoint as object) ?? {},
      isInitialSetupLocked:
        typeof body.isInitialSetupLocked === "boolean" ? body.isInitialSetupLocked : false,
      xpSpent: Number.isFinite(Number(body.xpSpent)) ? Number(body.xpSpent) : 0,
      xpCheckpoint: Number.isFinite(Number(body.xpCheckpoint))
        ? Number(body.xpCheckpoint)
        : 0,
      personality: (body.personality as string) ?? null,
      ideals: (body.ideals as string) ?? null,
      bonds: (body.bonds as string) ?? null,
      flaws: (body.flaws as string) ?? null,
      goals: (body.goals as string) ?? null,
      secrets: (body.secrets as string) ?? null,
      backstory: (body.backstory as string) ?? null,
      motivations: (body.motivations as string) ?? null,
      hooks: (body.hooks as string) ?? null,
      faction: (body.faction as string) ?? null,
      relationships: (body.relationships as string) ?? null,
      attitudeTowardParty: (body.attitudeTowardParty as string) ?? null,
      allies: (body.allies as string) ?? null,
      enemies: (body.enemies as string) ?? null,
      affiliations: (body.affiliations as string) ?? null,
      resources: (body.resources as string) ?? null,
      notes: (body.notes as string) ?? null,
      isFree: Boolean(body.isFree),
      isPublished: Boolean(body.isPublished),
    },
  });

  return NextResponse.json({
    ok: true,
    id: npc.id,
    npc: toNpcResponse(npc, user.id, true),
  });
}
