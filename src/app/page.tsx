import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-5xl">
        <GradientText
          as="h1"
          variant="title"
          glow
          className="font-evanescent text-5xl sm:text-6xl md:text-7xl tracking-tight text-center"
        >
          SERRIAN TIDE
        </GradientText>

        <p className="mt-4 text-center text-slate-200 max-w-2xl mx-auto">
          Rebuild sandbox is live. This app is separate from production and keeps
          the same visual foundation (fonts, images, gradients, and core UI atoms).
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-portcullion text-2xl text-amber-200">Sandbox Goal</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Recreate the current platform feature-by-feature in a cleaner architecture.
            </p>
          </Card>

          <Card>
            <h2 className="font-portcullion text-2xl text-amber-200">Visual Parity</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Shared brand assets are synced from the current repo using{" "}
              <code>npm run sync:brand</code>.
            </p>
          </Card>
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg">
            Rebuild Started
          </Button>
        </div>
      </section>
    </main>
  );
}
