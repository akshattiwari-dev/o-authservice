import { NextResponse } from "next/server";
import { getClientByClientId } from "@/services/clientService";
import {
  redeemAuthorizationCode,
  issueTokenPair,
  rotateRefreshToken,
  issueClientCredentialsTokens,
  authenticateClient,
} from "@/services/tokenService";
import { tokenRequestSchema } from "@/utils/validation";
import { Errors, toErrorResponse, OAuthError } from "@/oauth/errors";
import { checkRateLimit } from "@/utils/rateLimit";
import { extractClientCredentials } from "@/lib/clientAuth";
import { buildCurl } from "@/utils/curl";
import { logAudit, getClientIp } from "@/services/auditService";
import { emitStep } from "@/realtime/emitter";

const RATE_LIMIT = Number(process.env.TOKEN_ENDPOINT_RATE_LIMIT || 30);
const RATE_WINDOW_MS = Number(process.env.TOKEN_ENDPOINT_RATE_WINDOW_MS || 60_000);

// Canonical Playground step numbers, shared across authorize + token +
// userinfo routes so the live log reads as one continuous timeline:
// 1 Authorization Request · 2 Consent · 3 Code Issued · 4 Token Exchange ·
// 5 Access Token Issued · 6 UserInfo
const STEP_TOKEN_EXCHANGE = 4;
const STEP_ACCESS_TOKEN = 5;

export async function POST(request) {
  const ip = getClientIp(request);
  const url = new URL(request.url);

  const contentType = request.headers.get("content-type") || "";
  let raw;
  if (contentType.includes("application/json")) {
    raw = await request.json().catch(() => ({}));
  } else {
    const text = await request.text();
    raw = Object.fromEntries(new URLSearchParams(text));
  }

  const playgroundFlowId = raw.playground_flow_id;

  try {
    // Resolve client_secret_basic (Authorization header) vs
    // client_secret_post (body) up front, and normalize onto `raw` so the
    // rest of this handler only has one shape to deal with.
    const credentials = extractClientCredentials(request, raw);
    raw.client_id = credentials.clientId;
    if (credentials.clientSecret) raw.client_secret = credentials.clientSecret;

    const rateLimitKey = `${ip}:${raw.client_id}`;
    const limit = await checkRateLimit(rateLimitKey, { limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });
    if (!limit.allowed) {
      emitStep(playgroundFlowId, {
        step: STEP_TOKEN_EXCHANGE,
        title: "Rate limited",
        detail: `Too many token requests from this client/IP. Retry after ${Math.ceil(limit.retryAfterMs / 1000)}s.`,
        status: "error",
      });
      return NextResponse.json(
        { error: "temporarily_unavailable", error_description: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    emitStep(playgroundFlowId, {
      step: STEP_TOKEN_EXCHANGE,
      title: "Token exchange request",
      detail: `grant_type=${raw.grant_type} · client authenticated via ${credentials.authMethod}`,
      request: redactSecrets(raw),
      curl: buildCurl({
        url: `${url.origin}/api/oauth/token`,
        headers:
          credentials.authMethod === "client_secret_basic"
            ? { Authorization: "Basic <base64(client_id:client_secret)>" }
            : {},
        form: redactSecrets(stripInternalFields(raw)),
      }),
      status: "info",
    });

    const parsed = tokenRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw Errors.invalidRequest(parsed.error.errors[0]?.message || "Malformed token request.");
    }
    const body = parsed.data;

    const client = await getClientByClientId(body.client_id);
    await authenticateClient({ clientSecret: body.client_secret, client });

    let tokens;
    if (body.grant_type === "authorization_code") {
      const authCode = await redeemAuthorizationCode({
        rawCode: body.code,
        client,
        redirectUri: body.redirect_uri,
        codeVerifier: body.code_verifier,
      });
      tokens = await issueTokenPair({ client, userId: authCode.userId, scopes: authCode.scopes });

      emitStep(playgroundFlowId, {
        step: STEP_TOKEN_EXCHANGE,
        title: "Authorization code validated",
        detail: "Exact redirect_uri match ✓  PKCE (S256) verified ✓  single-use code consumed ✓",
        status: "success",
      });
    } else if (body.grant_type === "refresh_token") {
      tokens = await rotateRefreshToken({
        rawRefreshToken: body.refresh_token,
        client,
        requestedScope: body.scope,
      });

      emitStep(playgroundFlowId, {
        step: STEP_TOKEN_EXCHANGE,
        title: "Refresh token rotated",
        detail: "Old refresh token revoked, new access + refresh token pair issued",
        status: "success",
      });
    } else if (body.grant_type === "client_credentials") {
      tokens = await issueClientCredentialsTokens({ client, requestedScope: body.scope });

      emitStep(playgroundFlowId, {
        step: STEP_TOKEN_EXCHANGE,
        title: "Client credentials verified",
        detail: "Machine-to-machine grant — no user involved, no refresh token issued",
        status: "success",
      });
    } else {
      throw Errors.unsupportedGrantType(
        "grant_type must be authorization_code, refresh_token, or client_credentials."
      );
    }

    await logAudit({
      userId: null,
      action: "oauth.token.issued",
      metadata: { clientId: body.client_id, grantType: body.grant_type },
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    emitStep(playgroundFlowId, {
      step: STEP_ACCESS_TOKEN,
      title: "Access token issued",
      detail: `Expires in ${tokens.expires_in}s${tokens.refresh_token ? " · refresh token issued with rotation enabled" : " · no refresh token (client_credentials)"}`,
      response: redactSecrets(tokens),
      status: "success",
    });

    return NextResponse.json(tokens, {
      status: 200,
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);

    emitStep(playgroundFlowId, {
      step: STEP_TOKEN_EXCHANGE,
      title: "Token request failed",
      detail: body.error_description || body.error,
      response: body,
      status: "error",
    });

    if (!(err instanceof OAuthError)) {
      console.error("[token endpoint] unexpected error:", err);
    }

    return NextResponse.json(body, { status });
  }
}

function redactSecrets(obj) {
  const clone = { ...obj };
  for (const key of ["client_secret", "code_verifier", "refresh_token", "access_token", "code"]) {
    if (clone[key]) clone[key] = `${String(clone[key]).slice(0, 6)}… (redacted)`;
  }
  return clone;
}

function stripInternalFields(obj) {
  const { playground_flow_id, ...rest } = obj;
  return rest;
}
