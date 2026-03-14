import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { GradientText } from "@/components/GradientText";
import {
  type AdminRole,
  type AdminUser,
  AdminConsole,
} from "@/components/admin/AdminConsole";
import { prisma } from "@/lib/prisma";
import { ensureSystemRoles } from "@/lib/role-db";
import { ADMIN_ROLE_ID } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth");
  }

  if (currentUser.roleId !== ADMIN_ROLE_ID) {
    redirect("/dashboard");
  }

  await ensureSystemRoles();

  const [roles, users] = await Promise.all([
    prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const initialRoles: AdminRole[] = roles;
  const initialUsers: AdminUser[] = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-[clamp(2.1rem,7vw,4.3rem)] leading-[0.92]"
            >
              Admin Console
            </GradientText>
            <p className="mt-2 text-sm text-slate-200">
              Control user roles and access pathways across the platform.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </header>

        <AdminConsole initialRoles={initialRoles} initialUsers={initialUsers} />
      </section>
    </main>
  );
}
