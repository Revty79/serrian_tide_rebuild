"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/auth");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
