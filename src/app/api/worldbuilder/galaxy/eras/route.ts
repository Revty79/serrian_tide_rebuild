import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  canUseGalaxy,
  cleanOptionalString,
  cleanRequiredName,
  eraExists,
  getEditableEra,
  getEditableWorld,
  getNextEraOrderIndex,
  normalizeYearRange,
  parseColorHex,
  parseNullableInteger,
  parseOrderIndex,
  serializeEra,
  worldExists,
} from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

type UpsertEraBody = {
  id?: unknown;
  worldId?: unknown;
  name?: unknown;
  description?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  colorHex?: unknown;
  orderIndex?: unknown;
};

// POST /api/worldbuilder/galaxy/eras
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
    const body = (await req.json().catch(() => null)) as UpsertEraBody | null;
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

    const name = cleanRequiredName(body.name);
    if (!name) {
      return NextResponse.json({ ok: false, error: "ERA_NAME_REQUIRED" }, { status: 400 });
    }

    const startYear = parseNullableInteger(body.startYear);
    const endYear = parseNullableInteger(body.endYear);
    if (startYear === "INVALID" || endYear === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_YEAR" }, { status: 400 });
    }

    const orderIndex = parseOrderIndex(body.orderIndex);
    if (orderIndex === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_ORDER_INDEX" }, { status: 400 });
    }

    const colorHex = parseColorHex(body.colorHex);
    if (colorHex === "INVALID") {
      return NextResponse.json({ ok: false, error: "INVALID_COLOR" }, { status: 400 });
    }

    const years = normalizeYearRange(startYear, endYear);
    const now = new Date();
    const eraId = typeof body.id === "string" ? body.id.trim() : "";

    if (eraId) {
      const existing = await getEditableEra(sessionUser, eraId);
      if (!existing) {
        const exists = await eraExists(eraId);
        if (!exists) {
          return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
      }

      if (existing.worldId !== worldId) {
        return NextResponse.json({ ok: false, error: "WORLD_MISMATCH" }, { status: 400 });
      }

      const updated = await prisma.galaxyEra.update({
        where: { id: eraId },
        data: {
          name,
          description: cleanOptionalString(body.description),
          startYear: years.startYear,
          endYear: years.endYear,
          colorHex,
          orderIndex: orderIndex ?? existing.orderIndex,
          updatedAt: now,
        },
      });

      return NextResponse.json({ ok: true, era: serializeEra(updated, sessionUser) });
    }

    const created = await prisma.galaxyEra.create({
      data: {
        id: crypto.randomUUID(),
        worldId,
        createdById: user.id,
        name,
        description: cleanOptionalString(body.description),
        startYear: years.startYear,
        endYear: years.endYear,
        colorHex,
        orderIndex: orderIndex ?? (await getNextEraOrderIndex(worldId)),
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        era: serializeEra(created, sessionUser),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upsert galaxy era error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
