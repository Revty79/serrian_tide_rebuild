import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionForUser, setSessionCookie } from "@/lib/session";
import {
  normalizeEmail,
  normalizeUsername,
  verifyPassword,
} from "@/lib/security";

type LoginBody = {
  identifier?: unknown;
  email?: unknown;
  password?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const identifierRaw = asString(body.identifier || body.email).trim();
  const identifier = identifierRaw.includes("@")
    ? normalizeEmail(identifierRaw)
    : normalizeUsername(identifierRaw);
  const password = asString(body.password);

  if (!identifier || password.length === 0) {
    return NextResponse.json(
      { error: "Invalid username/email or password." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid username/email or password." },
      { status: 401 }
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json(
      { error: "Invalid username/email or password." },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSessionForUser(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token, expiresAt);
  return response;
}
