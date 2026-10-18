import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UsageChart from "@/components/dashboard/UsageChart";
import { getRecentTokenIssuance } from "@/services/tokenService";

export const metadata = { title: "Dashboard — o-auth 2.0 Simplified" };

export default async function DashboardOverviewPage() {
  const session = await getServerSession(authOptions);
  const userId = session.user.id;

  const [clientCount, activeTokenCount, completedChapters, apiKeyCount] = await Promise.all([
    prisma.oAuthClient.count({ where: { ownerId: userId } }),
    prisma.accessToken.count({ where: { userId, revoked: false, expiresAt: { gt: new Date() } } }),
    prisma.chapterProgress.count({ where: { userId, completed: true } }),
    prisma.apiKey.count({ where: { userId, revoked: false } }),
  ]);

  // S3: real data, with a fallback to the sample series (clearly labeled
  // as such in UsageChart) if the aggregation query fails for any reason —
  // never silently show fake numbers as if they were real.
  let usageSeries = null;
  try {
    usageSeries = await getRecentTokenIssuance(userId);
  } catch (err) {
    console.error("[dashboard] usage chart query failed:", err.message);
  }

  const cards = [
    { label: "OAuth Clients", value: clientCount, href: "/dashboard/clients" },
    { label: "Active Access Tokens", value: activeTokenCount, href: "/dashboard/tokens" },
    { label: "API Keys", value: apiKeyCount, href: "/dashboard/keys" },
    { label: "Chapters Completed", value: `${completedChapters} / 27`, href: "/dashboard/learning" },
  ];

  return (
    <DashboardShell user={session.user}>
      <h1 className="text-xl font-bold text-ink">Welcome back{session.user.name ? `, ${session.user.name}` : ""}</h1>
      <p className="mt-1 text-sm text-muted">Here's what's happening with your o-auth account.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-border bg-white p-5 transition hover:border-accent"
          >
            <p className="text-2xl font-bold text-ink">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">Quick start</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>
              1. <Link href="/dashboard/clients" className="text-accent hover:underline">Register an OAuth client</Link> with a redirect URI and scopes.
            </li>
            <li>
              2. Try the full flow live in the{" "}
              <Link href="/playground" className="text-accent hover:underline">Playground</Link>.
            </li>
            <li>
              3. Inspect and revoke issued tokens from the{" "}
              <Link href="/dashboard/tokens" className="text-accent hover:underline">Tokens</Link> page.
            </li>
          </ol>
        </div>
        <UsageChart series={usageSeries} />
      </div>
    </DashboardShell>
  );
}
