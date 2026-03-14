import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";

type SearchParams = Record<string, string | string[] | undefined>;

type ComingSoonPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function pickFirst(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toTitleLabel(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().replace(/[-_]+/g, " ").toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSafeBackPath(value: string | null): string {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function ComingSoonPage({
  searchParams,
}: ComingSoonPageProps) {
  const resolvedParams = (searchParams ? await searchParams : {}) as SearchParams;
  const realm = toTitleLabel(pickFirst(resolvedParams.realm), "Serrian Tide");
  const tool = toTitleLabel(pickFirst(resolvedParams.tool), "This Feature");
  const backHref = toSafeBackPath(pickFirst(resolvedParams.back));

  return (
    <main className="min-h-screen px-6 py-10 flex items-center justify-center">
      <section className="w-full max-w-2xl">
        <Card
          padded={false}
          className="rounded-3xl border border-violet-400/30 bg-slate-950/65 p-7 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-amber-400/25" />
          <GradientText
            as="h1"
            variant="title"
            glow
            className="font-evanescent text-[clamp(2.2rem,8vw,4.8rem)] leading-[0.92]"
          >
            Coming Soon
          </GradientText>
          <p className="mt-4 text-slate-100">{tool} is currently under active development.</p>
          <p className="mt-1 text-sm text-slate-300">Realm: {realm}</p>
          <div className="mt-7">
            <Link href={backHref}>
              <Button size="md">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
