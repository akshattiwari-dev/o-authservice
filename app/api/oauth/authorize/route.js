import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientByClientId } from "@/services/clientService";
import { issueAuthorizationCode } from "@/services/tokenService";
import { isAllowedChallengeMethod } from "@/oauth/pkce";
import { toRedirectErrorUrl, Errors } from "@/oauth/errors";
import { checkRateLimit } from "@/utils/rateLimit";
import { sha256 } from "@/utils/crypto";
import { logAudit, getClientIp } from "@/services/auditService";
import { emitStep } from "@/realtime/emitter";

const RATE_LIMIT = Number(process.env.AUTHORIZE_ENDPOINT_RATE_LIMIT || 60);
const RATE_WINDOW_MS = Number(process.env.AUTHORIZE_ENDPOINT_RATE_WINDOW_MS || 60_000);
const REMEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "access_denied", error_description: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const {
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    playground_flow_id,
    decision,
    rememberDecision,
  } = body;

  const ip = getClientIp(request);
  const limit = await checkRateLimit(`authorize:${ip}:${client_id}`, { limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "temporarily_unavailable", error_description: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  // Everything is re-validated from scratch here — the consent page's
  // hidden form fields are just UX convenience, never a trust boundary.
  const client = await getClientByClientId(client_id);
  if (!client || client.disabled || !redirect_uri || !client.redirectUris.includes(redirect_uri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unknown/disabled client or unregistered redirect_uri." },
      { status: 400 }
    );
  }

  if (code_challenge_method && !isAllowedChallengeMethod(code_challenge_method)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: 'Only "S256" is accepted for code_challenge_method.' },
      { status: 400 }
    );
  }

  emitStep(playground_flow_id, {
    step: 2,
    title: decision === "approve" ? "Consent approved" : "Consent denied",
    detail: `User ${decision === "approve" ? "approved" : "denied"} access for ${client.name}`,
    request: { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method },
    status: decision === "approve" ? "success" : "error",
  });

  if (decision !== "approve") {
    const url = toRedirectErrorUrl(redirect_uri, state, Errors.accessDenied("The resource owner denied the request."));
    await logAudit({
      userId: session.user.id,
      action: "oauth.authorize.denied",
      metadata: { clientId: client.clientId },
      ip,
    });
    return NextResponse.json({ redirect: url });
  }

  const requestedScopes = (scope || "").split(" ").filter(Boolean);
  const invalidScopes = requestedScopes.filter((s) => !client.scopes.includes(s));
  if (invalidScopes.length > 0) {
    const url = toRedirectErrorUrl(redirect_uri, state, Errors.invalidScope(`Not permitted: ${invalidScopes.join(", ")}`));
    return NextResponse.json({ redirect: url });
  }

  if (client.isPublic && (!code_challenge || code_challenge_method !== "S256")) {
    const url = toRedirectErrorUrl(redirect_uri, state, Errors.invalidRequest("PKCE (S256) is required for public clients."));
    return NextResponse.json({ redirect: url });
  }

  const rawCode = await issueAuthorizationCode({
    client,
    userId: session.user.id,
    redirectUri: redirect_uri,
    scopes: requestedScopes,
    codeChallenge: code_challenge || null,
    codeChallengeMethod: code_challenge_method || null,
    playgroundFlowId: playground_flow_id || null,
  });

  await logAudit({
    userId: session.user.id,
    action: "oauth.authorize.approved",
    metadata: { clientId: client.clientId, scopes: requestedScopes },
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  const url = new URL(redirect_uri);
  url.searchParams.set("code", rawCode);
  url.searchParams.set("state", state);

  emitStep(playground_flow_id, {
    step: 3,
    title: "Authorization code issued",
    detail: "Redirecting back to the client's redirect_uri with a single-use code",
    response: { code: `${rawCode.slice(0, 8)}… (redacted)`, state, redirect_uri },
    status: "success",
  });

  const response = NextResponse.json({ redirect: url.toString() });

  if (rememberDecision) {
    // Scoped to exactly this user + client + scope set — approving a
    // narrower request later, or the client requesting broader scope
    // later, both correctly fail this comparison and re-prompt consent.
    const cookieValue = sha256(`${session.user.id}:${client.clientId}:${requestedScopes.sort().join(" ")}`);
    response.cookies.set(`consent_${client.clientId}`, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REMEMBER_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
}
