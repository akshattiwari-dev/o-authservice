import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getClientByClientId, getScopeDescriptions } from "@/services/clientService";
import { issueAuthorizationCode } from "@/services/tokenService";
import { isAllowedChallengeMethod } from "@/oauth/pkce";
import { checkRateLimit } from "@/utils/rateLimit";
import { sha256 } from "@/utils/crypto";
import { logAudit } from "@/services/auditService";
import { emitStep } from "@/realtime/emitter";
import ConsentForm from "@/components/oauth/ConsentForm";

export const metadata = { title: "Authorize — o-auth 2.0 Simplified" };

const AUTHORIZE_RATE_LIMIT = Number(process.env.AUTHORIZE_ENDPOINT_RATE_LIMIT || 60);
const AUTHORIZE_RATE_WINDOW_MS = Number(process.env.AUTHORIZE_ENDPOINT_RATE_WINDOW_MS || 60_000);

// Renders the human-facing consent screen. All the values shown here are
// re-validated server-side again on submit (in the API route) — this page
// existing and looking correct is not itself a security boundary.
export default async function AuthorizePage({ searchParams }) {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    playground_flow_id,
  } = searchParams || {};

  // Rate-limit by client_id alone here (no IP available to a server
  // component the same way a route handler has one) — still meaningfully
  // throttles a client being hammered from anywhere.
  if (client_id) {
    const limit = checkRateLimit(`authorize:${client_id}`, {
      limit: AUTHORIZE_RATE_LIMIT,
      windowMs: AUTHORIZE_RATE_WINDOW_MS,
    });
    if (!limit.allowed) {
      return <ErrorScreen message="Too many authorization requests for this client. Please wait a moment and try again." />;
    }
  }

  if (response_type !== "code" || !client_id || !redirect_uri || !scope || !state) {
    return (
      <ErrorScreen message="This authorization request is missing required parameters (response_type, client_id, redirect_uri, scope, and state are all required)." />
    );
  }

  const client = await getClientByClientId(client_id);
  if (!client) {
    return <ErrorScreen message="Unknown client_id. This application is not registered with o-auth." />;
  }

  if (client.disabled) {
    return <ErrorScreen message="This application has been disabled by an administrator and cannot request access right now." />;
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    // Never redirect back to an unregistered URI, even to deliver an error —
    // that's the whole point of exact redirect_uri matching. Byte-for-byte
    // check via Array.includes on exact strings — no normalization.
    return (
      <ErrorScreen message="The redirect_uri for this request does not exactly match any URI registered for this client." />
    );
  }

  const requestedScopes = scope.split(" ").filter(Boolean);
  const invalidScopes = requestedScopes.filter((s) => !client.scopes.includes(s));
  if (invalidScopes.length > 0) {
    return <ErrorScreen message={`This client is not permitted to request scope(s): ${invalidScopes.join(", ")}`} />;
  }

  if (code_challenge_method && !isAllowedChallengeMethod(code_challenge_method)) {
    return <ErrorScreen message='Only "S256" is accepted for code_challenge_method — "plain" is disabled on this server.' />;
  }

  if (client.isPublic && (!code_challenge || code_challenge_method !== "S256")) {
    return (
      <ErrorScreen message="This is a public client — PKCE (code_challenge with S256) is required and was not provided." />
    );
  }

  emitStep(playground_flow_id, {
    step: 1,
    title: "Authorization request received",
    detail: `client_id=${client_id} · scope="${scope}" · PKCE ${code_challenge ? "present" : "absent"}`,
    request: { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method },
    status: "info",
  });

  const session = await getServerSession(authOptions);
  if (!session) {
    const callbackUrl = `/oauth/authorize?${new URLSearchParams(searchParams).toString()}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // "Remember this decision" — a per-user, per-client, per-scope-set
  // cookie set on a prior approval. If it matches exactly, skip the
  // consent screen and issue the code immediately. Scoped tightly (hash of
  // user+client+exact scope string) so it can never silently cover a
  // request for broader access than what was actually approved.
  const rememberCookie = cookies().get(`consent_${client.clientId}`);
  const expectedRememberValue = sha256(`${session.user.id}:${client.clientId}:${requestedScopes.sort().join(" ")}`);

  if (rememberCookie?.value === expectedRememberValue) {
    const rawCode = await issueAuthorizationCode({
      client,
      userId: session.user.id,
      redirectUri: redirect_uri,
      scopes: requestedScopes,
      codeChallenge: code_challenge || null,
      codeChallengeMethod: code_challenge_method || null,
      playgroundFlowId: playground_flow_id || null,
    });

    await logAudit({ userId: session.user.id, action: "oauth.authorize.autoApproved", metadata: { clientId: client.clientId } });

    emitStep(playground_flow_id, {
      step: 2,
      title: "Consent auto-approved",
      detail: "Remembered decision from a previous approval — skipping the consent screen.",
      status: "success",
    });

    const url = new URL(redirect_uri);
    url.searchParams.set("code", rawCode);
    url.searchParams.set("state", state);

    emitStep(playground_flow_id, {
      step: 3,
      title: "Authorization code issued",
      detail: "Redirecting back to the client's redirect_uri with a single-use code",
      status: "success",
    });

    redirect(url.toString());
  }

  const scopesWithDescriptions = await getScopeDescriptions(requestedScopes);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <ConsentForm
        client={{ name: client.name, description: client.description, logoUrl: client.logoUrl }}
        scopes={scopesWithDescriptions}
        user={{ name: session.user.name, email: session.user.email }}
        formValues={{
          client_id,
          redirect_uri,
          scope,
          state,
          code_challenge: code_challenge || "",
          code_challenge_method: code_challenge_method || "",
          playground_flow_id: playground_flow_id || "",
        }}
      />
    </main>
  );
}

function ErrorScreen({ message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-soft">
        <h1 className="text-lg font-bold text-ink">Authorization request rejected</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
      </div>
    </main>
  );
}
