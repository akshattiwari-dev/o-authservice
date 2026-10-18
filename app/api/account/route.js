import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/services/auditService";

// Cascades: schema has onDelete: Cascade from OAuthClient/AccessToken/
// RefreshToken/AuthorizationCode/ApiKey/ChapterProgress/ChapterNote/
// Account/Session -> User (see prisma/schema.prisma), so deleting the User
// row is sufficient — Postgres handles the rest in one statement.
// Note: there is currently no admin-side "delete a user" endpoint (admin
// can only change roles, see /api/admin/users), so this self-service path
// is the only place user deletion happens today — nothing else to stay
// consistent with yet.
export async function DELETE(request) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const email = session.user.email;

    await prisma.user.delete({ where: { id: userId } });

    // Best-effort — the user row (and its FK'd audit logs) is already
    // gone, so this write has no userId to attach to; log without one.
    await logAudit({ action: "account.selfDeleted", metadata: { email }, ip: getClientIp(request) }).catch(() => {});

    return NextResponse.json({ message: "Account deleted." });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
