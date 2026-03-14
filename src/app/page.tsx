import { Button } from "@/components/Button";
import { GradientText } from "@/components/GradientText";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 flex items-center justify-center">
      <section className="mx-auto w-full max-w-5xl text-center">
        <GradientText
          as="h1"
          variant="title"
          glow
          className="font-evanescent text-[clamp(3.5rem,14vw,11rem)] leading-[0.88] tracking-tight"
        >
          SERRIAN TIDE
        </GradientText>

        <div className="mt-10 sm:mt-12 flex justify-center">
          <Button variant="primary" size="lg">
            Enter Your imagination
          </Button>
        </div>
      </section>
    </main>
  );
}
