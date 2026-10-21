"use client";

import { useState } from "react";

function decodeJwtPart(jwt, index) {
  try {
    const part = jwt.split(".")[index];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function TokenInspector({ tokens, client, onLog, flowId }) {
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(tokens);
  const [userInfo, setUserInfo] = useState(null);

  const header = current?.access_token ? decodeJwtPart(current.access_token, 0) : null;
  const claims = current?.access_token ? decodeJwtPart(current.access_token, 1) : null;
  const idTokenClaims = current?.id_token ? decodeJwtPart(current.id_token, 1) : null;

  async function callToken(grantExtra) {
    setBusy(true);
    const res = await fetch("/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: current.refresh_token,
        client_id: client.clientId,
        client_secret: client.clientSecret || undefined,
        playground_flow_id: flowId,
        ...grantExtra,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setCurrent(data);
      setUserInfo(null);
    }
  }

  async function introspect() {
    setBusy(true);
    await fetch("/api/oauth/introspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: current.access_token,
        client_id: client.clientId,
        client_secret: client.clientSecret || undefined,
        playground_flow_id: flowId,
      }),
    });
    setBusy(false);
  }

  async function revoke() {
    setBusy(true);
    await fetch("/api/oauth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: current.access_token,
        token_type_hint: "access_token",
        client_id: client.clientId,
        client_secret: client.clientSecret || undefined,
        playground_flow_id: flowId,
      }),
    });
    setBusy(false);
  }

  async function callUserInfo() {
    setBusy(true);
    const res = await fetch(
      `/api/oauth/userinfo?playground_flow_id=${encodeURIComponent(flowId || "")}`,
      {
        headers: { Authorization: `Bearer ${current.access_token}` },
      }
    );
    const data = await res.json();
    setBusy(false);
    setUserInfo(data);
  }

  if (!current) return null;

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <p className="text-sm font-semibold text-ink">Issued tokens</p>

      <div className="mt-3 space-y-3">
        <TokenField label="access_token" value={current.access_token} />
        {current.refresh_token && (
          <TokenField label="refresh_token" value={current.refresh_token} />
        )}
        {current.id_token && <TokenField label="id_token" value={current.id_token} />}
      </div>

      {header && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Decoded JWT header
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-ink/[0.04] p-2 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(header, null, 2)}
          </pre>
        </div>
      )}

      {claims && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Decoded access token payload
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-ink/[0.04] p-2 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(claims, null, 2)}
          </pre>
        </div>
      )}

      {idTokenClaims && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Decoded ID Token payload
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-ink/[0.04] p-2 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(idTokenClaims, null, 2)}
          </pre>
        </div>
      )}

      {userInfo && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            UserInfo response
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-ink/[0.04] p-2 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={callUserInfo}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          Call UserInfo
        </button>
        {current.refresh_token && (
          <button
            disabled={busy}
            onClick={() => callToken({})}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink disabled:opacity-50"
          >
            Refresh token
          </button>
        )}
        <button
          disabled={busy}
          onClick={introspect}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink disabled:opacity-50"
        >
          Introspect
        </button>
        <button
          disabled={busy}
          onClick={revoke}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-400 disabled:opacity-50"
        >
          Revoke access token
        </button>
      </div>
    </div>
  );
}

function TokenField({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-[10px] font-medium text-accent hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="mt-1 block break-all rounded bg-ink/[0.04] px-2 py-1.5 font-mono text-[11px] text-ink">
        {value}
      </code>
    </div>
  );
}