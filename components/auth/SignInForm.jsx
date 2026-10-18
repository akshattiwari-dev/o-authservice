"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInForm({ hasGoogle, hasGithub }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="signin-password" className="block text-xs font-medium text-muted">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="signin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {(hasGoogle || hasGithub) && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {hasGoogle && (
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full rounded-md border border-border py-2.5 text-sm font-medium text-ink transition hover:border-ink"
              >
                Continue with Google
              </button>
            )}
            {hasGithub && (
              <button
                type="button"
                onClick={() => signIn("github", { callbackUrl })}
                className="w-full rounded-md border border-border py-2.5 text-sm font-medium text-ink transition hover:border-ink"
              >
                Continue with GitHub
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
