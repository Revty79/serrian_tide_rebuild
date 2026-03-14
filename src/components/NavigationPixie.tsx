"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PixieLink = {
  href: string;
  label: string;
};

const PIXIE_LINKS: PixieLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/coming-soon?realm=world_builder&tool=source_forge&back=/dashboard", label: "Source Forge" },
  { href: "/coming-soon?realm=players_realm&tool=character_hub&back=/dashboard", label: "Players' Realm" },
  { href: "/coming-soon?realm=gods_realm&tool=campaign_control&back=/dashboard", label: "Gods' Realm" },
  { href: "/coming-soon?realm=astral_gate&tool=vtt_gateway&back=/dashboard", label: "The Astral Gate" },
  { href: "/coming-soon?realm=bazaar&tool=marketplace&back=/dashboard", label: "The Bazaar" },
  { href: "/coming-soon?realm=profile&tool=profile_settings&back=/dashboard", label: "Profile" },
];

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

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (HIDDEN_ROUTES.includes(pathname)) {
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
            {PIXIE_LINKS.map((link) => (
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
