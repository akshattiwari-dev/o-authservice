import { Errors } from "@/oauth/errors";

/**
 * RFC 6749 §2.3.1 defines two standard ways a confidential client can
 * authenticate at the token/introspect/revoke endpoints:
 *   - client_secret_basic — HTTP Basic auth header: base64(client_id:client_secret)
 *   - client_secret_post  — client_id/client_secret as body parameters
 *
 * A request must use exactly one — sending both (and disagreeing) is
 * rejected outright rather than silently preferring one.
 */
export function extractClientCredentials(request, body) {
  const authHeader = request.headers.get("authorization") || "";
  let basicClientId = null;
  let basicClientSecret = null;

  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
      const separatorIndex = decoded.indexOf(":");
      if (separatorIndex === -1) throw new Error("malformed");
      basicClientId = decodeURIComponent(decoded.slice(0, separatorIndex));
      basicClientSecret = decodeURIComponent(decoded.slice(separatorIndex + 1));
    } catch {
      throw Errors.invalidClient("Malformed Authorization: Basic header.");
    }
  }

  const bodyClientId = body.client_id;
  const bodyClientSecret = body.client_secret;

  if (basicClientId && bodyClientId && basicClientId !== bodyClientId) {
    throw Errors.invalidClient(
      "client_id in the Authorization header does not match client_id in the request body."
    );
  }
  if (basicClientSecret && bodyClientSecret) {
    throw Errors.invalidRequest(
      "Provide client credentials via either client_secret_basic or client_secret_post, not both."
    );
  }

  const clientId = basicClientId || bodyClientId;
  const clientSecret = basicClientSecret || bodyClientSecret;
  const authMethod = basicClientId ? "client_secret_basic" : clientSecret ? "client_secret_post" : "none";

  if (!clientId) {
    throw Errors.invalidRequest("client_id is required.");
  }

  return { clientId, clientSecret, authMethod };
}
