"use client";

import { useEffect, useState } from "react";
import ErrorState from "@/components/ErrorState";

const ROLES = ["USER", "DEVELOPER", "ADMIN"];

export default function UsersManager() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    load(null);
  }, []);

  async function load(useCursor) {
    setError(null);
    try {
      const qs = useCursor ? `?cursor=${encodeURIComponent(useCursor)}` : "";
      const res = await fetch(`/api/admin/users${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not load users.");
        return;
      }
      setUsers((prev) => (useCursor ? [...(prev || []), ...data.items] : data.items));
      setNextCursor(data.nextCursor || null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function changeRole(userId, role) {
    setRowError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // e.g. 409 last_admin — surface it and reload so the <select> resets
        // to the real, unchanged role instead of showing the rejected pick.
        setRowError(data.message || "Could not change that user's role.");
        load(null);
        return;
      }
      load(null);
    } catch {
      setRowError("Could not reach the server. Check your connection and try again.");
      load(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => load(null)} />;
  if (!users) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Users</h1>
      {rowError && (
        <p role="alert" aria-live="polite" className="mt-3 text-sm text-red-600">
          {rowError}
        </p>
      )}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Clients</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-ink">{u.name || "—"}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 text-muted">{u._count.oauthClients}</td>
                <td className="px-4 py-3 text-muted">{u._count.accessTokens}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    aria-label={`Role for ${u.email}`}
                    className="rounded-md border border-border px-2 py-1 text-xs focus:border-accent focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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
