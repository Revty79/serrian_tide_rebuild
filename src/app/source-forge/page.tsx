import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getRoleCapabilities } from "@/lib/authorization";
import { formatUserRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

function getComingSoonHref(tool: string): string {
  const params = new URLSearchParams({
    realm: "world_builder",
    tool,
    back: "/source-forge",
  });

  return `/coming-soon?${params.toString()}`;
}

export default async function SourceForgePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const capabilities = getRoleCapabilities(user.roleId);
  const roleLabel = formatUserRole(user.roleId);

  // Mirrors the old program: Source Forge route is available to world-building roles.
  if (!capabilities.canWorldBuild) {
    return (
      <main className="min-h-screen px-6 py-10">
        <section className="mx-auto w-full max-w-3xl">
          <Card
            padded={false}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur"
          >
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-[clamp(2rem,7vw,4rem)] leading-[0.92]"
            >
              The Source Forge (Locked)
            </GradientText>
            <p className="mt-3 text-base text-zinc-300/90">
              Your current role{" "}
              <span className="font-semibold text-amber-200">{roleLabel}</span> does not have
              world-building permissions yet.
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Trusted builder roles can access this area once your account tier is upgraded.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Return to Dashboard
                </Button>
              </Link>
              <Link href={getComingSoonHref("role_upgrade_request")}>
                <Button size="sm">Request Access</Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <header className="mx-auto mb-8 flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <GradientText
            as="h1"
            variant="title"
            glow
            className="font-evanescent text-[clamp(2.2rem,8vw,4.8rem)] leading-[0.92]"
          >
            The Source Forge
          </GradientText>
          <p className="mt-1 text-sm text-zinc-300/90">
            Welcome, {user.username ?? user.email}. Build and manage your worlds from this core
            hub.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Active role: <span className="font-semibold text-amber-200">{roleLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              Profile
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl">
        <Card
          variant="subtle"
          padded={false}
          className="mb-8 rounded-2xl border border-violet-300/30 bg-violet-300/5 p-4 backdrop-blur"
        >
          <p className="text-center text-sm text-zinc-200">
            <span className="font-semibold text-violet-200">Start here:</span> use the{" "}
            <span className="text-amber-200">World Builder&apos;s Toolbox</span> to create reusable
            components, then move into <span className="text-emerald-200">Galaxy Forge</span> to
            assemble the world timeline.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card
            padded={false}
            className="group rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur transition hover:shadow-[0_0_50px_rgba(251,191,36,0.2)]"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-amber-400/20">
              <div className="h-6 w-6 rounded-full bg-amber-300" />
            </div>
            <GradientText
              as="h2"
              variant="card-title"
              className="font-portcullion text-2xl md:text-3xl"
            >
              World Builder&apos;s Toolbox
            </GradientText>
            <p className="mt-3 text-base leading-relaxed text-zinc-300/90">
              Build reusable systems for races, factions, skill trees, inventory, calendars, and
              world lore records.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
              <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-1">
                Components
              </span>
              <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-1">
                Lore
              </span>
              <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-1">
                Rules
              </span>
            </div>
            <div className="mt-6">
              <Link href="/worldbuilder/toolbox">
                <Button variant="primary" size="md" fullWidth>
                  Open Toolbox
                </Button>
              </Link>
            </div>
          </Card>

          <Card
            padded={false}
            className="group rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur transition hover:shadow-[0_0_50px_rgba(167,139,250,0.2)]"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-violet-400/20">
              <div className="h-6 w-6 rounded-full bg-violet-300" />
            </div>
            <GradientText
              as="h2"
              variant="card-title"
              className="font-portcullion text-2xl md:text-3xl"
            >
              Galaxy Forge
            </GradientText>
            <p className="mt-3 text-base leading-relaxed text-zinc-300/90">
              Assemble eras, settings, and event chains into a single timeline-first world map for
              campaigns and expansions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
              <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2 py-1">
                Eras
              </span>
              <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2 py-1">
                Settings
              </span>
              <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2 py-1">
                Events
              </span>
            </div>
            <div className="mt-6">
              <Link href="/worldbuilder/galaxy">
                <Button variant="primary" size="md" fullWidth>
                  Open Galaxy Forge
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        <Card
          variant="subtle"
          padded={false}
          className="mt-10 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 backdrop-blur"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-200">
              Access: <span className="font-medium text-amber-200">{roleLabel}</span> (Source
              Forge enabled)
            </p>
            <p className="text-xs text-zinc-400">
              {capabilities.canAccessSourceForge
                ? "Dashboard-visible Source Forge access"
                : "Direct builder access enabled"}
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
