import { redirect } from "next/navigation";
import { GradientText } from "@/components/GradientText";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { formatUserRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-3xl border border-violet-400/30 bg-slate-950/65 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
        <GradientText
          as="h1"
          variant="title"
          glow
          className="font-evanescent text-[clamp(2.2rem,8vw,4.8rem)] leading-[0.92]"
        >
          Dashboard
        </GradientText>

        <p className="mt-4 text-slate-200">
          Signed in as{" "}
          <span className="font-semibold text-amber-200">
            {user.username ?? user.email}
          </span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Role: <span className="font-medium text-violet-200">{formatUserRole(user.roleId)}</span>
        </p>

        <p className="mt-5 rounded-2xl border border-slate-700/80 bg-slate-900/70 px-4 py-6 text-slate-300">
          Coming soon
        </p>

        <div className="mt-6 flex justify-center">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
