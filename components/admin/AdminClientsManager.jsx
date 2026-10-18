"use client";

import { useEffect, useState } from "react";
import ErrorState from "@/components/ErrorState";

export default function AdminClientsManager() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    load(null);
  }, []);

  async function load(useCursor) {
    setError(null);
    try {
      const qs = useCursor ? `?cursor=${encodeURIComponent(useCursor)}` : "";
      const res = await fetch(`/api/admin/clients${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not load clients.");
        return;
      }
      setClients((prev) => (useCursor ? [...(prev || []), ...data.items] : data.items));
      setNextCursor(data.nextCursor || null);
      setCursor(useCursor || null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function toggleDisabled(id, disabled) {
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Could not update that client.");
        return;
      }
      load(null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => load(null)} />;
  if (!clients) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">OAuth Clients</h1>
      <p className="mt-1 text-sm text-muted">Every client registered on the platform.</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Active tokens</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-ink">
                  {c.name}
                  <p className="font-mono text-xs text-muted">{c.clientId}</p>
                </td>
                <td className="px-4 py-3 text-muted">{c.owner?.email}</td>
                <td className="px-4 py-3 text-muted">{c.isPublic ? "Public" : "Confidential"}</td>
                <td className="px-4 py-3 text-muted">{c._count.accessTokens}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${
                      c.disabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.disabled ? "Disabled" : "Enabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleDisabled(c.id, !c.disabled)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {c.disabled ? "Enable" : "Disable"}
                  </button>
                </td>
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
