import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/security";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = "st_session";

export function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function createSessionForUser(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = getSessionExpiryDate();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const rawSessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!rawSessionToken) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashOpaqueToken(rawSessionToken) },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    return session.user;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    console.error("getCurrentUser failed:", error);
    return null;
  }
}
