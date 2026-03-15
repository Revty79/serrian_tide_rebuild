import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemRoles } from "@/lib/role-db";
import { ADMIN_ROLE_ID, canonicalizeRoleId } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

type RoleUpdateBody = {
  userId?: unknown;
  role?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: RoleUpdateBody;
  try {
    body = (await request.json()) as RoleUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = asString(body.userId).trim();
  const roleInput = canonicalizeRoleId(asString(body.role));

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  await ensureSystemRoles();
  const targetRole = await prisma.role.findUnique({
    where: { id: roleInput },
    select: { id: true },
  });

  if (!targetRole) {
    const availableRoles = await prisma.role.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(
      {
        error: `Invalid role. Available roles: ${availableRoles
          .map((role) => role.id)
          .join(", ")}`,
      },
      { status: 400 }
    );
  }

  const [targetUser, adminCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, roleId: true },
    }),
    prisma.user.count({
      where: { roleId: ADMIN_ROLE_ID },
    }),
  ]);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const removingLastAdmin =
    targetUser.roleId === ADMIN_ROLE_ID &&
    roleInput !== ADMIN_ROLE_ID &&
    adminCount <= 1;

  if (removingLastAdmin) {
    return NextResponse.json(
      { error: "Cannot remove the last admin account." },
      { status: 400 }
    );
  }

  const isAdmin = actor.roleId === ADMIN_ROLE_ID;
  if (!isAdmin) {
    const isBootstrapRequest =
      adminCount === 0 && actor.id === userId && roleInput === ADMIN_ROLE_ID;

    if (!isBootstrapRequest) {
      return NextResponse.json(
        { error: "Only admins can assign roles." },
        { status: 403 }
      );
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roleId: roleInput },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
      },
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Unable to update role right now." },
      { status: 500 }
    );
  }
}
