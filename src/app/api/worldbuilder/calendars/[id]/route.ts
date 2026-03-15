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

async function findAccessibleCalendar(id: string, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.calendar.findUnique({ where: { id } });
  }

  return prisma.calendar.findFirst({
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
  try {
    void request;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    const capabilities = getRoleCapabilities(user.roleId);
    const calendar = await findAccessibleCalendar(id, user.id, capabilities.isAdmin);
    if (!calendar) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, calendar: toCalendarResponse(calendar) });
  } catch (error) {
    console.error("GET /api/worldbuilder/calendars/[id] failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.calendar.findUnique({
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

    await prisma.calendar.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        hoursPerDay:
          Number.isFinite(Number(body.hoursPerDay)) ? Number(body.hoursPerDay) : undefined,
        minutesPerHour: Number.isFinite(Number(body.minutesPerHour))
          ? Number(body.minutesPerHour)
          : undefined,
        daylightHours: Number.isFinite(Number(body.daylightHours))
          ? Number(body.daylightHours)
          : undefined,
        nightHours: Number.isFinite(Number(body.nightHours)) ? Number(body.nightHours) : undefined,
        dawnDuskHours: Number.isFinite(Number(body.dawnDuskHours))
          ? Number(body.dawnDuskHours)
          : undefined,
        daysPerYear:
          Number.isFinite(Number(body.daysPerYear)) ? Number(body.daysPerYear) : undefined,
        hasLeapYear: typeof body.hasLeapYear === "boolean" ? body.hasLeapYear : undefined,
        leapYearFrequency:
          body.leapYearFrequency === undefined
            ? undefined
            : Number.isFinite(Number(body.leapYearFrequency))
              ? Number(body.leapYearFrequency)
              : null,
        leapYearExceptions:
          body.leapYearExceptions === undefined
            ? undefined
            : typeof body.leapYearExceptions === "string"
              ? body.leapYearExceptions
              : null,
        leapDaysAdded:
          body.leapDaysAdded === undefined
            ? undefined
            : Number.isFinite(Number(body.leapDaysAdded))
              ? Number(body.leapDaysAdded)
              : null,
        weekdays: body.weekdays === undefined ? undefined : ((body.weekdays as object[]) ?? []),
        months: body.months === undefined ? undefined : ((body.months as object[]) ?? []),
        seasons: body.seasons === undefined ? undefined : ((body.seasons as object[]) ?? []),
        astronomicalEvents:
          body.astronomicalEvents === undefined
            ? undefined
            : ((body.astronomicalEvents as object[]) ?? []),
        festivals: body.festivals === undefined ? undefined : ((body.festivals as object[]) ?? []),
        isFree: typeof body.isFree === "boolean" ? body.isFree : undefined,
        isPublished: typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/worldbuilder/calendars/[id] failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    void request;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.calendar.findUnique({
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

    await prisma.calendar.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/worldbuilder/calendars/[id] failed:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
