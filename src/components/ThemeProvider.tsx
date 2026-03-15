"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type PreferencesResponse = {
  ok?: boolean;
  preferences?: {
    theme?: string | null;
    backgroundImage?: string | null;
    gearImage?: string | null;
  };
};

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/profile/preferences", { cache: "no-store" });
        if (!active) return;

        if (response.status === 401) {
          applyPreferences("void", "nebula.png", null);
          return;
        }

        const data = (await response.json().catch(() => null)) as PreferencesResponse | null;
        if (!data?.ok || !data.preferences) {
          applyPreferences("void", "nebula.png", null);
          return;
        }

        applyPreferences(
          data.preferences.theme || "void",
          data.preferences.backgroundImage || "nebula.png",
          data.preferences.gearImage || null
        );
      } catch {
        if (active) {
          applyPreferences("void", "nebula.png", null);
        }
      }
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [pathname]);

  return <>{children}</>;
}
