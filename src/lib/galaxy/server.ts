import type {
  GalaxyEra,
  GalaxyMarker,
  GalaxySetting,
  GalaxyWorld,
} from "@prisma/client";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

type SessionLikeUser = {
  id: string;
  roleId: string;
};

export type GalaxyVisibility = "canon" | "secret" | "rumor";

const VISIBILITY_VALUES: GalaxyVisibility[] = ["canon", "secret", "rumor"];

export function canUseGalaxy(roleId: string | null | undefined): boolean {
  return getRoleCapabilities(roleId).canWorldBuild;
}

export function isAdminRole(roleId: string | null | undefined): boolean {
  return getRoleCapabilities(roleId).isAdmin;
}

export function canEditGalaxyRow(user: SessionLikeUser, createdById: string): boolean {
  return isAdminRole(user.roleId) || createdById === user.id;
}

export function cleanRequiredName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export function parseNullableInteger(value: unknown): number | null | "INVALID" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return "INVALID";
  }
  return value;
}

export function parseOrderIndex(value: unknown): number | null | "INVALID" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return "INVALID";
  }
  return value;
}

export function parseColorHex(value: unknown): string | null | "INVALID" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "INVALID";

  const raw = value.trim();
  if (!raw) return null;

  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#([0-9A-Fa-f]{6})$/.test(normalized)) return "INVALID";
  return normalized.toUpperCase();
}

export function parseVisibility(value: unknown): GalaxyVisibility | "INVALID" {
  if (typeof value !== "string") return "INVALID";
  const normalized = value.trim().toLowerCase();
  if (!VISIBILITY_VALUES.includes(normalized as GalaxyVisibility)) return "INVALID";
  return normalized as GalaxyVisibility;
}

export function normalizeYearRange(startYear: number | null, endYear: number | null) {
  if (startYear === null || endYear === null) {
    return { startYear, endYear };
  }
  if (startYear <= endYear) {
    return { startYear, endYear };
  }
  return { startYear: endYear, endYear: startYear };
}

export async function listReadableWorlds(user: SessionLikeUser): Promise<GalaxyWorld[]> {
  return prisma.galaxyWorld.findMany({
    where: isAdminRole(user.roleId)
      ? undefined
      : {
          OR: [{ createdById: user.id }, { isFree: true }],
        },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReadableWorld(
  user: SessionLikeUser,
  worldId: string
): Promise<GalaxyWorld | null> {
  return prisma.galaxyWorld.findFirst({
    where: isAdminRole(user.roleId)
      ? { id: worldId }
      : {
          id: worldId,
          OR: [{ createdById: user.id }, { isFree: true }],
        },
  });
}

export async function getEditableWorld(
  user: SessionLikeUser,
  worldId: string
): Promise<GalaxyWorld | null> {
  return prisma.galaxyWorld.findFirst({
    where: isAdminRole(user.roleId)
      ? { id: worldId }
      : {
          id: worldId,
          createdById: user.id,
        },
  });
}

export async function getEditableEra(user: SessionLikeUser, eraId: string): Promise<GalaxyEra | null> {
  return prisma.galaxyEra.findFirst({
    where: isAdminRole(user.roleId)
      ? { id: eraId }
      : {
          id: eraId,
          createdById: user.id,
        },
  });
}

export async function getEditableSetting(
  user: SessionLikeUser,
  settingId: string
): Promise<GalaxySetting | null> {
  return prisma.galaxySetting.findFirst({
    where: isAdminRole(user.roleId)
      ? { id: settingId }
      : {
          id: settingId,
          createdById: user.id,
        },
  });
}

export async function getEditableMarker(
  user: SessionLikeUser,
  markerId: string
): Promise<GalaxyMarker | null> {
  return prisma.galaxyMarker.findFirst({
    where: isAdminRole(user.roleId)
      ? { id: markerId }
      : {
          id: markerId,
          createdById: user.id,
        },
  });
}

export async function worldExists(worldId: string): Promise<boolean> {
  const count = await prisma.galaxyWorld.count({ where: { id: worldId } });
  return count > 0;
}

export async function eraExists(eraId: string): Promise<boolean> {
  const count = await prisma.galaxyEra.count({ where: { id: eraId } });
  return count > 0;
}

export async function settingExists(settingId: string): Promise<boolean> {
  const count = await prisma.galaxySetting.count({ where: { id: settingId } });
  return count > 0;
}

export async function markerExists(markerId: string): Promise<boolean> {
  const count = await prisma.galaxyMarker.count({ where: { id: markerId } });
  return count > 0;
}

export async function getNextEraOrderIndex(worldId: string): Promise<number> {
  const row = await prisma.galaxyEra.findFirst({
    where: { worldId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });

  return (row?.orderIndex ?? -1) + 1;
}

export function serializeWorld(row: GalaxyWorld, user?: SessionLikeUser) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isFree: row.isFree,
    isPublished: row.isPublished,
    canEdit: user ? canEditGalaxyRow(user, row.createdById) : undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function serializeEra(row: GalaxyEra, user?: SessionLikeUser) {
  return {
    id: row.id,
    worldId: row.worldId,
    name: row.name,
    description: row.description,
    startYear: row.startYear,
    endYear: row.endYear,
    colorHex: row.colorHex,
    orderIndex: row.orderIndex,
    canEdit: user ? canEditGalaxyRow(user, row.createdById) : undefined,
  };
}

export function serializeSetting(row: GalaxySetting, user?: SessionLikeUser) {
  return {
    id: row.id,
    worldId: row.worldId,
    eraId: row.eraId,
    name: row.name,
    description: row.description,
    startYear: row.startYear,
    endYear: row.endYear,
    colorHex: row.colorHex,
    canEdit: user ? canEditGalaxyRow(user, row.createdById) : undefined,
  };
}

export function serializeMarker(row: GalaxyMarker, user?: SessionLikeUser) {
  return {
    id: row.id,
    worldId: row.worldId,
    eraId: row.eraId,
    settingId: row.settingId,
    name: row.name,
    description: row.description,
    year: row.year,
    category: row.category,
    visibility: row.visibility as GalaxyVisibility,
    canEdit: user ? canEditGalaxyRow(user, row.createdById) : undefined,
  };
}
