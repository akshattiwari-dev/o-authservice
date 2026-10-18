import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { revokeApiKey } from "@/services/apiKeyService";
import { logAudit, getClientIp } from "@/services/auditService";

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession();
    const revoked = await revokeApiKey(params.id, session.user.id);
    if (!revoked) return NextResponse.json({ error: "not_found", message: "API key not found." }, { status: 404 });

    await logAudit({
      userId: session.user.id,
      action: "apiKey.revoked",
      metadata: { keyId: params.id },
      ip: getClientIp(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
