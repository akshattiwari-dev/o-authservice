import Header from "@/components/Header";
import FooterCTA from "@/components/FooterCTA";
import Link from "next/link";

export const metadata = {
  title: "Documentation — o-auth 2.0 Simplified",
  description:
    "How to use the o-auth platform: registering clients, running flows, and integrating against the real OAuth 2.0 + OpenID Connect server.",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div style={{ paddingTop: "var(--header-height)" }}>
        <article className="mx-auto max-w-article px-6 pb-16 pt-16">
          <h1 className="text-[2rem] font-extrabold tracking-tight text-ink">
            How to use this platform
          </h1>
          <p className="mt-4 text-[15px] leading-[1.75] text-muted">
            o-auth is a real, working OAuth 2.0 + OpenID Connect authorization
            server — not a simulation. Everything below describes actual
            endpoints you can call, backed by the same database and token logic
            the{" "}
            <Link href="/playground" className="text-accent hover:underline">
              Playground
            </Link>{" "}
            uses.
          </p>

          <div className="prose-article mt-10">
            <h2>1. Register a client</h2>
            <p>
              From your <Link href="/dashboard/clients">dashboard</Link>, create
              a client and choose its type:
            </p>
            <ul>
              <li>
                <strong>Confidential</strong> — a server-side app that can keep
                a secret. You&apos;ll receive a <code>client_secret</code> once,
                shown only at creation time.
              </li>
              <li>
                <strong>Public</strong> — a single-page app, mobile app, or CLI
                that can&apos;t keep a secret. No <code>client_secret</code> is
                issued; PKCE is required on every request instead.
              </li>
            </ul>

            <h2>2. Send the user to /oauth/authorize</h2>
            <p>
              Redirect the browser to start the flow. Public clients must
              generate a PKCE pair first — S256 is the only accepted method.
              Request <code>openid</code> to receive an ID Token (OpenID
              Connect).
            </p>
            <pre>
              <code>{`GET /oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=RANDOM_UNGUESSABLE_STRING&
  code_challenge=BASE64URL(SHA256(code_verifier))&
  code_challenge_method=S256`}</code>
            </pre>
            <p>
              <code>state</code> must be a fresh random value your app
              generates and checks against on return — this is what stops a
              CSRF attack from tricking a victim&apos;s browser into completing
              a flow they never started. The server validates that the returned{" "}
              <code>state</code> matches, and it&apos;s your app&apos;s job to
              check it too on the client side.
            </p>

            <h2>3. Handle the redirect back</h2>
            <p>
              After the user approves, they land back at your{" "}
              <code>redirect_uri</code> with a short-lived, single-use{" "}
              <code>code</code>:
            </p>
            <pre>
              <code>{`https://yourapp.com/callback?code=AUTH_CODE&state=RANDOM_UNGUESSABLE_STRING`}</code>
            </pre>

            <h2>4. Exchange the code for tokens</h2>
            <p>
              Call the token endpoint server-side (or, for public clients, from
              wherever you generated the PKCE verifier):
            </p>
            <pre>
              <code>{`POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
code_verifier=THE_ORIGINAL_VERIFIER`}</code>
            </pre>
            <p>
              You&apos;ll get back (when <code>openid</code> was requested, an{" "}
              <code>id_token</code> is included):
            </p>
            <pre>
              <code>{`{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "8fN3...redacted",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}`}</code>
            </pre>

            <h2>5. Call UserInfo / use the ID Token</h2>
            <p>
              Decode and verify the <code>id_token</code> with the JWKS at{" "}
              <code>/api/oauth/keys</code>, or call UserInfo with the access
              token:
            </p>
            <pre>
              <code>{`GET /api/oauth/userinfo
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...`}</code>
            </pre>
            <p>Example UserInfo response:</p>
            <pre>
              <code>{`{
  "sub": "user_id",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "email_verified": false
}`}</code>
            </pre>

            <h2>Discovery</h2>
            <p>
              OpenID Connect discovery document (issuer metadata):
            </p>
            <pre>
              <code>{`GET /.well-known/openid-configuration`}</code>
            </pre>

            <h2>Client authentication methods</h2>
            <p>
              Confidential clients can authenticate at the token, introspect,
              and revoke endpoints either way:
            </p>
            <ul>
              <li>
                <strong>client_secret_basic</strong> — HTTP Basic auth header:{" "}
                <code>
                  Authorization: Basic base64(client_id:client_secret)
                </code>
              </li>
              <li>
                <strong>client_secret_post</strong> — <code>client_id</code> and{" "}
                <code>client_secret</code> as body parameters
              </li>
            </ul>
            <p>
              Public clients never send a secret — PKCE is their authentication.
            </p>

            <h2>Grant types supported</h2>
            <ul>
              <li>
                <code>authorization_code</code> (with mandatory PKCE for public
                clients)
              </li>
              <li>
                <code>refresh_token</code> — rotates on every use; reuse of a
                stale token revokes the whole token family
              </li>
              <li>
                <code>client_credentials</code> — machine-to-machine,
                confidential clients only, no user involved
              </li>
            </ul>

            <h2>Token lifetimes</h2>
            <p>
              Access tokens are short-lived RS256 JWTs (15 minutes by default).
              ID tokens are also RS256 JWTs. Refresh tokens are long-lived
              opaque strings, rotated on every use. Verify access and ID tokens
              using the public key published at <code>/api/oauth/keys</code> (a
              standard JWKS document).
            </p>

            <h2>Errors</h2>
            <p>
              Every endpoint returns RFC 6749-shaped errors:{" "}
              <code>{`{ error, error_description, error_uri }`}</code>. See the{" "}
              <Link href="/docs/errors">full error reference</Link> for what
              each code means and how to fix it.
            </p>
          </div>
        </article>
        <FooterCTA />
      </div>
    </main>
  );
}