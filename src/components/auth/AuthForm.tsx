"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

type AuthMode = "login" | "register";

type ApiErrorResponse = {
  error?: string;
};

const inputClassName =
  "w-full rounded-xl border border-slate-600/70 bg-slate-950/70 px-4 py-3 text-slate-100 " +
  "placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
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

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { identifier, password }
        : {
            username: registerUsername,
            email: registerEmail,
            password,
            confirmPassword,
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to sign in right now.");
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

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage("");
    setIdentifier("");
    setRegisterUsername("");
    setRegisterEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  return (
    <div className="rounded-3xl border border-violet-400/30 bg-slate-950/65 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-amber-300/85 text-slate-900"
              : "text-slate-200 hover:bg-slate-800"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-amber-300/85 text-slate-900"
              : "text-slate-200 hover:bg-slate-800"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "login" ? (
          <div>
            <label htmlFor="auth-identifier" className="mb-2 block text-sm text-slate-200">
              Username or email
            </label>
            <input
              id="auth-identifier"
              type="text"
              autoComplete="username"
              className={inputClassName}
              placeholder="username or you@example.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="auth-username" className="mb-2 block text-sm text-slate-200">
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                className={inputClassName}
                placeholder="your_username"
                value={registerUsername}
                onChange={(event) => setRegisterUsername(event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="auth-email" className="mb-2 block text-sm text-slate-200">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                className={inputClassName}
                placeholder="you@example.com"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                required
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="auth-password" className="mb-2 block text-sm text-slate-200">
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={`${inputClassName} pr-20`}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

        {mode === "register" ? (
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="mb-2 block text-sm text-slate-200"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="auth-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className={`${inputClassName} pr-20`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
        ) : null}

        {errorMessage ? (
          <p className="rounded-xl border border-red-400/50 bg-red-900/35 px-3 py-2 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          type="submit"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Working..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-300">
        <Link href="/forgot-password" className="text-amber-200 underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
