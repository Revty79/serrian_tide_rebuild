"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";

type ResetPasswordResponse = {
  error?: string;
};

const inputClassName =
  "w-full rounded-xl border border-slate-600/70 bg-slate-950/70 px-4 py-3 text-slate-100 " +
  "placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ResetPasswordResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to reset your password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-3xl border border-red-400/40 bg-red-950/35 p-6 text-center text-red-100 shadow-2xl">
        <p>This reset link is missing a token. Request a new link and try again.</p>
        <p className="mt-4">
          <Link href="/forgot-password" className="underline underline-offset-4">
            Go to forgot password
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-violet-400/30 bg-slate-950/65 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm text-slate-200"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputClassName} pr-20`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 chars, include letters and numbers"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-500/70 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
              onClick={() => setShowPassword((previous) => !previous)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-new-password"
            className="mb-2 block text-sm text-slate-200"
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirm-new-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputClassName} pr-20`}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-500/70 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-red-400/50 bg-red-900/35 px-3 py-2 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Set new password"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-300">
        <Link href="/auth" className="text-amber-200 underline-offset-4 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
