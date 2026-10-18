import { NextResponse } from "next/server";
import { getClientByClientId } from "@/services/clientService";
import { authenticateClient, introspectToken } from "@/services/tokenService";
import { introspectSchema } from "@/utils/validation";
import { toErrorResponse } from "@/oauth/errors";
import { extractClientCredentials } from "@/lib/clientAuth";
import { checkRateLimit } from "@/utils/rateLimit";
import { getClientIp } from "@/services/auditService";
import { emitStep } from "@/realtime/emitter";
import { buildCurl } from "@/utils/curl";

const RATE_LIMIT = Number(process.env.TOKEN_ENDPOINT_RATE_LIMIT || 30);
const RATE_WINDOW_MS = Number(process.env.TOKEN_ENDPOINT_RATE_WINDOW_MS || 60_000);

export async function POST(request) {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") || "";
  const raw = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(new URLSearchParams(await request.text()));

  const flowId = raw.playground_flow_id;

  try {
    const credentials = extractClientCredentials(request, raw);
    raw.client_id = credentials.clientId;
    if (credentials.clientSecret) raw.client_secret = credentials.clientSecret;

    const limit = await checkRateLimit(`${getClientIp(request)}:${raw.client_id}`, {
      limit: RATE_LIMIT,
      windowMs: RATE_WINDOW_MS,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "temporarily_unavailable", error_description: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const body = introspectSchema.parse(raw);
    const client = await getClientByClientId(body.client_id);
    await authenticateClient({ clientSecret: body.client_secret, client });

    const result = await introspectToken(body.token);

    emitStep(flowId, {
      step: 7,
      title: "Token introspection",
      detail: result.active ? "Token is active" : "Token is inactive (revoked, expired, or unknown)",
      response: result,
      curl: buildCurl({
        url: `${url.origin}/api/oauth/introspect`,
        form: { token: `${body.token.slice(0, 6)}… (redacted)`, client_id: body.client_id },
      }),
      status: result.active ? "success" : "error",
    });

    // RFC 7662 §2.2: an inactive token gets only { "active": false } — no
    // other claims, so we never leak metadata about a revoked/expired token.
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
