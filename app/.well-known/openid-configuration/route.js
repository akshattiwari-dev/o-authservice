import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const config = {
    issuer: "o-auth",
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    userinfo_endpoint: `${baseUrl}/api/oauth/userinfo`,
    jwks_uri: `${baseUrl}/api/oauth/keys`,
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    introspection_endpoint: `${baseUrl}/api/oauth/introspect`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    claims_supported: ["sub", "email", "name", "iss", "aud", "exp", "iat"],
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
  };

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}