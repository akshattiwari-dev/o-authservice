"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SecretReveal from "@/components/SecretReveal";

export default function ClientDetail({ clientRecordId }) {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [redirectUris, setRedirectUris] = useState("");
  const [scopesInput, setScopesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newSecret, setNewSecret] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(`/api/clients/${clientRecordId}`);
    if (!res.ok) return;
    const data = await res.json();
    setClient(data.client);
    setRedirectUris(data.client.redirectUris.join("\n"));
    setScopesInput(data.client.scopes.join(" "));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/clients/${clientRecordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirectUris: redirectUris.split("\n").map((s) => s.trim()).filter(Boolean),
        scopes: scopesInput.split(" ").map((s) => s.trim()).filter(Boolean),
      }),
    });

    setSaving(false);
    setMessage(res.ok ? "Saved." : "Could not save changes.");
    if (res.ok) load();
  }

  async function handleRegenerateSecret() {
    if (!confirm("This immediately invalidates the current secret. Continue?")) return;
    const res = await fetch(`/api/clients/${clientRecordId}/secret`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setNewSecret(data.clientSecret);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${client.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/clients/${clientRecordId}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/clients");
  }

  if (!client) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">{client.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">client_id: {client.clientId}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-[11px] font-semibold ${
            client.isPublic ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {client.isPublic ? "Public (PKCE required)" : "Confidential"}
        </span>
      </div>

      {newSecret && (
        <div className="mt-6">
          <SecretReveal label="New client secret" value={newSecret} />
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-border bg-white p-6">
        <div>
          <label className="block text-xs font-medium text-muted">Redirect URIs (one per line)</label>
          <textarea
            rows={3}
            value={redirectUris}
            onChange={(e) => setRedirectUris(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">Scopes (space-separated)</label>
          <input
            value={scopesInput}
            onChange={(e) => setScopesInput(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>

        {message ? <p className="text-sm text-muted">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        {!client.isPublic && (
          <button
            onClick={handleRegenerateSecret}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
          >
            Regenerate secret
          </button>
        )}
        <button
          onClick={handleDelete}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-400"
        >
          Delete client
        </button>
      </div>
    </div>
  );
}
