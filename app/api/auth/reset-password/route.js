import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, sha256 } from "@/utils/crypto";
import { resetPasswordSchema } from "@/utils/validation";
import { logAudit, getClientIp } from "@/services/auditService";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "Password must be at least 8 characters.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = sha256(token);

  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!record || !record.identifier.startsWith("reset:") || record.expires < new Date()) {
    // Clean up an expired-but-found row while we're here.
    if (record) await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
    return NextResponse.json(
      { error: "invalid_token", message: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const email = record.identifier.slice("reset:".length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
    return NextResponse.json(
      { error: "invalid_token", message: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashSecret(password);
  const changedAt = new Date();

  await prisma.$transaction([
    // A5: bumping passwordChangedAt here is what makes every JWT issued
    // before this moment fail the watermark check in lib/auth.js's jwt()
    // callback on its next use — this is the actual session-revocation
    // mechanism, not just an audit timestamp.
    prisma.user.update({ where: { id: user.id }, data: { password: passwordHash, passwordChangedAt: changedAt } }),
    // Invalidate every other outstanding reset token for this email, not
    // just the one used — a stale link left in an old email shouldn't
    // still work after a successful reset.
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  await logAudit({ userId: user.id, action: "auth.passwordReset", ip: getClientIp(request) });

  return NextResponse.json({ message: "Password updated. Sign in with your new password." });
}
