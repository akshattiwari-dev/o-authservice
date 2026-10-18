"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { v4 as uuid } from "uuid";
import Link from "next/link";
import { generatePkcePairBrowser, randomState } from "@/utils/pkceBrowser";
import LiveLogFeed from "./LiveLogFeed";
import TokenInspector from "./TokenInspector";
import FlowTimeline from "./FlowTimeline";

export default function PlaygroundApp() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scopeInput, setScopeInput] = useState("");
  const [flowId, setFlowId] = useState(() => uuid());
  const [events, setEvents] = useState([]);
  const [tokens, setTokens] = useState(null);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [flowError, setFlowError] = useState("");
  const socketRef = useRef(null);

  const selectedClient = clients?.find((c) => c.id === selectedClientId) || null;
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/playground/callback` : "";

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients || []);
        if (d.clients?.[0]) {
          setSelectedClientId(d.clients[0].id);
          setScopeInput(d.clients[0].scopes.join(" "));
        }
      });
  }, [status]);

  // One persistent socket connection for the life of this component,
  // rejoining its room on every reconnect (network blips, server
  // restarts) so the "100% reliable" live log survives those cases too.
  useEffect(() => {
    if (status !== "authenticated") return;

    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    function join() {
      socket.emit("join-flow", flowId);
      setConnected(true);
    }

    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on("flow-event", (event) => setEvents((prev) => [...prev, event]));
    socket.on("flow-error", (err) => {
      // Only realistically fires if the session cookie expired between
      // page load and the socket handshake — see realtime/socketServer.js.
      setConnected(false);
      setFlowError(err.message || "Could not join this flow.");
    });
    // Replay sent right after joining a room — covers both a late first
    // join and a reconnect mid-flow. Replace rather than append: the
    // server's buffer is the source of truth for "everything so far".
    socket.on("flow-history", (history) => {
      if (history.length > 0) setEvents(history);
    });

    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "oauth-complete" && e.data.flowId === flowId) {
        setTokens(e.data.tokens);
        setRunning(false);
      }
    }
    window.addEventListener("message", onMessage);

    return () => {
      socket.off("connect", join);
      socket.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, [status, flowId]);

  async function startFlow() {
    if (!selectedClient) return;
    setEvents([]);
    setTokens(null);
    setRunning(true);

    const state = randomState();
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePkcePairBrowser();

    // Handoff data for the popup's callback page — localStorage (not
    // sessionStorage) so it's readable from the popup window too.
    localStorage.setItem(
      `playground:${state}`,
      JSON.stringify({
        flowId,
        codeVerifier,
        clientId: selectedClient.clientId,
        clientSecret: selectedClient.isPublic ? null : clientSecret,
        redirectUri,
      })
    );

    const url = new URL("/oauth/authorize", window.location.origin);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", selectedClient.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopeInput);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", codeChallengeMethod);
    url.searchParams.set("playground_flow_id", flowId);

    window.open(url.toString(), "o-auth-playground", "width=480,height=640");
  }

  function resetFlow() {
    setEvents([]);
    setTokens(null);
    setRunning(false);
    setFlowId(uuid());
  }

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted">
          Sign in and register an OAuth client to run a live flow here.
        </p>
        <Link
          href="/signin?callbackUrl=/playground"
          className="mt-4 inline-flex rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (clients && clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted">You don't have any OAuth clients yet.</p>
        <Link
          href="/dashboard/clients"
          className="mt-4 inline-flex rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Create your first client
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FlowTimeline events={events} />
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {flowError && (
        <div role="alert" aria-live="polite" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {flowError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Flow configuration</p>
              {events.length > 0 && (
                <button onClick={resetFlow} className="text-xs text-muted hover:text-accent">
                  Reset
                </button>
              )}
            </div>

            <label className="mt-3 block text-xs font-medium text-muted">Client</label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                const c = clients.find((x) => x.id === e.target.value);
                if (c) setScopeInput(c.scopes.join(" "));
              }}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.isPublic ? "public" : "confidential"})
                </option>
              ))}
            </select>

            {selectedClient && !selectedClient.isPublic && (
              <>
                <label className="mt-3 block text-xs font-medium text-muted">Client secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Paste the secret shown at creation"
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </>
            )}

            <label className="mt-3 block text-xs font-medium text-muted">Scope</label>
            <input
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none"
            />

            <div className="mt-3 rounded-md bg-surface p-3 text-xs text-muted">
              <p className="font-medium text-ink">Redirect URI required on this client:</p>
              <code className="mt-1 block break-all font-mono">{redirectUri}</code>
            </div>

            <p className="mt-3 text-xs text-muted">
              PKCE (S256) is generated automatically for every flow, and state is
              validated on return — both shown live in the log.
            </p>

            <button
              onClick={startFlow}
              disabled={running || !selectedClient || (!selectedClient.isPublic && !clientSecret)}
              className="mt-4 w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
            >
              {running ? "Waiting for popup…" : "Start authorization flow"}
            </button>
          </div>

          {tokens && (
            <TokenInspector
              tokens={tokens}
              client={{ clientId: selectedClient.clientId, clientSecret }}
              flowId={flowId}
            />
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">Live request/response log</p>
          <LiveLogFeed events={events} />
        </div>
      </div>
    </div>
  );
}
