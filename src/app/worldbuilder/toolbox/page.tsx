import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";

type ToolCard = {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
  iconBg: string;
  dotBg: string;
  hoverShadow: string;
};

const TOOL_CARDS: ToolCard[] = [
  {
    title: "Skillsets",
    description:
      "Define skills, disciplines, spell lines, and special abilities that power progression.",
    href: "/worldbuilder/skillsets",
    buttonLabel: "Enter Skillsets",
    iconBg: "bg-blue-500/20",
    dotBg: "bg-blue-300",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  },
  {
    title: "Inventory",
    description:
      "Manage weapons, gear, artifacts, services, companions, and other world inventory foundations.",
    href: "/worldbuilder/inventory",
    buttonLabel: "Enter Inventory",
    iconBg: "bg-amber-500/20",
    dotBg: "bg-amber-300",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(251,191,36,0.15)]",
  },
  {
    title: "NPCs",
    description:
      "Build NPC records with stats, skill allocations, and story hooks for campaigns.",
    href: "/worldbuilder/npcs",
    buttonLabel: "Enter NPCs",
    iconBg: "bg-purple-500/20",
    dotBg: "bg-purple-300",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]",
  },
  {
    title: "Calendars",
    description:
      "Design calendars with custom month structures, seasons, festivals, and astronomical events.",
    href: "/worldbuilder/calendars",
    buttonLabel: "Enter Calendars",
    iconBg: "bg-violet-500/20",
    dotBg: "bg-violet-300",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]",
  },
];

export default function ToolboxPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <header className="mx-auto mb-8 flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <GradientText
            as="h1"
            variant="title"
            glow
            className="font-evanescent text-4xl tracking-tight sm:text-5xl"
          >
            World Builder&apos;s Toolbox
          </GradientText>
          <p className="mt-1 text-sm text-zinc-300/90">
            Ported toolbox modules that are staying stable while we rebuild the rest.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/source-forge">
            <Button variant="secondary" size="sm">
              {"<-"} Source Forge Hub
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl">
        <Card
          variant="subtle"
          padded={false}
          className="mb-8 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 backdrop-blur"
        >
          <p className="text-center text-sm text-zinc-200">
            <span className="font-semibold text-amber-200">In scope now:</span> Skillsets,
            Inventory, NPCs, and Calendars. Races and Creatures are intentionally excluded for the
            rebuild.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
          {TOOL_CARDS.map((tool) => (
            <Card
              key={tool.href}
              padded={false}
              className={[
                "group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur transition",
                tool.hoverShadow,
              ].join(" ")}
            >
              <div
                className={[
                  "mb-3 flex h-12 w-12 items-center justify-center rounded-lg",
                  tool.iconBg,
                ].join(" ")}
              >
                <div className={["h-3 w-3 rounded-full", tool.dotBg].join(" ")} />
              </div>
              <GradientText
                as="h2"
                variant="card-title"
                className="font-portcullion text-lg md:text-xl"
              >
                {tool.title}
              </GradientText>
              <p className="mt-2 text-base text-zinc-300/90">{tool.description}</p>
              <div className="mt-4">
                <Link href={tool.href}>
                  <Button variant="primary" size="sm">
                    {tool.buttonLabel}
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
