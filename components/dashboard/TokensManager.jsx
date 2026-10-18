"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExpiryCountdown from "@/components/ExpiryCountdown";
import ErrorState from "@/components/ErrorState";

export default function TokensManager() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/tokens");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message || "Could not load your tokens.");
        return;
      }
      setData(body);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function revoke(id, kind) {
    try {
      const res = await fetch(`/api/tokens/${id}?kind=${kind}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Could not revoke that token.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  const isEmpty = data.accessTokens.length === 0 && data.refreshTokens.length === 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Tokens</h1>
      <p className="mt-1 text-sm text-muted">Access and refresh tokens issued to clients on your behalf.</p>

      {isEmpty ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            No tokens yet — tokens appear here after you complete an OAuth flow, for
            example in the{" "}
            <Link href="/playground" className="text-accent hover:underline">
              Playground
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <Section title="Access tokens" empty="No access tokens issued yet.">
            {data.accessTokens.map((t) => (
              <TokenRow
                key={t.id}
                client={t.client.name}
                scopes={t.scopes}
                expiresAt={t.expiresAt}
                revoked={t.revoked}
                onRevoke={() => revoke(t.id, "access")}
              />
            ))}
          </Section>

          <Section title="Refresh tokens" empty="No refresh tokens issued yet.">
            {data.refreshTokens.map((t) => (
              <TokenRow
                key={t.id}
                client={t.client.name}
                scopes={t.scopes}
                expiresAt={t.expiresAt}
                revoked={t.revoked}
                onRevoke={() => revoke(t.id, "refresh")}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-2">
        {hasItems ? children : <p className="text-sm text-muted">{empty}</p>}
      </div>
    </div>
  );
}

function TokenRow({ client, scopes, expiresAt, revoked, onRevoke }) {
  const expired = new Date(expiresAt) < new Date();
  const status = revoked ? "Revoked" : expired ? "Expired" : "Active";
  const statusClass = revoked || expired ? "bg-gray-100 text-gray-600" : "bg-emerald-100 text-emerald-800";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-ink">{client}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">{scopes.join(" ")}</p>
        <p className="mt-0.5 text-xs text-muted">
          {revoked ? "Revoked" : <ExpiryCountdown expiresAt={expiresAt} />}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded px-2 py-1 text-[11px] font-semibold ${statusClass}`}>{status}</span>
        {!revoked && !expired && (
          <button onClick={onRevoke} className="text-xs font-medium text-red-600 hover:underline">
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
