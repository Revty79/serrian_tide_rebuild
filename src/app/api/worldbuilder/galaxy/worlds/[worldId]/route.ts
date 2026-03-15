import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  canUseGalaxy,
  cleanOptionalString,
  cleanRequiredName,
  getEditableWorld,
  getReadableWorld,
  serializeEra,
  serializeMarker,
  serializeSetting,
  serializeWorld,
  worldExists,
} from "@/lib/galaxy/server";
import { prisma } from "@/lib/prisma";

// GET /api/worldbuilder/galaxy/worlds/[worldId]
export async function GET(
  req: Request,
  context: { params: Promise<{ worldId: string }> }
) {
  void req;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!canUseGalaxy(user.roleId)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { worldId } = await context.params;
    const sessionUser = { id: user.id, roleId: user.roleId };
    const world = await getReadableWorld(sessionUser, worldId);
    if (!world) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const [eras, settings, markers] = await Promise.all([
      prisma.galaxyEra.findMany({
        where: { worldId },
        orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
      }),
      prisma.galaxySetting.findMany({
        where: { worldId },
        orderBy: { name: "asc" },
      }),
      prisma.galaxyMarker.findMany({
        where: { worldId },
        orderBy: [{ year: "asc" }, { name: "asc" }],
      }),
    ]);

    const serializedWorld = serializeWorld(world, sessionUser);
    return NextResponse.json({
      ok: true,
      canEdit: serializedWorld.canEdit,
      world: {
        ...serializedWorld,
        eras: eras.map((row) => serializeEra(row, sessionUser)),
        settings: settings.map((row) => serializeSetting(row, sessionUser)),
        markers: markers.map((row) => serializeMarker(row, sessionUser)),
      },
    });
  } catch (err) {
    console.error("Get galaxy world error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PUT /api/worldbuilder/galaxy/worlds/[worldId]
export async function PUT(
  req: Request,
  context: { params: Promise<{ worldId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!canUseGalaxy(user.roleId)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { worldId } = await context.params;
    const sessionUser = { id: user.id, roleId: user.roleId };
    const existing = await getEditableWorld(sessionUser, worldId);
    if (!existing) {
      const exists = await worldExists(worldId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const updates: {
      name?: string;
      description?: string | null;
      isFree?: boolean;
      isPublished?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    let hasUpdates = false;

    if ("name" in body) {
      const name = cleanRequiredName(body.name);
      if (!name) {
        return NextResponse.json({ ok: false, error: "WORLD_NAME_REQUIRED" }, { status: 400 });
      }
      updates.name = name;
      hasUpdates = true;
    }

    if ("description" in body) {
      updates.description = cleanOptionalString(body.description);
      hasUpdates = true;
    }

    if ("isFree" in body) {
      if (typeof body.isFree !== "boolean") {
        return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
      }
      updates.isFree = body.isFree;
      hasUpdates = true;
    }

    if ("isPublished" in body) {
      if (typeof body.isPublished !== "boolean") {
        return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
      }
      updates.isPublished = body.isPublished;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    await prisma.galaxyWorld.update({
      where: { id: worldId },
      data: updates,
    });

    const updated = await getReadableWorld(sessionUser, worldId);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      world: serializeWorld(updated, sessionUser),
    });
  } catch (err) {
    console.error("Update galaxy world error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/worldbuilder/galaxy/worlds/[worldId]
export async function DELETE(
  req: Request,
  context: { params: Promise<{ worldId: string }> }
) {
  void req;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!canUseGalaxy(user.roleId)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { worldId } = await context.params;
    const sessionUser = { id: user.id, roleId: user.roleId };
    const existing = await getEditableWorld(sessionUser, worldId);
    if (!existing) {
      const exists = await worldExists(worldId);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.galaxyWorld.delete({ where: { id: worldId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete galaxy world error:", err);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
