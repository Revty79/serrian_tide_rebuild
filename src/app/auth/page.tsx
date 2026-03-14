import { redirect } from "next/navigation";
import { GradientText } from "@/components/GradientText";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/session";

export default async function AuthPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 flex items-center justify-center">
      <section className="w-full max-w-xl">
        <GradientText
          as="h1"
          variant="title"
          glow
          className="font-evanescent text-center text-[clamp(2.4rem,10vw,5.5rem)] leading-[0.92]"
        >
          SERRIAN TIDE
        </GradientText>
        <p className="mt-2 mb-6 text-center text-slate-200">
          Login or create your account to enter.
        </p>
        <AuthForm />
      </section>
    </main>
  );
}
