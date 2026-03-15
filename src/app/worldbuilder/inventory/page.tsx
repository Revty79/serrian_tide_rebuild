"use client";

import Link from "next/link";
import { GradientText } from "@/components/GradientText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { WBNav } from "@/components/worldbuilder/WBNav";

const INVENTORY_SECTIONS = [
  {
    id: "items",
    title: "Items & Gear",
    blurb:
      "Lanterns, lockpicks, potions, rations, spell foci, oddities, and general gear that fills your shops and packs.",
    href: "/worldbuilder/inventory/items",
    badge: "Live",
  },
  {
    id: "weapons",
    title: "Weapons",
    blurb:
      "Blades, guns, bows, relic weapons, and everything that deals damage or threatens violence.",
    href: "/worldbuilder/inventory/weapons",
    badge: "Live",
  },
  {
    id: "armor",
    title: "Armor & Protection",
    blurb:
      "Armors, shields, exoskeletons, environmental suits, and anything that soaks or redirects harm.",
    href: "/worldbuilder/inventory/armor",
    badge: "Live",
  },
  {
    id: "artifacts",
    title: "Artifacts & Relics",
    blurb:
      "Singular, lore-heavy items that anchor eras and campaigns: cursed relics, mythic weapons, legendary wonders.",
    href: "/worldbuilder/inventory/artrifacts",
    badge: "Live",
  },
  {
    id: "services",
    title: "Services",
    blurb:
      "Travel, lodgings, spellcasting, crafting, information brokering—anything you pay people to do in-world.",
    href: "/worldbuilder/inventory/services",
    badge: "Live",
  },
  {
    id: "companions",
    title: "Pets, Mounts & Companions",
    blurb:
      "Bought, bonded, or summoned allies that ride with the party and matter mechanically and narratively.",
    href: "/worldbuilder/inventory/items/companions",
    badge: "Live",
  },
] as const;

export default function InventoryHubPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-4xl sm:text-5xl tracking-tight"
            >
              The Source Forge — Inventory
            </GradientText>
            <p className="mt-2 text-sm text-zinc-300/90 max-w-2xl">
              This is the hub for everything characters can carry, wear, buy,
              or bond with. Build specialized lists for gear, weapons, armor,
              artifacts, services, and companions—each with its own dedicated
              builder.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Link href="/worldbuilder/toolbox">
              <Button variant="secondary" size="sm" type="button">
                ← Toolbox
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-end">
          <WBNav current="inventory" />
        </div>
      </header>

      {/* Sections grid */}
      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {INVENTORY_SECTIONS.map((sec) => (
            <Card
              key={sec.id}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-zinc-100">
                    {sec.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">
                    {sec.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{sec.blurb}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] text-zinc-500 max-w-[60%]">
                  Each builder uses the same shell: library on the left, editor
                  on the right, with tabs for basics, mechanics, lore, and
                  preview.
                </div>
                <Link href={sec.href}>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                  >
                    Open Builder →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
