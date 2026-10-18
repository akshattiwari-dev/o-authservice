import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/utils/crypto";
import { forgotPasswordSchema } from "@/utils/validation";
import { logAudit, getClientIp } from "@/services/auditService";
import { checkRateLimit } from "@/utils/rateLimit";
import { sendMail } from "@/lib/mailer";

const RESET_TOKEN_TTL_MS = 60 * 60_000; // 1 hour
const RESET_RATE_LIMIT = Number(process.env.FORGOT_PASSWORD_RATE_LIMIT || 5);
const RESET_RATE_WINDOW_MS = Number(process.env.FORGOT_PASSWORD_RATE_WINDOW_MS || 15 * 60_000);
// A4: cap outstanding reset tokens per email so this endpoint can't be
// abused to grow VerificationToken unboundedly even within the rate limit.
const MAX_ACTIVE_TOKENS_PER_EMAIL = 3;

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

export async function POST(request) {
  const ip = getClientIp(request);
  // Strict rate limit — this endpoint enumerates nothing itself, but it's
  // still a mailbomb / DB-growth vector without one.
  const limit = await checkRateLimit(`forgot-password:${ip}`, { limit: RESET_RATE_LIMIT, windowMs: RESET_RATE_WINDOW_MS });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Still generic — we don't want to distinguish "bad email format" from
    // "unknown account" any more precisely than necessary.
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const email = parsed.data.email.toLowerCase();
  const identifier = `reset:${email}`;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always the same response and (roughly) the same amount of work,
  // whether or not the account exists, so this can't be used to enumerate
  // registered emails.
  if (user) {
    const existingCount = await prisma.verificationToken.count({ where: { identifier } });
    if (existingCount < MAX_ACTIVE_TOKENS_PER_EMAIL) {
      const rawToken = randomToken(32);
      await prisma.verificationToken.create({
        data: {
          identifier,
          token: sha256(rawToken),
          expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;
      await sendMail({
        to: email,
        subject: "Reset your password",
        text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      });
    }

    await logAudit({ userId: user.id, action: "auth.passwordResetRequested", ip });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
