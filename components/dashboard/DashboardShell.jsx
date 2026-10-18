"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "OAuth Clients" },
  { href: "/dashboard/tokens", label: "Tokens" },
  { href: "/dashboard/keys", label: "API Keys" },
  { href: "/dashboard/learning", label: "Learning Progress" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/docs", label: "Documentation" },
];

export default function DashboardShell({ user, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const verifyStatus = searchParams.get("verify");

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-white px-4 py-6 sm:block">
          <Link href="/" className="mb-8 block text-sm font-semibold text-ink">
            o-auth
          </Link>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-accent-light font-medium text-accent"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="mt-4 block rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                Admin Panel
              </Link>
            )}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
            <p className="text-sm text-muted">
              Signed in as <span className="font-medium text-ink">{user?.email}</span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-muted transition hover:text-accent"
            >
              Sign out
            </button>
          </header>
          <main className="px-6 py-8">
            {verifyStatus === "success" && (
              <p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Email verified — thanks!
              </p>
            )}
            {verifyStatus === "invalid" && (
              <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                That verification link is invalid or has expired.
              </p>
            )}
            {/* S1 soft gate: unverified users see this on every dashboard
                page but nothing is blocked — see README "Known limitations"
                for the one place (client creation) that nudges harder. */}
            {user && !user.emailVerified && verifyStatus !== "success" && (
              <p role="status" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Your email isn't verified yet. Check your inbox (or the server console in dev) for the link we sent
                when you signed up.
              </p>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
