import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const DEFAULT_THEME = "void";
const DEFAULT_BACKGROUND = "nebula.png";

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const pref = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });

    if (!pref) {
      return NextResponse.json({
        ok: true,
        preferences: {
          theme: DEFAULT_THEME,
          backgroundImage: DEFAULT_BACKGROUND,
          gearImage: null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      preferences: {
        theme: pref.theme,
        backgroundImage: pref.backgroundImage,
        gearImage: pref.gearImage,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/preferences failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const theme = toNullableString(body.theme) ?? DEFAULT_THEME;
    const backgroundImage = toNullableString(body.backgroundImage) ?? DEFAULT_BACKGROUND;
    const gearImage = body.gearImage === undefined ? undefined : toNullableString(body.gearImage);

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        theme,
        backgroundImage,
        gearImage: gearImage ?? null,
      },
      update: {
        theme,
        backgroundImage,
        gearImage: gearImage === undefined ? undefined : gearImage,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/profile/preferences failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
