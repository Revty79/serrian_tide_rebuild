import Link from "next/link";

export type WBNavKey =
  | "toolbox"
  | "skillsets"
  | "inventory"
  | "calendars"
  | "npcs";

interface NavItem {
  href: string;
  key: WBNavKey;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/worldbuilder/toolbox", key: "toolbox", label: "Toolbox" },
  { href: "/worldbuilder/skillsets", key: "skillsets", label: "Skillsets" },
  { href: "/worldbuilder/inventory", key: "inventory", label: "Inventory" },
  { href: "/worldbuilder/calendars", key: "calendars", label: "Calendars" },
  { href: "/worldbuilder/npcs", key: "npcs", label: "NPCs" },
];

export function WBNav({ current }: { current?: WBNavKey }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {NAV_ITEMS.map((it) => {
        const active = current === it.key;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={[
              "rounded-xl px-3 py-1.5 text-sm border transition",
              active
                ? "border-violet-400/40 text-violet-200 bg-violet-400/10"
                : "border-white/15 text-zinc-200 hover:bg-white/10",
            ].join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
