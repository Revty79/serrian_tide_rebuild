import { NextRequest, NextResponse } from "next/server";
import { getRoleCapabilities } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function toCalendarResponse(calendar: {
  id: string;
  name: string;
  description: string | null;
  hoursPerDay: number;
  minutesPerHour: number;
  daylightHours: number;
  nightHours: number;
  dawnDuskHours: number;
  daysPerYear: number;
  hasLeapYear: boolean;
  leapYearFrequency: number | null;
  leapYearExceptions: string | null;
  leapDaysAdded: number | null;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  astronomicalEvents: unknown;
  festivals: unknown;
}) {
  return {
    id: calendar.id,
    name: calendar.name,
    description: calendar.description,
    hoursPerDay: calendar.hoursPerDay,
    minutesPerHour: calendar.minutesPerHour,
    daylightHours: calendar.daylightHours,
    nightHours: calendar.nightHours,
    dawnDuskHours: calendar.dawnDuskHours,
    daysPerYear: calendar.daysPerYear,
    hasLeapYear: calendar.hasLeapYear,
    leapYearFrequency: calendar.leapYearFrequency,
    leapYearExceptions: calendar.leapYearExceptions,
    leapDaysAdded: calendar.leapDaysAdded,
    weekdays: (calendar.weekdays as unknown[]) ?? [],
    months: (calendar.months as unknown[]) ?? [],
    seasons: (calendar.seasons as unknown[]) ?? [],
    astronomicalEvents: (calendar.astronomicalEvents as unknown[]) ?? [],
    festivals: (calendar.festivals as unknown[]) ?? [],
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    void request;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const capabilities = getRoleCapabilities(user.roleId);
    const calendars = await prisma.calendar.findMany({
      where: capabilities.isAdmin
        ? undefined
        : {
            OR: [{ createdById: user.id }, { isFree: true }],
          },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      calendars: calendars.map((calendar) => toCalendarResponse(calendar)),
    });
  } catch (error) {
    console.error("GET /api/worldbuilder/calendars failed:", error);
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
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const calendar = await prisma.calendar.create({
      data: {
        createdById: user.id,
        name: body.name.trim(),
        description: typeof body.description === "string" ? body.description : null,
        hoursPerDay: Number(body.hoursPerDay) || 24,
        minutesPerHour: Number(body.minutesPerHour) || 60,
        daylightHours: Number(body.daylightHours) || 12,
        nightHours: Number(body.nightHours) || 10,
        dawnDuskHours: Number(body.dawnDuskHours) || 2,
        daysPerYear: Number(body.daysPerYear) || 365,
        hasLeapYear: Boolean(body.hasLeapYear),
        leapYearFrequency: Number.isFinite(Number(body.leapYearFrequency))
          ? Number(body.leapYearFrequency)
          : null,
        leapYearExceptions:
          typeof body.leapYearExceptions === "string" ? body.leapYearExceptions : null,
        leapDaysAdded: Number.isFinite(Number(body.leapDaysAdded))
          ? Number(body.leapDaysAdded)
          : null,
        weekdays: (body.weekdays as object[]) ?? [],
        months: (body.months as object[]) ?? [],
        seasons: (body.seasons as object[]) ?? [],
        astronomicalEvents: (body.astronomicalEvents as object[]) ?? [],
        festivals: (body.festivals as object[]) ?? [],
        isFree: Boolean(body.isFree),
        isPublished: Boolean(body.isPublished),
      },
    });

    return NextResponse.json({ ok: true, id: calendar.id });
  } catch (error) {
    console.error("POST /api/worldbuilder/calendars failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
