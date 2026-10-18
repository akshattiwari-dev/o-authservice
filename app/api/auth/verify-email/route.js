import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/utils/crypto";
import { logAudit } from "@/services/auditService";

// GET so the emailed link (`.../verify-email?token=...`) works as a plain
// click-through with no client-side JS required. Redirects to /dashboard
// with a query flag either way; the dashboard shell reads it to show a
// one-time toast (see components/dashboard banner wiring).
export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const redirectTo = (status) => {
    const dest = new URL("/dashboard", url.origin);
    dest.searchParams.set("verify", status);
    return NextResponse.redirect(dest);
  };

  if (!token) return redirectTo("missing");

  const tokenHash = sha256(token);
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });

  if (!record || !record.identifier.startsWith("verify:") || record.expires < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
    return redirectTo("invalid");
  }

  const email = record.identifier.slice("verify:".length);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {});
    return redirectTo("invalid");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  await logAudit({ userId: user.id, action: "auth.emailVerified" });

  return redirectTo("success");
}
