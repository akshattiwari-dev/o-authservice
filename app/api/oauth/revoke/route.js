import { NextResponse } from "next/server";
import { getClientByClientId } from "@/services/clientService";
import { authenticateClient, revokeToken } from "@/services/tokenService";
import { revokeSchema } from "@/utils/validation";
import { toErrorResponse } from "@/oauth/errors";
import { extractClientCredentials } from "@/lib/clientAuth";
import { checkRateLimit } from "@/utils/rateLimit";
import { logAudit, getClientIp } from "@/services/auditService";
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

    const body = revokeSchema.parse(raw);
    const client = await getClientByClientId(body.client_id);
    await authenticateClient({ clientSecret: body.client_secret, client });

    await revokeToken(body.token, body.token_type_hint);

    await logAudit({
      action: "oauth.token.revoked",
      metadata: { clientId: body.client_id, hint: body.token_type_hint },
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    emitStep(flowId, {
      step: 7,
      title: "Token revoked",
      detail: `token_type_hint=${body.token_type_hint || "none"} — revocation is idempotent per RFC 7009`,
      curl: buildCurl({
        url: `${url.origin}/api/oauth/revoke`,
        form: { token: `${body.token.slice(0, 6)}… (redacted)`, client_id: body.client_id },
      }),
      status: "success",
    });

    // RFC 7009 §2.2: the server responds 200 even if the token was already
    // invalid or unknown — revocation is idempotent from the caller's view.
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
