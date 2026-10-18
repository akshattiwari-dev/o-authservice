"use client";

import { useEffect, useState } from "react";
import ExpiryCountdown from "@/components/ExpiryCountdown";
import ErrorState from "@/components/ErrorState";

export default function AdminTokensManager() {
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    load(null);
  }, []);

  async function load(useCursor) {
    setError(null);
    try {
      const qs = useCursor ? `?cursor=${encodeURIComponent(useCursor)}` : "";
      const res = await fetch(`/api/admin/tokens${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not load tokens.");
        return;
      }
      setTokens((prev) => (useCursor ? [...(prev || []), ...data.items] : data.items));
      setNextCursor(data.nextCursor || null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function revoke(id) {
    try {
      const res = await fetch(`/api/admin/tokens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Could not revoke that token.");
        return;
      }
      load(null);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => load(null)} />;
  if (!tokens) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Tokens</h1>
      <p className="mt-1 text-sm text-muted">The 100 most recently issued access tokens, across all users.</p>

      {tokens.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No tokens issued yet.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
              <div>
                <p className="text-sm font-medium text-ink">
                  {t.client.name} <span className="font-normal text-muted">→ {t.user.email}</span>
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">{t.scopes.join(" ")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.revoked ? "Revoked" : <ExpiryCountdown expiresAt={t.expiresAt} />}
                </p>
              </div>
              {!t.revoked && (
                <button onClick={() => revoke(t.id)} className="text-xs font-medium text-red-600 hover:underline">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
