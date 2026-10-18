import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { revokeOwnToken } from "@/services/tokenService";
import { logAudit, getClientIp } from "@/services/auditService";

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession();
    const kind = new URL(request.url).searchParams.get("kind"); // "access" | "refresh"

    // Ownership is enforced inside revokeOwnToken's query itself (id +
    // userId in the same `where`), not checked after a separate fetch —
    // see the IDOR test coverage in tests/integration/idor.test.js.
    const revoked = await revokeOwnToken({ id: params.id, userId: session.user.id, kind });
    if (!revoked) {
      return NextResponse.json({ error: "not_found", message: "Token not found." }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "token.selfRevoked",
      metadata: { tokenRecordId: params.id, kind: kind || "access" },
      ip: getClientIp(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
