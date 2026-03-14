import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  normalizeEmail,
  normalizeUsername,
} from "@/lib/security";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const GENERIC_MESSAGE =
  "If an account exists for that email, password reset instructions are ready.";

type ForgotPasswordBody = {
  identifier?: unknown;
  email?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ForgotPasswordBody;
  try {
    body = (await request.json()) as ForgotPasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawIdentifier = asString(body.identifier || body.email).trim();
  if (!rawIdentifier) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const identifier = rawIdentifier.includes("@")
    ? normalizeEmail(rawIdentifier)
    : normalizeUsername(rawIdentifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: { id: true },
  });

  let resetUrl: string | undefined;

  if (user) {
    const resetToken = generateOpaqueToken();
    const resetTokenHash = hashOpaqueToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt,
      },
    });

    resetUrl = `${request.nextUrl.origin}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;
  }

  const payload: { ok: true; message: string; resetUrl?: string } = {
    ok: true,
    message: GENERIC_MESSAGE,
  };

  if (process.env.NODE_ENV !== "production" && resetUrl) {
    payload.resetUrl = resetUrl;
  }

  return NextResponse.json(payload);
}
