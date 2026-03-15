"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GradientText } from "@/components/GradientText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";

type ProfileUser = {
  id: string;
  username: string | null;
  email: string;
  role: string;
  roleId: string;
  createdAt?: string;
};

type ProfileStats = {
  worldbuilder: {
    skills: number;
    calendars: number;
    npcs: number;
    total: number;
  };
  account: {
    activeSessions: number;
  };
};

const BACKGROUND_OPTIONS = [
  { value: "nebula.png", label: "Nebula" },
  { value: "SPBackground.png", label: "Steampunk Background" },
  { value: "WesternBG.png", label: "Western Background" },
  { value: "HF.png", label: "High Fantasy" },
];

const GEAR_OPTIONS = [
  { value: "", label: "None" },
  { value: "SPGear.png", label: "Steampunk Gear" },
  { value: "alchemy.png", label: "Alchemy" },
  { value: "Revolver.png", label: "Revolver" },
];

async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${response.status})`);
  }
}

function applyPreferences(theme: string, backgroundImage: string, gearImage: string | null) {
  document.documentElement.className = `theme-${theme || "void"}`;

  document.body.style.backgroundImage = `
    linear-gradient(var(--st-tint), var(--st-tint)),
    url("/${backgroundImage}"),
    linear-gradient(to bottom, var(--st-top), var(--st-deep))
  `
    .replace(/\s+/g, " ")
    .trim();

  const styleId = "user-gear-style";
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  if (gearImage) {
    styleEl.textContent = `
      body::before {
        background-image: url("/${gearImage}") !important;
      }
    `;
  } else {
    styleEl.textContent = `
      body::before {
        display: none !important;
      }
    `;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  const [theme, setTheme] = useState("void");
  const [backgroundImage, setBackgroundImage] = useState("nebula.png");
  const [gearImage, setGearImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [userRes, prefRes, statsRes] = await Promise.all([
          fetch("/api/profile/me", { cache: "no-store" }),
          fetch("/api/profile/preferences", { cache: "no-store" }),
          fetch("/api/profile/stats", { cache: "no-store" }),
        ]);

        if (userRes.status === 401) {
          router.push("/auth");
          return;
        }

        const userData = await parseJsonResponse(userRes);
        if (!userData?.ok || !userData.user) {
          throw new Error(userData?.error || "Failed to load profile.");
        }

        const prefData = await parseJsonResponse(prefRes);
        const statsData = await parseJsonResponse(statsRes);

        if (!active) return;

        setUser(userData.user as ProfileUser);

        if (prefData?.ok && prefData.preferences) {
          setTheme(prefData.preferences.theme || "void");
          setBackgroundImage(prefData.preferences.backgroundImage || "nebula.png");
          setGearImage(prefData.preferences.gearImage || null);
        }

        if (statsData?.ok && statsData.stats) {
          setStats(statsData.stats as ProfileStats);
        }
      } catch (error) {
        console.error("Profile load failed:", error);
        if (active) {
          setMessage("Failed to load profile data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [router]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return "Unknown";
    const parsed = new Date(user.createdAt);
    if (Number.isNaN(parsed.getTime())) return "Unknown";
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }, [user?.createdAt]);

  async function handleSavePreferences() {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/profile/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, backgroundImage, gearImage }),
      });
      const data = await parseJsonResponse(response);
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to save preferences");
      }

      applyPreferences(theme, backgroundImage, gearImage);
      setMessage("Preferences saved successfully.");
      window.setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Profile save failed:", error);
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10 flex items-center justify-center">
        <p className="text-zinc-400">Loading profile...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-4xl sm:text-5xl tracking-tight"
            >
              Profile
            </GradientText>
            <p className="mt-1 text-sm text-zinc-300/90">
              Identity, account context, and personal interface setup.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm" type="button">
              {"<- Dashboard"}
            </Button>
          </Link>
        </header>

        {message ? (
          <div
            className={`rounded-xl border px-4 py-2 text-sm ${
              message.includes("success")
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {message}
          </div>
        ) : null}

        <Card padded className="space-y-4">
          <GradientText
            as="h2"
            variant="card-title"
            className="font-portcullion text-xl"
          >
            Your Journey
          </GradientText>
          <p className="text-xs text-zinc-300/90">
            Snapshot of your current activity in the rebuild.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-violet-400/30 bg-violet-400/5 p-4">
              <p className="text-xs uppercase tracking-wide text-violet-300">Worldbuilder Total</p>
              <p className="mt-2 text-2xl font-semibold text-violet-100">
                {stats?.worldbuilder.total ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-300">Skills</p>
              <p className="mt-2 text-2xl font-semibold text-amber-100">
                {stats?.worldbuilder.skills ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-4">
              <p className="text-xs uppercase tracking-wide text-sky-300">Calendars</p>
              <p className="mt-2 text-2xl font-semibold text-sky-100">
                {stats?.worldbuilder.calendars ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-300">NPCs</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-100">
                {stats?.worldbuilder.npcs ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padded className="space-y-4">
          <GradientText as="h2" variant="card-title" className="font-portcullion text-xl">
            Account Info
          </GradientText>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Username" htmlFor="profile-username" description="Your identity in Serrian Tide.">
              <Input id="profile-username" value={user.username ?? ""} readOnly className="opacity-80" />
            </FormField>
            <FormField label="Email" htmlFor="profile-email" description="Login account email.">
              <Input id="profile-email" type="email" value={user.email} readOnly className="opacity-80" />
            </FormField>
            <FormField label="Role" htmlFor="profile-role" description="Permissions and access level.">
              <Input id="profile-role" value={user.role} readOnly className="uppercase tracking-wide opacity-80" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400">
            <p>
              Member Since: <span className="text-zinc-200">{memberSince}</span>
            </p>
            <p>
              Active Sessions: <span className="text-zinc-200">{stats?.account.activeSessions ?? 0}</span>
            </p>
          </div>
        </Card>

        <Card padded className="space-y-6">
          <div>
            <GradientText as="h2" variant="card-title" className="font-portcullion text-xl">
              Visual Customization
            </GradientText>
            <p className="mt-2 text-xs text-zinc-300/90">
              Configure how your workspace looks. Preferences apply globally after save.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <FormField
                label="Background Image"
                htmlFor="profile-background"
                description="Main background for your interface."
              >
                <select
                  id="profile-background"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 shadow-inner backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {BACKGROUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={`/${backgroundImage}`}
                  alt="Background preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="space-y-3">
              <FormField
                label="Spinning Overlay"
                htmlFor="profile-gear"
                description="Optional decorative rotating overlay."
              >
                <select
                  id="profile-gear"
                  value={gearImage ?? ""}
                  onChange={(e) => setGearImage(e.target.value || null)}
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 shadow-inner backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {GEAR_OPTIONS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
                {gearImage ? (
                  <Image src={`/${gearImage}`} alt="Gear preview" fill className="object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    No gear selected
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="primary"
            type="button"
            onClick={handleSavePreferences}
            disabled={saving}
          >
            {saving ? "Saving..." : "Apply & Save Changes"}
          </Button>
        </div>
      </section>
    </main>
  );
}
