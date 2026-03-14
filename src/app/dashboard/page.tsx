import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ADMIN_ROLE_ID, formatUserRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

type DashboardRealm = {
  title: string;
  realm: string;
  summary: string;
  accent: string;
  cta: string;
};

const DASHBOARD_REALMS: DashboardRealm[] = [
  {
    title: "Source Forge",
    realm: "world_builder",
    summary: "Build worlds, cultures, factions, and timelines for your campaigns.",
    accent: "bg-violet-400/25",
    cta: "Open Source Forge",
  },
  {
    title: "Players' Realm",
    realm: "players_realm",
    summary: "Create characters, manage sheets, and track session progression.",
    accent: "bg-emerald-400/25",
    cta: "Enter Realm",
  },
  {
    title: "Gods' Realm",
    realm: "gods_realm",
    summary: "Design campaign arcs, encounters, and story-driving lore anchors.",
    accent: "bg-amber-400/25",
    cta: "Enter Realm",
  },
  {
    title: "The Astral Gate",
    realm: "astral_gate",
    summary: "Future VTT gateway for live tables, maps, and real-time session control.",
    accent: "bg-sky-400/25",
    cta: "Enter Gateway",
  },
  {
    title: "Free Tools",
    realm: "free_tools",
    summary: "Fast utility tools for players and GMs without extra setup.",
    accent: "bg-rose-400/25",
    cta: "Open Tools",
  },
  {
    title: "The Bazaar",
    realm: "bazaar",
    summary: "Explore marketplace tools, packs, and future community modules.",
    accent: "bg-indigo-400/25",
    cta: "Visit Bazaar",
  },
];

function getComingSoonHref(realm: string, tool: string): string {
  const params = new URLSearchParams({
    realm,
    tool,
    back: "/dashboard",
  });

  return `/coming-soon?${params.toString()}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const isAdmin = user.roleId === ADMIN_ROLE_ID;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-violet-400/30 bg-slate-950/65 p-5 sm:p-6 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-[clamp(2.1rem,7vw,4.4rem)] leading-[0.92]"
            >
              Dashboard
            </GradientText>
            <p className="mt-2 text-sm text-slate-200">
              Signed in as{" "}
              <span className="font-semibold text-amber-200">
                {user.username ?? user.email}
              </span>
            </p>
            <p className="text-sm text-slate-300">
              Role:{" "}
              <span className="font-medium text-violet-200">
                {formatUserRole(user.roleId)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={getComingSoonHref("profile", "profile_management")}>
              <Button variant="secondary" size="sm">
                Profile
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DASHBOARD_REALMS.map((realm) => (
            <Card
              key={realm.realm}
              padded={false}
              className="rounded-3xl border border-white/10 bg-slate-900/45 p-5 shadow-2xl backdrop-blur"
            >
              <div className={`mb-3 h-10 w-10 rounded-xl ${realm.accent}`} />
              <h2 className="font-portcullion text-2xl text-amber-200">{realm.title}</h2>
              <p className="mt-2 min-h-14 text-sm text-slate-300">{realm.summary}</p>
              <div className="mt-4">
                <Link href={getComingSoonHref(realm.realm, realm.title)}>
                  <Button size="sm">{realm.cta}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {isAdmin ? (
          <Card
            padded={false}
            className="mt-6 rounded-3xl border border-red-400/40 bg-red-950/20 p-5 shadow-xl backdrop-blur"
          >
            <h2 className="font-portcullion text-2xl text-red-200">Admin Console</h2>
            <p className="mt-2 text-sm text-red-100/90">
              Manage users, roles, and platform access controls.
            </p>
            <div className="mt-4">
              <Link href="/admin">
                <Button variant="danger" size="sm">
                  Open Admin Console
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
