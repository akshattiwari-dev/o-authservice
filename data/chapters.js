// Central chapter registry — single source of truth for numbering, routing
// (under /oauth2-servers/<slug>/), the homepage TOC, and prev/next nav.
//
// content is a list of typed blocks so the [slug] page can render rich
// long-form copy without needing a dedicated page file per chapter:
//   { type: "p", text }
//   { type: "h2", text }
//   { type: "ul", items: [text, ...] }
//   { type: "code", text }
//   { type: "quote", text }

export const chapters = [
  {
    number: 0,
    slug: "background",
    title: "Background",
    description:
      "Start here for a plain-language introduction to what problem OAuth solves and why it exists.",
    content: [
      {
        type: "p",
        text: "Before OAuth existed, if you wanted to let one application access your data on another service, you generally had one option: hand over your username and password. A calendar app that wanted to read your contacts would ask for your email password directly, store it somewhere, and log in as you whenever it needed to sync. This is usually called the password anti-pattern, and it has serious problems.",
      },
      {
        type: "p",
        text: "The most obvious problem is trust. Handing your password to a third-party app means that app can do anything your account can do — not just the one thing you wanted it to do. There's no way to say \"you can read my calendar, but you can't delete my emails.\" The second problem is revocation: if you want to cut off access later, your only option is to change your password, which breaks every other application you've authorized too.",
      },
      { type: "h2", text: "The problem OAuth solves" },
      {
        type: "p",
        text: "OAuth 2.0 defines a way for a user to grant a third-party application limited access to their data on another service, without ever sharing their credentials with that application. Instead of a password, the third-party app receives a token — a short opaque string that represents a specific, limited grant of access.",
      },
      {
        type: "p",
        text: "A token can be scoped to only certain kinds of data (\"read-only access to your calendar\"), and it can be revoked independently of your password. If you stop trusting an app, you revoke its token and every other connected app keeps working exactly as before.",
      },
      { type: "h2", text: "The four roles in OAuth" },
      {
        type: "p",
        text: "Almost every OAuth flow involves the same four participants. Getting comfortable with this vocabulary early makes the rest of the spec much easier to follow.",
      },
      {
        type: "ul",
        items: [
          "Resource Owner — the user. The person who owns the data and can grant permission to access it.",
          "Client — the application requesting access to the user's data. This is the app you're probably building.",
          "Authorization Server — the server that knows the resource owner, handles login, and issues tokens after the user approves the request.",
          "Resource Server — the API that holds the protected data and accepts the token as proof of authorization.",
        ],
      },
      {
        type: "p",
        text: "In many implementations the authorization server and resource server are operated by the same company, and sometimes even live on the same physical server. Conceptually, though, it's useful to keep them separate, since some systems — especially larger enterprises — do run them as genuinely distinct services.",
      },
      { type: "h2", text: "Why \"2.0\"?" },
      {
        type: "p",
        text: "OAuth 1.0 came first, and it worked, but it required cryptographic request signing that was notoriously fiddly to implement correctly. OAuth 2.0 traded that complexity for a reliance on TLS (HTTPS) to protect requests in transit, which made client implementations dramatically simpler at the cost of requiring every endpoint to be served over a secure connection.",
      },
      {
        type: "p",
        text: "OAuth 2.0 isn't a single flow — it's a framework describing several different flows, each suited to a different kind of application. The rest of this guide walks through those flows one at a time, starting with the most common case: a traditional server-side web application.",
      },
    ],
  },
  {
    number: 1,
    slug: "getting-ready",
    title: "Getting Ready",
    description:
      "Set up a test environment so you can follow along with real requests as you read.",
    content: [
      {
        type: "p",
        text: "The concepts in this guide are much easier to internalize if you can run real requests as you go, rather than only reading about them. Before diving into the flows, it helps to have three things ready: a test authorization server, a registered test client, and a simple HTTP client for making raw requests.",
      },
      { type: "h2", text: "Pick a test authorization server" },
      {
        type: "p",
        text: "Most identity providers offer a free developer tier that's more than enough for following along — you don't need production infrastructure to understand the flow. Create an account, then look for a section usually labeled \"Applications\" or \"API access management\" to register your first client.",
      },
      { type: "h2", text: "Register a test client" },
      {
        type: "p",
        text: "When you register a client, the server will ask you to choose a client type (confidential or public), provide one or more redirect URIs, and will hand back a client ID and, for confidential clients, a client secret. Keep these values handy — you'll use them in nearly every example in this guide.",
      },
      { type: "h2", text: "Tools for making requests" },
      {
        type: "ul",
        items: [
          "A command-line HTTP client, so you can see the raw request and response without a browser's dev tools getting in the way.",
          "A REST client with a graphical interface, useful for saving and replaying a sequence of requests.",
          "Your browser's network inspector, which is the easiest way to watch the redirect-based parts of the flow happen in real time.",
        ],
      },
      {
        type: "p",
        text: "With those three things in place, you're ready to work through the rest of this guide alongside a real server instead of just reading about one.",
      },
    ],
  },
  {
    number: 2,
    slug: "accessing-data",
    title: "Accessing Data in an OAuth Server",
    description:
      "A first look at making an authenticated request once you already have a token.",
    content: [
      {
        type: "p",
        text: "It's useful to see the destination before walking through how you get there. This chapter skips ahead to show what a completed OAuth exchange looks like from the outside: a single HTTP request, with a token attached, that returns protected data.",
      },
      { type: "h2", text: "The request" },
      {
        type: "code",
        text: "GET /api/calendar/events\nHost: api.example.com\nAuthorization: Bearer 2YotnFZFEjr1zCsicMWpAA",
      },
      {
        type: "p",
        text: "That's the entire shape of an authenticated API call under OAuth: a normal HTTP request with one additional header. The Authorization header, using the Bearer scheme, is how nearly every OAuth-protected API expects to receive a token.",
      },
      { type: "h2", text: "Where the token comes from" },
      {
        type: "p",
        text: "Getting that token string is the part that takes several steps and a redirect through the user's browser — that's what the rest of this guide covers in detail, broken down by the type of application you're building. Once you have a token, though, using it is this simple, every time.",
      },
    ],
  },
  {
    number: 3,
    slug: "signing-in-with-google",
    title: "Signing in with Google",
    description:
      "A concrete walkthrough of the most common real-world OAuth flow people encounter.",
    content: [
      {
        type: "p",
        text: "\"Sign in with Google\" buttons are one of the most common places people unknowingly use OAuth every day. Walking through this specific, familiar example is a good way to see the abstract roles from the Background chapter mapped onto a real product.",
      },
      { type: "h2", text: "Mapping the roles" },
      {
        type: "ul",
        items: [
          "Resource Owner — you, the person signing in.",
          "Client — the third-party website or app showing the \"Sign in with Google\" button.",
          "Authorization Server — Google's account and consent system.",
          "Resource Server — Google's API that returns your basic profile information.",
        ],
      },
      {
        type: "p",
        text: "When you click the button, you're redirected to accounts.google.com, where you may need to log in if you aren't already, and you're shown a consent screen listing exactly what information the site is asking for — usually just your name, email address, and profile photo.",
      },
      { type: "h2", text: "Why this is safer than a password" },
      {
        type: "p",
        text: "The third-party site never sees your Google password. It receives a token scoped only to basic profile data, which it can use to confirm who you are and pre-fill a signup form — nothing more. If you later want to disconnect the app, you can revoke that single token from your Google account's security settings without touching your password at all.",
      },
    ],
  },
  {
    number: 4,
    slug: "server-side-apps",
    title: "Server-side Apps",
    description:
      "How traditional web applications with a backend should implement the authorization code flow.",
    content: [
      {
        type: "p",
        text: "Server-side apps — traditional web applications with a backend that can keep a secret — are the reference case OAuth 2.0 was originally designed around, and they use the full authorization code flow.",
      },
      { type: "h2", text: "Why the backend matters" },
      {
        type: "p",
        text: "Because a server-side app has a component the user can't inspect or tamper with, it can safely hold a client secret. That secret is what lets the token exchange step prove the request is really coming from your registered application, not an impostor that happened to intercept an authorization code.",
      },
      { type: "h2", text: "The flow, at a glance" },
      {
        type: "ul",
        items: [
          "The browser is redirected to the authorization server with your client ID and requested scopes.",
          "The user logs in and approves the request.",
          "The browser is redirected back to your server with a short-lived authorization code.",
          "Your server exchanges that code, plus its client secret, directly with the authorization server for an access token.",
          "Your server stores the token server-side and uses it for subsequent API calls.",
        ],
      },
      {
        type: "p",
        text: "Because the token exchange happens server-to-server, the access token itself never touches the user's browser, which is the main security advantage this application type has over single-page and native apps.",
      },
    ],
  },
  {
    number: 5,
    slug: "single-page-apps",
    title: "Single-page Apps",
    description:
      "Browser-based apps have unique constraints. Here's the current best-practice approach.",
    content: [
      {
        type: "p",
        text: "A single-page app runs entirely in the browser, which means it can't keep a client secret confidential — anything shipped to the browser can be read by anyone who opens dev tools. Current best practice is to treat SPAs as public clients and use the authorization code flow with PKCE.",
      },
      { type: "h2", text: "Why the implicit flow fell out of favor" },
      {
        type: "p",
        text: "Earlier guidance recommended a simplified \"implicit\" flow that returned an access token directly in the redirect, skipping the code exchange step. It's now considered legacy: tokens returned in a URL fragment are more exposed to leakage through browser history and referrer headers, and there's no way to verify the client making the request. The authorization code flow with PKCE avoids both problems.",
      },
      { type: "h2", text: "How PKCE fits in" },
      {
        type: "p",
        text: "The app generates a random secret (the \"code verifier\") before starting the flow, sends a hashed version of it with the initial authorization request, and then sends the original value when exchanging the code for a token. Even if the authorization code is intercepted, it's useless without the original verifier, which never left the app.",
      },
      {
        type: "p",
        text: "See the PKCE chapter for the full mechanics of how the challenge and verifier are generated and checked.",
      },
    ],
  },
  {
    number: 6,
    slug: "mobile-and-native-apps",
    title: "Mobile and Native Apps",
    description:
      "Native apps can't keep secrets either — see how PKCE and system browsers fit in.",
    content: [
      {
        type: "p",
        text: "Native mobile and desktop apps face the same core constraint as single-page apps: anything embedded in the app binary can be extracted, so a client secret can't be trusted to stay secret. They use the same authorization code flow with PKCE.",
      },
      { type: "h2", text: "Use the system browser, not an embedded webview" },
      {
        type: "p",
        text: "It's tempting to open the login screen in an in-app webview, but this is discouraged: the host app could inspect or modify the page, including capturing the user's password as they type it. Best practice is to launch the system browser (or an in-app browser tab backed by the system browser), where the user's existing session and password manager are available and the host app has no visibility into the page.",
      },
      { type: "h2", text: "Getting back to the app" },
      {
        type: "p",
        text: "After the user approves the request in the system browser, the authorization server needs a way to hand control back to the native app. This is typically done with a custom URL scheme or, on modern platforms, an app-associated HTTPS redirect that the operating system routes directly to the app instead of a browser tab.",
      },
    ],
  },
  {
    number: 7,
    slug: "making-authenticated-requests",
    title: "Making Authenticated Requests",
    description:
      "The mechanics of attaching an access token to an API request correctly.",
    content: [
      {
        type: "p",
        text: "Once you have an access token, using it is the simplest part of OAuth: attach it to each API request using the Authorization header with the Bearer scheme.",
      },
      {
        type: "code",
        text: "GET /api/profile\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      { type: "h2", text: "Common mistakes" },
      {
        type: "ul",
        items: [
          "Sending the token as a query string parameter instead of a header — this risks it being logged in server access logs and browser history.",
          "Forgetting to handle a 401 response by refreshing an expired token and retrying the request once.",
          "Reusing the same token across environments (development and production) instead of issuing separate credentials for each.",
        ],
      },
      {
        type: "p",
        text: "Treat access tokens the same way you'd treat any other credential: never log them, never put them in URLs, and only transmit them over HTTPS.",
      },
    ],
  },
  {
    number: 8,
    slug: "client-registration",
    title: "Client Registration",
    description:
      "What happens when you register an application with an authorization server.",
    content: [
      {
        type: "p",
        text: "Before an application can request access on a user's behalf, it has to be registered with the authorization server. Registration is what establishes the client ID, and for confidential clients, the client secret, that every later request in the flow relies on.",
      },
      { type: "h2", text: "What you'll typically provide" },
      {
        type: "ul",
        items: [
          "An application name and, optionally, a logo shown on the consent screen.",
          "One or more redirect URIs the server should trust for this client.",
          "A client type: confidential (can hold a secret) or public (cannot).",
          "The grant types and scopes the application intends to use.",
        ],
      },
      {
        type: "p",
        text: "Redirect URI registration in particular is a security control, not just configuration — the authorization server should reject any request whose redirect_uri doesn't exactly match one that was registered, which prevents tokens and codes from being redirected somewhere an attacker controls.",
      },
    ],
  },
  {
    number: 9,
    slug: "authorization",
    title: "Authorization",
    description:
      "A deep dive into the authorization request and the redirect-based consent flow.",
    content: [
      {
        type: "p",
        text: "The authorization request is the step where the user actually sees something. Every other part of OAuth happens between servers, but this part happens in the user's browser: the client redirects the user to the authorization server, the user logs in if they aren't already, and they're shown a consent screen describing what the client wants to do.",
      },
      { type: "h2", text: "Building the authorization request" },
      {
        type: "p",
        text: "The client starts the flow by redirecting the user's browser to the authorization server's /authorize endpoint, with a set of query parameters describing the request:",
      },
      {
        type: "code",
        text: "GET /authorize?\n  response_type=code&\n  client_id=abc123&\n  redirect_uri=https://app.example.com/callback&\n  scope=calendar.read&\n  state=xyz789\nHost: authorization-server.com",
      },
      {
        type: "ul",
        items: [
          "response_type=code tells the server the client wants to use the authorization code flow.",
          "client_id identifies which application is making the request, from when it registered with the server.",
          "redirect_uri is where the user should be sent back to after they approve or deny the request. It must match one of the URLs registered for this client.",
          "scope is a space-delimited list of the specific permissions being requested.",
          "state is an opaque value the client generates and later verifies, used to protect against cross-site request forgery.",
        ],
      },
      { type: "h2", text: "The consent screen" },
      {
        type: "p",
        text: "Once the user is authenticated, the authorization server shows them a screen naming the client application and listing, in human-readable terms, what it's asking to do. This is the moment the user actually makes a decision, so the scopes requested should be as narrow as possible — asking for more access than the app needs is one of the most common integration mistakes.",
      },
      { type: "h2", text: "Returning the authorization code" },
      {
        type: "p",
        text: "If the user approves, the authorization server redirects back to the client's redirect_uri with a short-lived authorization code and the same state value the client sent:",
      },
      {
        type: "code",
        text: "HTTP/1.1 302 Found\nLocation: https://app.example.com/callback?\n  code=SplxlOBeZQQYbYS6WxSbIA&\n  state=xyz789",
      },
      {
        type: "p",
        text: "The client must check that the returned state matches what it originally sent. This one check is what prevents an attacker from tricking a user's browser into completing an authorization flow the user never started.",
      },
      { type: "h2", text: "Exchanging the code for a token" },
      {
        type: "p",
        text: "The authorization code itself is not a usable access token — it's a one-time-use value that the client must immediately exchange, in a direct server-to-server request, for an actual access token. This extra hop matters: the code passes through the user's browser and could theoretically be intercepted, but it's useless on its own without the client's credentials, which never touch the browser.",
      },
      {
        type: "quote",
        text: "Splitting the flow into \"get a code\" and \"exchange the code\" is what lets a public, browser-visible redirect carry a value that's safe even if it leaks, while the sensitive exchange happens over a channel the user never sees.",
      },
    ],
  },
  {
    number: 10,
    slug: "scope",
    title: "Scope",
    description: "How scope limits what an application can do on a user's behalf.",
    content: [
      {
        type: "p",
        text: "Scope is the mechanism OAuth uses to limit exactly what a client can do with a token, rather than granting all-or-nothing access to an account. A client requests one or more scopes in the authorization request, and the user can see — and sometimes selectively approve — exactly what's being requested.",
      },
      { type: "h2", text: "Designing good scopes" },
      {
        type: "p",
        text: "Scope names are opaque strings the authorization server defines — there's no required format, though a common convention is resource:action, such as contacts:read or invoices:write. Good scope design keeps each scope narrow and independently useful, so a client only ever has to request the smallest set that covers what it actually does.",
      },
      { type: "h2", text: "Requesting scope" },
      {
        type: "code",
        text: "GET /authorize?...&scope=contacts:read%20calendar:read",
      },
      {
        type: "p",
        text: "Scopes are space-delimited within the scope parameter. The authorization server may grant fewer scopes than requested — the token response includes the scopes actually granted, and a well-behaved client should check that field rather than assuming it received everything it asked for.",
      },
    ],
  },
  {
    number: 11,
    slug: "redirect-uris",
    title: "Redirect URIs",
    description:
      "Why redirect URI validation is one of the most security-critical parts of OAuth.",
    content: [
      {
        type: "p",
        text: "The redirect URI is where the authorization server sends the user back to after they approve or deny a request — and it's one of the most consequential values in the entire flow, because it's where the authorization code (or, in older flows, the token itself) gets delivered.",
      },
      { type: "h2", text: "Exact matching, not prefix matching" },
      {
        type: "p",
        text: "Authorization servers should require an exact match between the redirect_uri sent in the request and one of the URIs registered for that client — not merely that the request URI starts with a registered prefix. Prefix matching has historically been exploited by appending extra path segments or query parameters to redirect a code somewhere the legitimate app never intended.",
      },
      { type: "h2", text: "Loopback addresses for native apps" },
      {
        type: "p",
        text: "Native apps that can't register a fixed HTTPS redirect sometimes use a loopback address like http://127.0.0.1:PORT/callback, with the app running a temporary local server to catch the redirect. This is an accepted pattern specifically because the loopback interface isn't reachable from outside the user's own device.",
      },
    ],
  },
  {
    number: 12,
    slug: "access-tokens",
    title: "Access Tokens",
    description: "What access tokens are, how long they live, and how they should be treated.",
    content: [
      {
        type: "p",
        text: "An access token is the credential a client presents to a resource server to prove it has been granted access. Structurally, OAuth doesn't require any particular token format — to the client, a token should be treated as an opaque string.",
      },
      { type: "h2", text: "Opaque vs. structured tokens" },
      {
        type: "p",
        text: "Some authorization servers issue opaque random strings that only they can look up; others issue self-contained JWTs that a resource server can validate independently, without calling back to the authorization server. Both are valid — the choice is an implementation detail of the server, not something a well-behaved client should need to care about.",
      },
      { type: "h2", text: "Lifetime and refresh" },
      {
        type: "p",
        text: "Access tokens are usually short-lived — often minutes to a couple of hours — to limit the damage if one is ever leaked. Longer-lived access is handled separately through a refresh token, which a client can exchange for a new access token without involving the user again, until the refresh token itself is revoked or expires.",
      },
    ],
  },
  {
    number: 13,
    slug: "listing-authorizations",
    title: "Listing Authorizations",
    description:
      "Letting users see and revoke the applications they've connected to their account.",
    content: [
      {
        type: "p",
        text: "Because tokens are granted independently of a password, users need a separate place to see what they've actually authorized — and to revoke it. Most platforms provide an account settings page listing every third-party application with an active grant.",
      },
      { type: "h2", text: "What a good authorizations page shows" },
      {
        type: "ul",
        items: [
          "The application's name and logo, so it's recognizable.",
          "The scopes currently granted, in plain language.",
          "When access was first granted, and when it was last used.",
          "A one-click revoke action that immediately invalidates the associated tokens.",
        ],
      },
      {
        type: "p",
        text: "Revoking access here should be immediate and complete — any access or refresh tokens tied to that grant should stop working right away, not just fail to renew at their next natural expiry.",
      },
    ],
  },
  {
    number: 14,
    slug: "the-resource-server",
    title: "The Resource Server",
    description: "The API side of the equation: validating tokens and enforcing scope.",
    content: [
      {
        type: "p",
        text: "The resource server is the API that actually holds the protected data. Its job in the OAuth flow is narrow but critical: for every incoming request, validate the presented token and enforce that its granted scope actually covers the operation being requested.",
      },
      { type: "h2", text: "Validating a token" },
      {
        type: "p",
        text: "Depending on the token format, validation either means checking a cryptographic signature locally (for a self-contained token) or calling the authorization server's introspection endpoint to ask whether the token is still valid. Either way, an expired or revoked token should result in a 401 response, not a silent failure.",
      },
      { type: "h2", text: "Enforcing scope" },
      {
        type: "p",
        text: "A valid token isn't automatically authorization for every endpoint — the resource server still has to check that the token's granted scope covers the specific resource being requested, and return a 403 if it doesn't. Skipping this check is a common source of over-permissive APIs, even when the authorization flow itself is implemented correctly.",
      },
    ],
  },
  {
    number: 15,
    slug: "oauth-native-apps",
    title: "OAuth for Native Apps",
    description: "Best current practice for mobile and desktop applications, in more detail.",
    content: [
      {
        type: "p",
        text: "This chapter expands on the Mobile and Native Apps chapter with the specific recommendations published for native app authorization: use the authorization code flow with PKCE, launch an external user agent rather than an embedded webview, and use either claimed HTTPS redirects or a loopback interface to receive the response.",
      },
      { type: "h2", text: "Claimed HTTPS redirects" },
      {
        type: "p",
        text: "Modern mobile platforms let an app register ownership of a specific HTTPS URL pattern at the operating-system level. When the authorization server redirects to that URL, the OS routes it directly into the app instead of opening a browser tab — this is generally preferred over a custom URL scheme, since custom schemes can potentially be claimed by more than one app on the device.",
      },
      {
        type: "p",
        text: "Whichever redirect mechanism you choose, PKCE remains required — the redirect mechanism protects the return trip, but PKCE is what protects the authorization code itself from being replayed by another app on the same device.",
      },
    ],
  },
  {
    number: 16,
    slug: "device-flow",
    title: "OAuth for Browserless and Input-Constrained Devices",
    description: "How TVs, CLIs, and other limited-input devices can still support OAuth.",
    content: [
      {
        type: "p",
        text: "Some devices — smart TVs, streaming boxes, command-line tools — either have no browser at all or have an input method too limited to comfortably type a username and password. The device authorization grant is designed specifically for this case.",
      },
      { type: "h2", text: "How the device flow works" },
      {
        type: "ul",
        items: [
          "The device requests a device code and a short user code from the authorization server.",
          "The device displays the user code along with a short, easy-to-type verification URL.",
          "The user opens that URL on a separate device — a phone or laptop — logs in, and enters the code.",
          "Meanwhile, the original device polls the token endpoint until the user completes the approval, at which point it receives an access token.",
        ],
      },
      {
        type: "p",
        text: "This pattern is why so many streaming apps show a short code and ask you to visit a URL \"on your phone or computer\" — that's the device flow in action.",
      },
    ],
  },
  {
    number: 17,
    slug: "pkce",
    title: "Protecting Apps with PKCE",
    description: "The extension that protects the authorization code flow for public clients.",
    content: [
      {
        type: "p",
        text: "PKCE (Proof Key for Code Exchange, pronounced \"pixy\") closes a gap in the authorization code flow for clients that can't hold a secret: without it, anything intercepting the redirect could potentially exchange a stolen authorization code for a token.",
      },
      { type: "h2", text: "The mechanics" },
      {
        type: "ul",
        items: [
          "The client generates a random string, the code_verifier, before starting the flow.",
          "It derives a code_challenge by hashing the verifier (typically with SHA-256) and sends the challenge in the initial authorization request.",
          "When exchanging the authorization code for a token, the client sends the original, unhashed code_verifier.",
          "The authorization server hashes the verifier it just received and checks that it matches the challenge from step two before issuing a token.",
        ],
      },
      {
        type: "p",
        text: "Because the verifier itself never appears in the browser-visible part of the flow, an attacker who intercepts the authorization code still can't complete the exchange without also having generated the original verifier — which they never see.",
      },
    ],
  },
  {
    number: 18,
    slug: "token-introspection-endpoint",
    title: "Token Introspection Endpoint",
    description: "How a resource server can ask the authorization server whether a token is valid.",
    content: [
      {
        type: "p",
        text: "When an access token is an opaque string rather than a self-contained JWT, a resource server has no way to validate it locally. The token introspection endpoint solves this: it's a dedicated API the resource server can call to ask the authorization server whether a given token is currently active.",
      },
      { type: "h2", text: "Example request and response" },
      {
        type: "code",
        text: "POST /introspect\nHost: authorization-server.com\nContent-Type: application/x-www-form-urlencoded\n\ntoken=2YotnFZFEjr1zCsicMWpAA",
      },
      {
        type: "code",
        text: "{\n  \"active\": true,\n  \"scope\": \"calendar.read contacts.read\",\n  \"client_id\": \"abc123\",\n  \"exp\": 1735689600\n}",
      },
      {
        type: "p",
        text: "Because this endpoint reveals whether a token is valid, it's typically protected itself — usually requiring the resource server to authenticate with its own credentials before it can introspect tokens on behalf of users.",
      },
    ],
  },
  {
    number: 19,
    slug: "creating-documentation",
    title: "Creating Documentation",
    description: "Guidance for API providers writing OAuth docs that developers can actually follow.",
    content: [
      {
        type: "p",
        text: "If you're building an API that uses OAuth, your documentation is often the first real interaction a developer has with your platform. A confusing auth section is enough to make someone abandon an integration before they've written a single line of code against your actual API.",
      },
      { type: "h2", text: "Start with a concrete example, not the spec" },
      {
        type: "p",
        text: "Developers arriving at your docs already know roughly what OAuth is. What they don't know is how your server implements it — which flow to use, what your endpoints are called, and what your scopes mean. Lead with a working example: a real authorization URL with your actual endpoint, a real token exchange request, and a real (redacted) response.",
      },
      { type: "h2", text: "Document every endpoint explicitly" },
      {
        type: "ul",
        items: [
          "The authorization endpoint URL and every parameter it accepts.",
          "The token endpoint URL and the exact grant types you support.",
          "Your full list of scopes, each with a one-sentence, plain-language description.",
          "Access token lifetime, and whether refresh tokens are issued.",
          "What error responses look like, including the specific error codes your server returns.",
        ],
      },
      { type: "h2", text: "Keep a changelog for your OAuth implementation" },
      {
        type: "p",
        text: "Authorization servers evolve — new scopes get added, old ones get deprecated, token lifetimes change. A dated changelog specifically for your OAuth endpoints, separate from your general API changelog, helps integrators quickly check whether a production issue correlates with something you changed on your end.",
      },
    ],
  },
  {
    number: 20,
    slug: "definitions",
    title: "Definitions",
    description: "A glossary of the roles and terms used throughout the OAuth specification.",
    content: [
      {
        type: "p",
        text: "OAuth's spec text uses a specific vocabulary consistently, and knowing it makes the rest of the ecosystem's documentation, including this guide, much easier to read.",
      },
      {
        type: "ul",
        items: [
          "Resource Owner — the user who owns the protected data and can grant access to it.",
          "Client — the application requesting access on the resource owner's behalf.",
          "Authorization Server — issues tokens after authenticating the resource owner and obtaining consent.",
          "Resource Server — hosts the protected resources and accepts access tokens.",
          "Access Token — a credential representing a specific, limited grant of access.",
          "Refresh Token — a longer-lived credential used to obtain new access tokens without re-prompting the user.",
          "Scope — a limitation on what an access token authorizes the bearer to do.",
          "Grant Type — the specific flow used to obtain a token (authorization code, client credentials, device code, etc).",
        ],
      },
    ],
  },
  {
    number: 21,
    slug: "differences-between-oauth-1-2",
    title: "Differences Between OAuth 1 and OAuth 2",
    description: "For readers coming from the older spec, a summary of what changed and why.",
    content: [
      {
        type: "p",
        text: "OAuth 2.0 is a ground-up redesign of OAuth 1.0a, not a minor revision, and the two are not compatible with each other. Readers coming from OAuth 1 implementations often ask why certain things that used to be required are now handled differently.",
      },
      { type: "h2", text: "Signatures vs. TLS" },
      {
        type: "p",
        text: "OAuth 1 required every request to be cryptographically signed using the client secret, which protected requests even over plain HTTP but made client libraries significantly more complex and fragile — a single mismatched character in the signature base string would silently break the request. OAuth 2.0 drops request signing entirely and instead requires TLS on every endpoint, trading signature complexity for a now-universal infrastructure requirement.",
      },
      { type: "h2", text: "More flows, not fewer" },
      {
        type: "p",
        text: "OAuth 1 had essentially one flow for every client type. OAuth 2.0 defines multiple grant types suited to different application shapes — server-side apps, native apps, device-constrained clients, and machine-to-machine clients — which is more flexible but also means there's no longer a single flow to learn once and apply everywhere.",
      },
    ],
  },
  {
    number: 22,
    slug: "openid-connect",
    title: "OpenID Connect",
    description: "How the identity layer built on top of OAuth 2.0 relates to authorization.",
    content: [
      {
        type: "p",
        text: "OAuth 2.0 is an authorization framework — it's about granting access to resources, not about proving who a user is. OpenID Connect (OIDC) is a thin identity layer built on top of OAuth 2.0 that adds exactly that: a standard way to verify a user's identity and get basic profile information.",
      },
      { type: "h2", text: "What OIDC adds" },
      {
        type: "ul",
        items: [
          "An ID token — a signed JWT containing claims about the authenticated user, separate from the access token.",
          "A standard openid scope that triggers identity-focused behavior.",
          "A standard UserInfo endpoint for fetching additional profile claims.",
          "A discovery document that lets clients auto-configure endpoints for a given provider.",
        ],
      },
      {
        type: "p",
        text: "In practice, most \"Sign in with X\" buttons you encounter are using OpenID Connect, not plain OAuth 2.0 — the distinction matters because it's the ID token, not the access token, that a client should actually trust to know who the user is.",
      },
    ],
  },
  {
    number: 23,
    slug: "indieauth",
    title: "IndieAuth",
    description: "A decentralized identity protocol built entirely on top of OAuth 2.0.",
    content: [
      {
        type: "p",
        text: "IndieAuth is a decentralized identity protocol that lets you use your own website as your login identity, using standard OAuth 2.0 mechanics underneath. Instead of signing in with a large third-party provider, you sign in with a URL you own.",
      },
      { type: "h2", text: "How identity maps to a URL" },
      {
        type: "p",
        text: "A user's website links to their chosen authorization endpoint using a rel=\"authorization_endpoint\" link tag. When they enter their URL to sign in somewhere, the client fetches that page, discovers the linked endpoint, and starts a standard OAuth authorization request against it — the same request shape covered earlier in this guide, just with the authorization server determined dynamically from a personal domain rather than fixed in advance.",
      },
      {
        type: "p",
        text: "This makes IndieAuth a good illustration of how general-purpose the core OAuth flow really is — the roles and request shape don't change, only how the authorization server is discovered.",
      },
    ],
  },
  {
    number: 24,
    slug: "map-oauth-2-0-specs",
    title: "Map of OAuth 2.0 Specs",
    description: "An orientation guide to the many RFCs that make up the OAuth 2.0 family.",
    content: [
      {
        type: "p",
        text: "\"OAuth 2.0\" isn't one document — it's a growing family of RFCs, each covering a specific extension or clarification. This chapter is meant as an orientation, not a full reading list.",
      },
      {
        type: "ul",
        items: [
          "RFC 6749 — The OAuth 2.0 Authorization Framework, the core specification.",
          "RFC 6750 — Bearer Token Usage, defining how tokens are attached to requests.",
          "RFC 7636 — PKCE, covered in this guide's PKCE chapter.",
          "RFC 8628 — Device Authorization Grant, covered in the device flow chapter.",
          "RFC 7662 — Token Introspection, covered in this guide's introspection chapter.",
          "RFC 8252 — OAuth for Native Apps, covered earlier in this guide.",
          "RFC 6819 — Threat Model and Security Considerations, useful background reading once you're comfortable with the core flow.",
        ],
      },
      {
        type: "p",
        text: "You don't need to read all of these to build a working integration — most developers only ever need the core framework plus whichever extension matches their specific client type.",
      },
    ],
  },
  {
    number: 25,
    slug: "tools-and-libraries",
    title: "Tools and Libraries",
    description: "Recommended debuggers, client libraries, and test servers for building with OAuth.",
    content: [
      {
        type: "p",
        text: "You rarely need to hand-roll an OAuth client from scratch — mature, well-audited libraries exist for essentially every language, and using one is almost always the right call for anything beyond learning the protocol.",
      },
      { type: "h2", text: "What to look for in a library" },
      {
        type: "ul",
        items: [
          "Active maintenance and a recent release — OAuth security guidance evolves, and an unmaintained library can quietly fall behind current best practice.",
          "Built-in PKCE support if you're building a public client.",
          "Automatic token refresh handling, so you're not manually managing expiry.",
          "Clear separation between the parts that touch the browser and the parts that make server-to-server calls.",
        ],
      },
      { type: "h2", text: "Debugging tools" },
      {
        type: "p",
        text: "A raw HTTP client (for inspecting exact request and response bodies), a JWT decoder (for inspecting token contents without needing the signing key), and your browser's network tab (for watching the redirect chain) will get you through the vast majority of integration issues without needing anything more specialized.",
      },
    ],
  },
  {
    number: null,
    slug: "appendix",
    title: "Appendix",
    description: "Supplementary reference material, changelog notes, and additional reading.",
    content: [
      {
        type: "p",
        text: "This appendix collects supplementary material that didn't fit neatly into a single chapter — errata, changelog notes on this guide itself, and pointers to further reading for anyone who wants to go beyond the practical scope covered here.",
      },
      { type: "h2", text: "Further reading" },
      {
        type: "ul",
        items: [
          "The core OAuth 2.0 Authorization Framework specification (RFC 6749).",
          "The OAuth 2.0 Security Best Current Practice document, which supersedes some of the original spec's guidance (notably around the implicit flow).",
          "The OpenID Connect Core specification, for anyone building identity on top of OAuth.",
        ],
      },
      {
        type: "p",
        text: "If you find an error in this guide or think something needs clarifying, feedback is always welcome — this material is maintained and improved over time based on exactly that kind of input.",
      },
    ],
  },
];

export function getChapterBySlug(slug) {
  return chapters.find((c) => c.slug === slug);
}

export function getAdjacentChapters(slug) {
  const index = chapters.findIndex((c) => c.slug === slug);
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null,
  };
}
