"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getRoleCapabilities } from "@/lib/authorization";

type PixieLink = {
  href: string;
  label: string;
};

type ProfileMeResponse = {
  ok?: boolean;
  user?: {
    roleId?: string | null;
  };
};

const BASE_PIXIE_LINKS: PixieLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  {
    href: "/coming-soon?realm=players_realm&tool=character_hub&back=/dashboard",
    label: "Players' Realm",
  },
  {
    href: "/coming-soon?realm=gods_realm&tool=campaign_control&back=/dashboard",
    label: "Gods' Realm",
  },
  {
    href: "/coming-soon?realm=astral_gate&tool=vtt_gateway&back=/dashboard",
    label: "The Astral Gate",
  },
  { href: "/coming-soon?realm=free_tools&tool=utilities&back=/dashboard", label: "Free Tools" },
  { href: "/profile", label: "Profile" },
];

const SOURCE_FORGE_LINK: PixieLink = { href: "/source-forge", label: "Source Forge" };
const TOOLBOX_LINK: PixieLink = { href: "/worldbuilder/toolbox", label: "Toolbox" };
const BAZAAR_LINK: PixieLink = {
  href: "/coming-soon?realm=bazaar&tool=marketplace&back=/dashboard",
  label: "The Bazaar",
};
const ADMIN_LINK: PixieLink = { href: "/admin", label: "Admin Console" };

const HIDDEN_ROUTES = ["/auth", "/forgot-password", "/reset-password"];

function isActive(pathname: string, href: string): boolean {
  if (href.startsWith("/coming-soon")) {
    return pathname === "/coming-soon";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationPixie() {
  const pathname = usePathname() ?? "";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        const response = await fetch("/api/profile/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) {
            setRoleId(null);
            setRoleLoaded(true);
          }
          return;
        }

        const data = (await response.json().catch(() => null)) as ProfileMeResponse | null;
        if (active) {
          setRoleId(data?.ok ? data?.user?.roleId ?? null : null);
          setRoleLoaded(true);
        }
      } catch {
        if (active) {
          setRoleId(null);
          setRoleLoaded(true);
        }
      }
    }

    void loadRole();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (!open) {
      return;
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const capabilities = useMemo(() => getRoleCapabilities(roleId), [roleId]);
  const links = useMemo(() => {
    const nextLinks = [...BASE_PIXIE_LINKS];

    if (capabilities.canAccessSourceForge) {
      nextLinks.splice(1, 0, SOURCE_FORGE_LINK);
      nextLinks.splice(2, 0, TOOLBOX_LINK);
      nextLinks.push(BAZAAR_LINK);
    }

    if (capabilities.canSeeAdmin) {
      nextLinks.push(ADMIN_LINK);
    }

    return nextLinks;
  }, [capabilities.canAccessSourceForge, capabilities.canSeeAdmin]);

  if (HIDDEN_ROUTES.includes(pathname) || !roleLoaded || !roleId) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="fixed z-[70]"
      style={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        left: "calc(env(safe-area-inset-left) + 12px)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label="Open Navigation Pixie"
        onClick={() => setOpen((value) => !value)}
        className={[
          "st-pixie-float relative h-16 w-16 rounded-full border backdrop-blur transition",
          "border-pink-200/65 bg-slate-950/75 shadow-[0_0_24px_rgba(236,72,153,0.35)]",
          "hover:border-pink-100 hover:shadow-[0_0_34px_rgba(236,72,153,0.55)]",
        ].join(" ")}
      >
        <span className="sr-only">Navigation Pixie</span>
        <span className="pointer-events-none absolute inset-0 st-fairy-shell">
          <span className="st-pixie-spark st-pixie-spark-a" />
          <span className="st-pixie-spark st-pixie-spark-b" />
          <span className="st-pixie-spark st-pixie-spark-c" />
          <span className="st-fairy-wing st-fairy-wing-left" />
          <span className="st-fairy-wing st-fairy-wing-right" />
          <span className="st-fairy-halo" />
          <span className="st-fairy-head">
            <span className="st-fairy-eye st-fairy-eye-left" />
            <span className="st-fairy-eye st-fairy-eye-right" />
            <span className="st-fairy-blush st-fairy-blush-left" />
            <span className="st-fairy-blush st-fairy-blush-right" />
          </span>
          <span className="st-fairy-hair" />
          <span className="st-fairy-body" />
          <span className="st-fairy-wand" />
          <span className="st-fairy-star" />
        </span>
      </button>

      {open ? (
        <div className="absolute left-16 top-0 w-[min(90vw,350px)] rounded-2xl border border-white/15 bg-slate-950/94 p-3 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold text-amber-200">Navigation Pixie</p>
          <p className="mt-1 text-xs text-zinc-300">Where to next, dreamer?</p>

          <div className="mt-3 max-h-[70vh] space-y-1.5 overflow-auto pr-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={[
                  "block rounded-lg border px-2.5 py-2 text-xs transition",
                  isActive(pathname, link.href)
                    ? "border-violet-400/40 bg-violet-500/10 text-violet-100"
                    : "border-white/10 bg-black/25 text-zinc-200 hover:bg-white/10",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
            {!capabilities.canAccessSourceForge ? (
              <p className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-zinc-500">
                Source Forge is locked for your role.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
