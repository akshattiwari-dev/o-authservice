"use client";

import { useEffect, useState } from "react";
import ErrorState from "@/components/ErrorState";

export default function AuditLogsManager() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    load(null);
  }, []);

  async function load(useCursor) {
    setError(null);
    try {
      const qs = useCursor ? `?take=100&cursor=${encodeURIComponent(useCursor)}` : "?take=100";
      const res = await fetch(`/api/admin/audit-logs${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not load audit logs.");
        return;
      }
      setLogs((prev) => (useCursor ? [...(prev || []), ...data.items] : data.items));
      setNextCursor(data.nextCursor || null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => load(null)} />;
  if (!logs) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Audit Logs</h1>
      <p className="mt-1 text-sm text-muted">Security-relevant events, most recent first.</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 font-mono text-xs text-ink">{log.action}</td>
                <td className="px-4 py-3 text-muted">{log.user?.email || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{log.ip || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <button
          onClick={() => load(nextCursor)}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
        >
          Load more
        </button>
      )}
    </div>
  );
}
