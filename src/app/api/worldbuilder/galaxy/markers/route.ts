import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  canUseGalaxy,
  cleanOptionalString,
  cleanRequiredName,
  eraExists,
  getEditableEra,
  getEditableMarker,
  getEditableSetting,
  getEditableWorld,
  markerExists,
  parseNullableInteger,
  parseVisibility,
  settingExists,
  serializeMarker,
  worldExists,
} from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

type UpsertMarkerBody = {
  id?: unknown;
  worldId?: unknown;
  eraId?: unknown;
  settingId?: unknown;
  name?: unknown;
  description?: unknown;
  year?: unknown;
  category?: unknown;
  visibility?: unknown;
};

// POST /api/worldbuilder/galaxy/markers
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
    const body = (await req.json().catch(() => null)) as UpsertMarkerBody | null;
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

    const settingId = typeof body.settingId === "string" ? body.settingId.trim() : "";
    if (settingId) {
      const setting = await getEditableSetting(sessionUser, settingId);
      if (!setting) {
        const settingIsPresent = await settingExists(settingId);
        if (!settingIsPresent) {
          return NextResponse.json({ ok: false, error: "SETTING_NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
      }
      if (setting.worldId !== worldId) {
        return NextResponse.json({ ok: false, error: "WORLD_MISMATCH" }, { status: 400 });
      }
      if (eraId && setting.eraId && setting.eraId !== eraId) {
        return NextResponse.json({ ok: false, error: "ERA_SETTING_MISMATCH" }, { status: 400 });
      }
    }

    const name = cleanRequiredName(body.name);
    if (!name) {
      return NextResponse.json({ ok: false, error: "EVENT_NAME_REQUIRED" }, { status: 400 });
    }

    const year = parseNullableInteger(body.year);
    if (year === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_YEAR" }, { status: 400 });
    }

    const markerId = typeof body.id === "string" ? body.id.trim() : "";
    const existing = markerId ? await getEditableMarker(sessionUser, markerId) : null;
    if (markerId && !existing) {
      const exists = await markerExists(markerId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (existing && existing.worldId !== worldId) {
      return NextResponse.json({ ok: false, error: "WORLD_MISMATCH" }, { status: 400 });
    }

    const parsedVisibility =
      body.visibility === undefined && existing
        ? parseVisibility(existing.visibility)
        : body.visibility === undefined
          ? "canon"
          : parseVisibility(body.visibility);
    if (parsedVisibility === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_VISIBILITY" }, { status: 400 });
    }

    const now = new Date();
    const normalizedEraId = eraId || null;
    const normalizedSettingId = settingId || null;
    const category = cleanOptionalString(body.category);

    if (existing) {
      const updated = await prisma.galaxyMarker.update({
        where: { id: markerId },
        data: {
          worldId,
          eraId: normalizedEraId,
          settingId: normalizedSettingId,
          name,
          description: cleanOptionalString(body.description),
          year,
          category,
          visibility: parsedVisibility,
          updatedAt: now,
        },
      });

      return NextResponse.json({ ok: true, marker: serializeMarker(updated, sessionUser) });
    }

    const created = await prisma.galaxyMarker.create({
      data: {
        id: crypto.randomUUID(),
        worldId,
        eraId: normalizedEraId,
        settingId: normalizedSettingId,
        createdById: user.id,
        name,
        description: cleanOptionalString(body.description),
        year,
        category,
        visibility: parsedVisibility,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        marker: serializeMarker(created, sessionUser),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upsert galaxy marker error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
