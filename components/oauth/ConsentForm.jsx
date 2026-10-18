"use client";

import { useState } from "react";

export default function ConsentForm({ client, scopes, user, formValues }) {
  const [submitting, setSubmitting] = useState(null); // "approve" | "deny" | null
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  async function submit(decision) {
    setSubmitting(decision);
    setError("");
    const res = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formValues, decision, rememberDecision: decision === "approve" && remember }),
    });

    const data = await res.json().catch(() => null);
    if (data?.redirect) {
      window.location.href = data.redirect;
    } else {
      setSubmitting(null);
      setError(data?.error_description || data?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-soft">
      <div className="flex items-center gap-3">
        {client.logoUrl ? (
          // Client logos come from arbitrary developer-supplied URLs, so a
          // plain <img> is used deliberately here rather than next/image
          // (which requires each remote domain to be allowlisted ahead of
          // time — not workable for user-registered client logos).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.logoUrl}
            alt={`${client.name} logo`}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light text-lg font-bold text-accent">
            {client.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
          <h1 className="text-lg font-bold text-ink">{client.name}</h1>
        </div>
      </div>

      {client.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted">{client.description}</p>
      )}

      <p className="mt-5 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">{client.name}</span> is requesting
        permission to access your o-auth account with the following:
      </p>

      <ul className="mt-4 space-y-2">
        {scopes.map((s) => (
          <li
            key={s.name}
            className="rounded-md bg-surface px-3 py-2.5 text-sm text-ink"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <code className="font-mono text-[13px]">{s.name}</code>
            </div>
            {s.description && (
              <p className="mt-1 pl-3.5 text-xs text-muted">{s.description}</p>
            )}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Remember this decision for {client.name}
      </label>

      {error ? (
        <p role="alert" aria-live="polite" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => submit("deny")}
          disabled={submitting !== null}
          className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {submitting === "deny" ? "Denying…" : "Deny"}
        </button>
        <button
          type="button"
          onClick={() => submit("approve")}
          disabled={submitting !== null}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark disabled:opacity-50"
        >
          {submitting === "approve" ? "Approving…" : "Approve"}
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        You can revoke this access at any time from your dashboard.
      </p>
    </div>
  );
}
