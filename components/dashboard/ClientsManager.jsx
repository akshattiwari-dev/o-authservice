"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SecretReveal from "@/components/SecretReveal";
import ErrorState from "@/components/ErrorState";

export default function ClientsManager() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [availableScopes, setAvailableScopes] = useState([]);

  useEffect(() => {
    load();
    loadScopes();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error_description || "Could not load your clients.");
        return;
      }
      setClients(data.clients || []);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  async function loadScopes() {
    try {
      const res = await fetch("/api/scopes");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setAvailableScopes((data.scopes || []).map((s) => s.name));
    } catch {
      // Non-fatal — the create-client form just shows no scope options.
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">OAuth Clients</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          {showForm ? "Cancel" : "New client"}
        </button>
      </div>

      {showForm && (
        <CreateClientForm
          availableScopes={availableScopes}
          onCreated={(secret) => {
            setNewSecret(secret);
            setShowForm(false);
            load();
          }}
        />
      )}

      {newSecret && (
        <div className="mt-6">
          <SecretReveal label="Client secret" value={newSecret} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && clients === null && <p className="text-sm text-muted">Loading…</p>}
        {!error && clients?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted">
              No OAuth clients yet. Create one to get a client_id (and secret,
              for confidential clients) you can use in the{" "}
              <Link href="/playground" className="text-accent hover:underline">
                Playground
              </Link>{" "}
              or your own app.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              Create your first client
            </button>
          </div>
        )}
        {!error && clients?.map((client) => (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            className="block rounded-lg border border-border bg-white p-4 transition hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{client.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{client.clientId}</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  client.isPublic ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {client.isPublic ? "Public (PKCE)" : "Confidential"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CreateClientForm({ onCreated, availableScopes }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [redirectUris, setRedirectUris] = useState("http://localhost:3000/callback");
  const [scopes, setScopes] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleScope(scope) {
    setScopes((s) => (s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        logoUrl: logoUrl || null,
        redirectUris: redirectUris.split("\n").map((s) => s.trim()).filter(Boolean),
        scopes,
        isPublic,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error_description || "Could not create client. Check your redirect URIs are valid URLs.");
      return;
    }

    onCreated(data.clientSecret);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-border bg-white p-6">
      <div>
        <label className="block text-xs font-medium text-muted">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Logo URL (optional)</label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Shown on the consent screen. Must be https in production — see the Docs for details.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Redirect URIs (one per line)</label>
        <textarea
          required
          rows={3}
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">Scopes</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableScopes.length === 0 && <p className="text-xs text-muted">Loading scopes…</p>}
          {availableScopes.map((scope) => (
            <button
              type="button"
              key={scope}
              onClick={() => toggleScope(scope)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                scopes.includes(scope)
                  ? "border-accent bg-accent-light text-accent"
                  : "border-border text-muted hover:border-ink"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Public client (SPA / native / CLI — requires PKCE, no client secret)
      </label>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || scopes.length === 0}
        className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create client"}
      </button>
    </form>
  );
}
