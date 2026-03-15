import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  canUseGalaxy,
  cleanOptionalString,
  cleanRequiredName,
  eraExists,
  getEditableEra,
  getEditableSetting,
  getEditableWorld,
  normalizeYearRange,
  parseColorHex,
  parseNullableInteger,
  settingExists,
  serializeSetting,
  worldExists,
} from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

type UpsertSettingBody = {
  id?: unknown;
  worldId?: unknown;
  eraId?: unknown;
  name?: unknown;
  description?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  colorHex?: unknown;
};

// POST /api/worldbuilder/galaxy/settings
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!canUseGalaxy(user.roleId)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const sessionUser = { id: user.id, roleId: user.roleId };
    const body = (await req.json().catch(() => null)) as UpsertSettingBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const worldId = typeof body.worldId === "string" ? body.worldId.trim() : "";
    if (!worldId) {
      return NextResponse.json({ ok: false, error: "WORLD_REQUIRED" }, { status: 400 });
    }

    const world = await getEditableWorld(sessionUser, worldId);
    if (!world) {
      const exists = await worldExists(worldId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "WORLD_NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const eraId = typeof body.eraId === "string" ? body.eraId.trim() : "";
    if (eraId) {
      const era = await getEditableEra(sessionUser, eraId);
      if (!era) {
        const eraIsPresent = await eraExists(eraId);
        if (!eraIsPresent) {
          return NextResponse.json({ ok: false, error: "ERA_NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
      }
      if (era.worldId !== worldId) {
        return NextResponse.json({ ok: false, error: "WORLD_MISMATCH" }, { status: 400 });
      }
    }

    const name = cleanRequiredName(body.name);
    if (!name) {
      return NextResponse.json({ ok: false, error: "SETTING_NAME_REQUIRED" }, { status: 400 });
    }

    const startYear = parseNullableInteger(body.startYear);
    const endYear = parseNullableInteger(body.endYear);
    if (startYear === "INVALID" || endYear === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_YEAR" }, { status: 400 });
    }

    const colorHex = parseColorHex(body.colorHex);
    if (colorHex === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_COLOR" }, { status: 400 });
    }

    const years = normalizeYearRange(startYear, endYear);
    const now = new Date();
    const settingId = typeof body.id === "string" ? body.id.trim() : "";
    const normalizedEraId = eraId || null;

    if (settingId) {
      const existing = await getEditableSetting(sessionUser, settingId);
      if (!existing) {
        const exists = await settingExists(settingId);
        if (!exists) {
          return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
      }

      if (existing.worldId !== worldId) {
        return NextResponse.json({ ok: false, error: "WORLD_MISMATCH" }, { status: 400 });
      }

      const updated = await prisma.galaxySetting.update({
        where: { id: settingId },
        data: {
          worldId,
          eraId: normalizedEraId,
          name,
          description: cleanOptionalString(body.description),
          startYear: years.startYear,
          endYear: years.endYear,
          colorHex,
          updatedAt: now,
        },
      });

      return NextResponse.json({ ok: true, setting: serializeSetting(updated, sessionUser) });
    }

    const created = await prisma.galaxySetting.create({
      data: {
        id: crypto.randomUUID(),
        worldId,
        eraId: normalizedEraId,
        createdById: user.id,
        name,
        description: cleanOptionalString(body.description),
        startYear: years.startYear,
        endYear: years.endYear,
        colorHex,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        setting: serializeSetting(created, sessionUser),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upsert galaxy setting error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
