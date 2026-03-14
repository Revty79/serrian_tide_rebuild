import { redirect } from "next/navigation";
import { GradientText } from "@/components/GradientText";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getCurrentUser } from "@/lib/session";

export default async function ResetPasswordPage() {
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
          className="font-evanescent text-center text-[clamp(2rem,9vw,4.75rem)] leading-[0.95]"
        >
          Choose New Password
        </GradientText>
        <p className="mt-2 mb-6 text-center text-slate-200">
          Confirm your new password to continue.
        </p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
