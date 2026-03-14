import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";
import { hashOpaqueToken } from "@/lib/security";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (rawSessionToken) {
    await prisma.session
      .delete({
        where: { tokenHash: hashOpaqueToken(rawSessionToken) },
      })
      .catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
