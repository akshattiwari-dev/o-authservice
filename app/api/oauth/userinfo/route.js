import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { emitStep } from "@/realtime/emitter";
import { buildCurl } from "@/utils/curl";

async function handleUserInfo(request) {
  const url = new URL(request.url);
  const flowId = url.searchParams.get("playground_flow_id");

  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  const curl = buildCurl({
    method: request.method,
    url: `${url.origin}/api/oauth/userinfo`,
    headers: { Authorization: "Bearer <access_token>" },
  });

  if (scheme !== "Bearer" || !token) {
    emitStep(flowId, {
      step: 6,
      title: "UserInfo request failed",
      detail: "Missing Bearer access token.",
      curl,
      status: "error",
    });
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Missing Bearer access token.",
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="o-auth"' },
      }
    );
  }

  emitStep(flowId, {
    step: 6,
    title: "UserInfo request",
    detail: "Fetching profile with the issued access token",
    curl,
    status: "info",
  });

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch (err) {
    console.error("[userinfo] JWT verify failed:", err?.message || err);
    emitStep(flowId, {
      step: 6,
      title: "UserInfo request failed",
      detail: `Invalid or expired token: ${err?.message || "verify failed"}`,
      status: "error",
    });
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "Access token is invalid or expired.",
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      }
    );
  }

  console.log(
    "[userinfo] jti=",
    payload.jti,
    "sub=",
    payload.sub,
    "scope=",
    payload.scope
  );

  if (!payload.jti || !payload.sub) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "Token missing jti or sub claim.",
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      }
    );
  }

  const row = await prisma.accessToken.findUnique({
    where: { jti: payload.jti },
  });
  console.log(
    "[userinfo] db row=",
    row
      ? { revoked: row.revoked, expiresAt: row.expiresAt.toISOString() }
      : null
  );

  if (!row || row.revoked || row.expiresAt < new Date()) {
    emitStep(flowId, {
      step: 6,
      title: "UserInfo request failed",
      detail: !row
        ? "Access token jti not found in database."
        : row.revoked
          ? "Access token has been revoked."
          : "Access token has expired.",
      status: "error",
    });
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "Access token revoked, expired, or unknown.",
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      }
    );
  }

  const scopes = String(payload.scope || "")
    .split(/\s+/)
    .filter(Boolean);

  const hasOpenId = scopes.includes("openid");
  const hasProfile =
    scopes.includes("profile") || scopes.includes("profile:read");
  const hasEmail =
    scopes.includes("email") || scopes.includes("email:read");

  // OIDC: openid alone is enough for UserInfo (at least `sub`)
  if (!hasOpenId && !hasProfile && !hasEmail) {
    emitStep(flowId, {
      step: 6,
      title: "UserInfo request failed",
      detail: "Token lacks openid, profile, or email scope.",
      status: "error",
    });
    return NextResponse.json(
      {
        error: "insufficient_scope",
        error_description: "openid, profile, or email scope is required.",
      },
      {
        status: 403,
        headers: {
          "WWW-Authenticate": 'Bearer error="insufficient_scope"',
        },
      }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    emitStep(flowId, {
      step: 6,
      title: "UserInfo request failed",
      detail: "User no longer exists.",
      status: "error",
    });
    return NextResponse.json(
      { error: "invalid_token", error_description: "User not found." },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      }
    );
  }

  const result = { sub: user.id };

  if (hasOpenId || hasProfile) {
    if (user.name) result.name = user.name;
    if (user.image) result.picture = user.image;
  }

  if (hasEmail && user.email) {
    result.email = user.email;
    result.email_verified = !!user.emailVerified;
  }

  emitStep(flowId, {
    step: 6,
    title: "UserInfo returned",
    detail: "Profile fetched successfully — end of flow",
    response: result,
    status: "success",
  });

  return NextResponse.json(result);
}

export async function GET(request) {
  return handleUserInfo(request);
}

export async function POST(request) {
  return handleUserInfo(request);
}