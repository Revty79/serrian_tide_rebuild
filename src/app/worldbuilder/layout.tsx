import { redirect } from "next/navigation";
import { getRoleCapabilities } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/session";

export default async function WorldBuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const capabilities = getRoleCapabilities(user.roleId);
  if (!capabilities.canWorldBuild) {
    redirect("/source-forge");
  }

  return <>{children}</>;
}
