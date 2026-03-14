import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionExpiryDate,
  setSessionCookie,
} from "@/lib/session";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  validatePassword,
} from "@/lib/security";

type ResetPasswordBody = {
  token?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ResetPasswordBody;
  try {
    body = (await request.json()) as ResetPasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = asString(body.token).trim();
  const password = asString(body.password);
  const confirmPassword = asString(body.confirmPassword);

  if (!token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
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

  const resetTokenRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!resetTokenRecord) {
    return NextResponse.json(
      { error: "Reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const nextSessionToken = generateOpaqueToken();
  const nextSessionTokenHash = hashOpaqueToken(nextSessionToken);
  const nextSessionExpiry = getSessionExpiryDate();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetTokenRecord.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetTokenRecord.userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.session.deleteMany({
      where: { userId: resetTokenRecord.userId },
    });

    await tx.session.create({
      data: {
        userId: resetTokenRecord.userId,
        tokenHash: nextSessionTokenHash,
        expiresAt: nextSessionExpiry,
      },
    });
  });

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, nextSessionToken, nextSessionExpiry);
  return response;
}
