"use client";

import { useEffect, useState } from "react";
import SecretReveal from "@/components/SecretReveal";
import ErrorState from "@/components/ErrorState";

export default function KeysManager() {
  const [keys, setKeys] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not load your API keys.");
        return;
      }
      setKeys(data.keys || []);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      setCreating(false);
      if (!res.ok) {
        setCreateError(data.message || "Could not create key.");
        return;
      }
      setNewKey(data.key);
      setName("");
      load();
    } catch {
      setCreating(false);
      setCreateError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function handleRevoke(id) {
    if (!confirm("Revoke this API key? Any script using it will stop working immediately.")) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Could not revoke that key.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">API Keys</h1>
      <p className="mt-1 text-sm text-muted">
        Bearer keys for scripts calling the platform directly — separate from OAuth tokens.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          required
          placeholder='Key name (e.g. "CI pipeline")'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
      </form>

      {createError ? (
        <p role="alert" aria-live="polite" className="mt-2 text-sm text-red-600">
          {createError}
        </p>
      ) : null}

      {newKey && (
        <div className="mt-6">
          <SecretReveal label="API key" value={newKey} />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && keys === null && <p className="text-sm text-muted">Loading…</p>}
        {!error && keys?.length === 0 && <p className="text-sm text-muted">No API keys yet.</p>}
        {!error && keys?.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div>
              <p className="text-sm font-medium text-ink">{k.name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted">{k.keyPrefix}…</p>
              <p className="mt-0.5 text-xs text-muted">
                {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}` : "Never used"}
              </p>
            </div>
            {k.revoked ? (
              <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">Revoked</span>
            ) : (
              <button onClick={() => handleRevoke(k.id)} className="text-xs font-medium text-red-600 hover:underline">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
