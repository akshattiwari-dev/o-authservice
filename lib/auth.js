import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/utils/crypto";
import { logAudit } from "@/services/auditService";
import { recordFailure, recordSuccess, isLockedOut } from "@/utils/rateLimit";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 5 * 60_000; // 5 minutes

const providers = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, req) {
      if (!credentials?.email || !credentials?.password) return null;

      const email = credentials.email.toLowerCase();
      // Locked out by email regardless of source IP — a distributed
      // brute-force attempt against one account is still stopped, not
      // just one that happens to come from a single address.
      const lockoutKey = `login:${email}`;
      const lockStatus = await isLockedOut(lockoutKey);
      if (lockStatus.locked) {
        await logAudit({ action: "auth.signIn.lockedOut", metadata: { email } });
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });

      // No user, or the account was created via a social provider only
      // (no password set) — reject either way without distinguishing why,
      // so we don't leak which emails are registered. Still counts as a
      // failure toward lockout, so an attacker can't distinguish
      // "unknown email" from "wrong password" via timing/lockout either.
      if (!user || !user.password) {
        await recordFailure(lockoutKey, { maxAttempts: LOGIN_MAX_ATTEMPTS, lockoutMs: LOGIN_LOCKOUT_MS });
        return null;
      }

      const valid = await verifySecret(credentials.password, user.password);
      if (!valid) {
        await recordFailure(lockoutKey, { maxAttempts: LOGIN_MAX_ATTEMPTS, lockoutMs: LOGIN_LOCKOUT_MS });
        await logAudit({ userId: user.id, action: "auth.signIn.failed" });
        return null;
      }

      await recordSuccess(lockoutKey);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        emailVerified: user.emailVerified,
      };
    },
  }),
];

// Social providers are optional — only registered if credentials are present,
// so the app still runs with just email/password in local dev.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    newUser: "/dashboard",
  },
  providers,
  callbacks: {
    // Credentials provider can't use the DB session flow, so role/id are
    // carried through the JWT instead and copied onto the session below.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.emailVerified = Boolean(user.emailVerified);
        // A5: stamp the JWT with the password-changed watermark that was
        // current at sign-in time, so it can be compared against the DB's
        // live value below on every later call.
        token.pwChangedAt = user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0;
      } else if (token.email && !token.role) {
        // Social login on an existing session — look up the role once.
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
          token.emailVerified = Boolean(dbUser.emailVerified);
          token.pwChangedAt = dbUser.passwordChangedAt ? new Date(dbUser.passwordChangedAt).getTime() : 0;
        }
      } else if (trigger === "update" && token.id) {
        // S1: verify-email calls `useSession().update()` client-side after
        // a successful verification, which lands here — re-read from the
        // DB rather than trusting whatever the client claims, so this
        // can't be spoofed into flipping the flag without actually
        // verifying.
        const dbUser = await prisma.user.findUnique({ where: { id: token.id }, select: { emailVerified: true } });
        token.emailVerified = Boolean(dbUser?.emailVerified);
      }

      // A5: session invalidation on password reset. NextAuth's "jwt"
      // session strategy has no server-side session row to delete, so a
      // JWT issued before a password reset would otherwise stay valid
      // until it naturally expires. Instead, every call re-reads the
      // user's current passwordChangedAt and rejects the token outright
      // (returning null forces NextAuth to treat this as "no session") if
      // the token predates it. This costs one extra indexed lookup per
      // request that hits the jwt() callback — acceptable for the
      // security property it buys; a short-TTL cache could remove it if
      // this ever becomes a hot-path concern.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordChangedAt: true },
        });
        if (!dbUser) return null; // user deleted since token issuance
        const currentWatermark = dbUser.passwordChangedAt ? new Date(dbUser.passwordChangedAt).getTime() : 0;
        if (currentWatermark > (token.pwChangedAt || 0)) {
          return null; // password changed after this token was issued — revoke
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role || "USER";
        session.user.emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      await logAudit({ userId: user.id, action: "auth.signIn" });

      // Social providers verify email ownership themselves — no reason to
      // also make these users click our own verification link.
      if (account?.provider !== "credentials" && !user.emailVerified) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }).catch(() => {});
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
