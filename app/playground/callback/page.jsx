"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PlaygroundCallback() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("exchanging");
  const [message, setMessage] = useState("Completing the flow…");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(`${error}: ${errorDescription || "The authorization request was denied."}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing code or state in the callback.");
      return;
    }

    const raw = localStorage.getItem(`playground:${state}`);
    if (!raw) {
      setStatus("error");
      setMessage("Could not find a matching flow for this state value — it may have expired.");
      return;
    }

    const { flowId, codeVerifier, clientId, clientSecret, redirectUri } = JSON.parse(raw);
    localStorage.removeItem(`playground:${state}`);

    fetch("/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret || undefined,
        code_verifier: codeVerifier,
        playground_flow_id: flowId,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error_description || data.error || "Token exchange failed.");
          return;
        }
        setStatus("success");
        setMessage("Tokens issued. You can close this window.");

        if (window.opener) {
          window.opener.postMessage({ type: "oauth-complete", flowId, tokens: data }, window.location.origin);
          setTimeout(() => window.close(), 1200);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error during token exchange.");
      });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="max-w-sm rounded-lg border border-border bg-white p-8 text-center shadow-soft">
        <div
          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg ${
            status === "success"
              ? "bg-emerald-100 text-emerald-700"
              : status === "error"
              ? "bg-red-100 text-red-700"
              : "bg-accent-light text-accent"
          }`}
        >
          {status === "success" ? "✓" : status === "error" ? "!" : "…"}
        </div>
        <p className="mt-4 text-sm text-ink">{message}</p>
      </div>
    </main>
  );
}
