import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Admin — o-auth 2.0 Simplified" };

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [userCount, clientCount, activeAccessTokens, activeRefreshTokens, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.oAuthClient.count(),
    prisma.accessToken.count({ where: { revoked: false, expiresAt: { gt: new Date() } } }),
    prisma.refreshToken.count({ where: { revoked: false, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const cards = [
    { label: "Total users", value: userCount },
    { label: "OAuth clients", value: clientCount },
    { label: "Active access tokens", value: activeAccessTokens },
    { label: "Active refresh tokens", value: activeRefreshTokens },
  ];

  return (
    <AdminShell>
      <h1 className="text-xl font-bold text-ink">Platform overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-white p-5">
            <p className="text-2xl font-bold text-ink">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-white">
        <p className="border-b border-border px-5 py-3 text-sm font-semibold text-ink">Recent activity</p>
        <div className="divide-y divide-border">
          {recentLogs.length === 0 && <p className="px-5 py-4 text-sm text-muted">No activity yet.</p>}
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-mono text-xs text-ink">{log.action}</span>
              <span className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
