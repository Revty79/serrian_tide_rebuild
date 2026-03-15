import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canUseGalaxy } from "@/lib/galaxy/server";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { GradientText } from "@/components/GradientText";
import { GalaxyForgeApp } from "@/components/galaxy/galaxy-forge-app";

export default async function GalaxyForgePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  if (!canUseGalaxy(user.roleId)) {
    return (
      <main className="min-h-screen px-6 py-10">
        <section className="max-w-3xl mx-auto">
          <Card
            padded={false}
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-2xl"
          >
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-3xl sm:text-4xl tracking-tight mb-2"
            >
              Galaxy Forge (Locked)
            </GradientText>
            <p className="text-base text-zinc-300/90">
              Your current role <span className="font-semibold">{user.roleId}</span> does not have
              world-building permissions.
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Ask an admin to upgrade your role to a world-builder tier.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/source-forge">
                <Button variant="secondary" size="sm">
                  Back to Source Forge
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <GalaxyForgeApp
      user={{
        id: user.id,
        username: user.username ?? user.email,
        role: user.roleId,
      }}
    />
  );
}
