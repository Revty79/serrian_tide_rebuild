"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const INVENTORY_LINKS = [
  { href: "/worldbuilder/inventory/items", label: "Items & Gear" },
  { href: "/worldbuilder/inventory/weapons", label: "Weapons" },
  { href: "/worldbuilder/inventory/armor", label: "Armor" },
  { href: "/worldbuilder/inventory/artrifacts", label: "Artifacts" },
  { href: "/worldbuilder/inventory/services", label: "Services" },
  { href: "/worldbuilder/inventory/items/companions", label: "Companions" },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 flex-wrap">
      {INVENTORY_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${
                isActive
                  ? "bg-violet-500/20 text-violet-200 border border-violet-400/40"
                  : "bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 hover:text-zinc-100"
              }
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
