import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { updateUserRoleSchema } from "@/utils/validation";
import { logAudit, getClientIp } from "@/services/auditService";
import { resolvePageSize, cursorWhereDesc, paginateResults } from "@/utils/pagination";
import { updateUserRole, AdminGuardError } from "@/services/adminService";

export async function GET(request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const take = resolvePageSize(url.searchParams.get("take"));
    const cursor = url.searchParams.get("cursor");

    const rows = await prisma.user.findMany({
      where: cursorWhereDesc(cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { oauthClients: true, accessTokens: true } },
      },
    });

    return NextResponse.json(paginateResults(rows, take));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = updateUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "userId and role are required.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    let updated;
    try {
      updated = await updateUserRole(userId, role);
    } catch (guardErr) {
      if (guardErr instanceof AdminGuardError) {
        const status = guardErr.code === "not_found" ? 404 : 409;
        return NextResponse.json({ error: guardErr.code, message: guardErr.message }, { status });
      }
      throw guardErr;
    }

    await logAudit({
      userId: session.user.id,
      action: "admin.userRoleUpdated",
      metadata: { targetUserId: updated.id, newRole: updated.role },
      ip: getClientIp(request),
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
