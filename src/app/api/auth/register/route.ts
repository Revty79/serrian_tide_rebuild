import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemRoles } from "@/lib/role-db";
import { DEFAULT_ROLE_ID } from "@/lib/roles";
import {
  clearSessionCookie,
  createSessionForUser,
  setSessionCookie,
} from "@/lib/session";
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from "@/lib/security";

type RegisterBody = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = normalizeUsername(asString(body.username));
  const email = normalizeEmail(asString(body.email));
  const password = asString(body.password);
  const confirmPassword = asString(body.confirmPassword);

  const usernameError = validateUsername(username);
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Password confirmation does not match." },
      { status: 400 }
    );
  }

  try {
    await ensureSystemRoles();

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        roleId: DEFAULT_ROLE_ID,
        passwordHash,
      },
      select: {
        id: true,
      },
    });

    const { token, expiresAt } = await createSessionForUser(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username or email is already in use." },
        { status: 409 }
      );
    }

    const response = NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 }
    );
    clearSessionCookie(response);
    return response;
  }
}
