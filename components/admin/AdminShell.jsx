"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/tokens", label: "Tokens" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-black text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">o-auth Admin</span>
            <nav className="flex items-center gap-4 text-sm text-white/70">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "text-white" : "hover:text-white"}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
            ← Developer dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
