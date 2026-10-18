import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, randomToken, sha256 } from "@/utils/crypto";
import { signUpSchema } from "@/utils/validation";
import { logAudit, getClientIp } from "@/services/auditService";
import { checkRateLimit } from "@/utils/rateLimit";
import { sendMail } from "@/lib/mailer";

const SIGNUP_RATE_LIMIT = Number(process.env.SIGNUP_RATE_LIMIT || 10);
const SIGNUP_RATE_WINDOW_MS = Number(process.env.SIGNUP_RATE_WINDOW_MS || 60_000);
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60_000; // 24 hours

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`signup:${ip}`, { limit: SIGNUP_RATE_LIMIT, windowMs: SIGNUP_RATE_WINDOW_MS });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many signup attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "Check the fields and try again.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Deliberately vague to avoid confirming which emails are registered.
    return NextResponse.json(
      { error: "invalid_request", message: "Could not create account with these details." },
      { status: 400 }
    );
  }

  const passwordHash = await hashSecret(password);

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, password: passwordHash, role: "USER" },
  });

  await logAudit({
    userId: user.id,
    action: "auth.signUp",
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  // S1: emailVerified stays null until this is used — see verify-email
  // route. Signup itself isn't blocked on this (soft gate, see README).
  const rawToken = randomToken(32);
  await prisma.verificationToken.create({
    data: {
      identifier: `verify:${normalizedEmail}`,
      token: sha256(rawToken),
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${rawToken}`;
  await sendMail({
    to: normalizedEmail,
    subject: "Verify your email",
    text: `Welcome! Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
