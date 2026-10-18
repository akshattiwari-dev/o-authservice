/**
 * RFC 6749 §5.2 / §4.1.2.1 error codes. Thrown from anywhere in the OAuth
 * flow and caught by the route handler, which turns it into the correctly
 * shaped JSON (token/introspect/revoke endpoints) or redirect query string
 * (authorize endpoint) response.
 *
 * Every error carries an optional error_uri pointing at the in-app docs
 * section explaining that error code — RFC 6749 §5.2 explicitly allows
 * this as a human-readable pointer for developers debugging integrations.
 */
export class OAuthError extends Error {
  constructor(error, description, status = 400, uriFragment = null) {
    super(description || error);
    this.error = error;
    this.description = description;
    this.status = status;
    this.uriFragment = uriFragment || error;
  }
}

const DOCS_BASE = "/docs/errors";

export const Errors = {
  invalidRequest: (description) =>
    new OAuthError("invalid_request", description, 400),
  invalidClient: (description) =>
    new OAuthError("invalid_client", description, 401),
  invalidGrant: (description) =>
    new OAuthError("invalid_grant", description, 400),
  unauthorizedClient: (description) =>
    new OAuthError("unauthorized_client", description, 400),
  unsupportedGrantType: (description) =>
    new OAuthError("unsupported_grant_type", description, 400),
  unsupportedResponseType: (description) =>
    new OAuthError("unsupported_response_type", description, 400),
  invalidScope: (description) =>
    new OAuthError("invalid_scope", description, 400),
  accessDenied: (description) =>
    new OAuthError("access_denied", description, 403),
  serverError: (description) =>
    new OAuthError("server_error", description, 500),
  temporarilyUnavailable: (description) =>
    new OAuthError("temporarily_unavailable", description, 503),
};

/** JSON body shape for token/introspect/revoke endpoint errors. */
export function toErrorResponse(err) {
  if (err instanceof OAuthError) {
    return {
      status: err.status,
      body: {
        error: err.error,
        error_description: err.description,
        error_uri: `${DOCS_BASE}#${err.uriFragment}`,
      },
    };
  }
  // Unknown/unexpected error — never leak internals to the client.
  return {
    status: 500,
    body: {
      error: "server_error",
      error_description: "Unexpected server error.",
      error_uri: `${DOCS_BASE}#server_error`,
    },
  };
}

/** Query-string shape for redirecting authorize-endpoint errors back to the client. */
export function toRedirectErrorUrl(redirectUri, state, err) {
  const url = new URL(redirectUri);
  const oauthErr = err instanceof OAuthError ? err : Errors.serverError();
  url.searchParams.set("error", oauthErr.error);
  if (oauthErr.description) {
    url.searchParams.set("error_description", oauthErr.description);
  }
  url.searchParams.set("error_uri", `${DOCS_BASE}#${oauthErr.uriFragment}`);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}
