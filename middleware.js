import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = ["/dashboard"];
const ADMIN_PREFIXES = ["/admin"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  applySecurityHeaders(response);

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAuth || needsAdmin) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (needsAdmin && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

function applySecurityHeaders(response) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // S5: intentionally strict — no 'unsafe-inline' on script-src, no third
  // party script/style origins. img-src has to allow https: broadly
  // because OAuth client logoUrl (validated in utils/validation.js, see
  // A1) is arbitrary developer-supplied https image URLs rendered on the
  // consent screen — that's a residual risk (a malicious client could
  // still point logoUrl at an https tracking pixel / user-fingerprinting
  // image host), just not an XSS one. Narrowing img-src further would mean
  // proxying/caching logos ourselves, which is out of scope here.
    const isDev = process.env.NODE_ENV === "development";

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Dev: Next.js HMR + React need these. Prod stays strict (no eval / no arbitrary inline scripts).
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Tailwind-generated inline styles
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:", // Socket.io
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
}

export const config = {
  // Widened from just /dashboard + /admin so these headers (CSP in
  // particular) also cover public pages like /oauth/authorize — the
  // consent screen, where the logoUrl <img> risk noted above actually
  // lives. Auth/admin gating above is unaffected; it still only checks
  // PROTECTED_PREFIXES/ADMIN_PREFIXES.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
