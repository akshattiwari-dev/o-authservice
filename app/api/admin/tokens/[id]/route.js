import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/services/auditService";

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin();
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind"); // "access" | "refresh"

    const result =
      kind === "refresh"
        ? await prisma.refreshToken.updateMany({ where: { id: params.id }, data: { revoked: true } })
        : await prisma.accessToken.updateMany({ where: { id: params.id }, data: { revoked: true } });

    if (result.count === 0) {
      return NextResponse.json({ error: "not_found", message: "Token not found." }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "admin.token.revoked",
      metadata: { tokenRecordId: params.id, kind: kind || "access" },
      ip: getClientIp(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
