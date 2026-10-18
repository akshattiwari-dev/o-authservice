import Header from "@/components/Header";
import FooterCTA from "@/components/FooterCTA";
import Link from "next/link";

export const metadata = {
  title: "Error Reference — o-auth 2.0 Simplified",
  description: "What each o-auth error code means and how to fix it.",
};

const ERRORS = [
  {
    code: "invalid_request",
    status: "400",
    meaning:
      "The request is missing a required parameter, includes an unsupported parameter value, or is otherwise malformed.",
    fix: "Check every required field for the endpoint you're calling — e.g. response_type, client_id, redirect_uri, scope, and state are all required at /oauth/authorize.",
  },
  {
    code: "invalid_client",
    status: "401",
    meaning:
      "Client authentication failed — an unknown client_id, a wrong client_secret, or credentials sent in an unsupported way.",
    fix: "Double-check your client_id and client_secret. Confidential clients must authenticate via client_secret_basic or client_secret_post, never both. Repeated failures temporarily lock the client out — wait for the cooldown shown in error_description.",
  },
  {
    code: "invalid_grant",
    status: "400",
    meaning:
      "The authorization code or refresh token is invalid, expired, already used, or doesn't match the client/redirect_uri/PKCE verifier it was issued with.",
    fix: "Authorization codes are single-use and expire quickly (2 minutes by default) — request a fresh one. For PKCE, make sure you're sending the exact code_verifier that produced the code_challenge from step one. Refresh tokens rotate on every use; reusing an old one revokes the whole chain.",
  },
  {
    code: "unauthorized_client",
    status: "400",
    meaning:
      "This client isn't allowed to use the grant type it requested — for example, a public client attempting client_credentials, or the client has been disabled by an administrator.",
    fix: "Confirm the client's type (public vs. confidential) supports the grant you're using, and that it hasn't been disabled.",
  },
  {
    code: "unsupported_grant_type",
    status: "400",
    meaning: "The grant_type value isn't one this server implements.",
    fix: "Use authorization_code, refresh_token, or client_credentials.",
  },
  {
    code: "unsupported_response_type",
    status: "400",
    meaning: "The response_type value isn't supported.",
    fix: 'Only "code" (the authorization code flow) is supported.',
  },
  {
    code: "invalid_scope",
    status: "400",
    meaning:
      "The requested scope is invalid, unknown, or exceeds what this client is registered to request.",
    fix: "Check your client's allowed scopes in the dashboard, and make sure you're not requesting a broader scope on a refresh_token grant than the original token had.",
  },
  {
    code: "access_denied",
    status: "403",
    meaning: "The resource owner denied the authorization request.",
    fix: "This isn't a bug — the user clicked \"Deny\" on the consent screen. Handle it gracefully in your UI.",
  },
  {
    code: "server_error",
    status: "500",
    meaning: "An unexpected error occurred on the server.",
    fix: "Retry the request. If it persists, this is a bug on our end, not something wrong with your request.",
  },
  {
    code: "temporarily_unavailable",
    status: "503",
    meaning: "The server is temporarily rate-limiting this client/IP or is otherwise overloaded.",
    fix: "Respect the Retry-After header and back off before retrying.",
  },
  {
    code: "invalid_token",
    status: "401",
    meaning: "The access token used to call /api/oauth/userinfo is missing, malformed, expired, or revoked.",
    fix: "Get a fresh access token via the token endpoint (using your refresh token if you have one).",
  },
  {
    code: "insufficient_scope",
    status: "403",
    meaning: "The access token is valid, but doesn't carry the scope required for this call.",
    fix: "Request the required scope (e.g. profile:read) the next time you send the user through /oauth/authorize.",
  },
];

export default function ErrorsDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div style={{ paddingTop: "var(--header-height)" }}>
        <article className="mx-auto max-w-article px-6 pb-16 pt-16">
          <Link href="/docs" className="text-sm text-muted hover:text-accent">
            ← Documentation
          </Link>

          <h1 className="mt-6 text-[2rem] font-extrabold tracking-tight text-ink">
            Error reference
          </h1>
          <p className="mt-4 text-[15px] leading-[1.75] text-muted">
            Every o-auth endpoint returns errors in the same shape:{" "}
            <code>{`{ error, error_description, error_uri }`}</code>. The{" "}
            <code>error_uri</code> on any response links straight to the
            matching section below.
          </p>

          <div className="prose-article mt-10">
            {ERRORS.map((e) => (
              <div key={e.code} id={e.code} className="scroll-mt-24">
                <h2>
                  <code>{e.code}</code>{" "}
                  <span className="text-sm font-normal text-muted">— HTTP {e.status}</span>
                </h2>
                <p>{e.meaning}</p>
                <p>
                  <strong>How to fix it:</strong> {e.fix}
                </p>
              </div>
            ))}
          </div>
        </article>
        <FooterCTA />
      </div>
    </main>
  );
}
