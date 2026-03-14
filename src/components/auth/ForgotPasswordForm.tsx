"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";

type ForgotPasswordResponse = {
  message?: string;
  error?: string;
  resetUrl?: string;
};

const inputClassName =
  "w-full rounded-xl border border-slate-600/70 bg-slate-950/70 px-4 py-3 text-slate-100 " +
  "placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40";

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setResetUrl("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = (await response.json().catch(() => ({}))) as ForgotPasswordResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to process that request.");
        return;
      }

      setSuccessMessage(
        data.message ??
          "If that account exists, password reset instructions are ready."
      );
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-violet-400/30 bg-slate-950/65 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="forgot-email"
            className="mb-2 block text-sm text-slate-200"
          >
            Username or email
          </label>
          <input
            id="forgot-email"
            type="text"
            autoComplete="username"
            className={inputClassName}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="username or you@example.com"
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-red-400/50 bg-red-900/35 px-3 py-2 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-400/50 bg-emerald-900/35 px-3 py-2 text-sm text-emerald-100">
            {successMessage}
          </p>
        ) : null}

        {resetUrl ? (
          <p className="rounded-xl border border-amber-300/50 bg-amber-900/25 px-3 py-2 text-sm text-amber-100">
            Dev reset link:{" "}
            <a
              href={resetUrl}
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Open reset page
            </a>
          </p>
        ) : null}

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset instructions"}
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
