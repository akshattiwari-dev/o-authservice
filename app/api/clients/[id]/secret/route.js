import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { regenerateSecret } from "@/services/clientService";
import { logAudit, getClientIp } from "@/services/auditService";

export async function POST(request, { params }) {
  try {
    const session = await requireSession();
    const clientSecret = await regenerateSecret(params.id, session.user.id);
    if (clientSecret === null) {
      return NextResponse.json({ error: "not_found", message: "Client not found." }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "client.secretRegenerated",
      metadata: { clientRecordId: params.id },
      ip: getClientIp(request),
    });

    return NextResponse.json({ clientSecret });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err.message?.includes("Public clients")) {
      return NextResponse.json({ error: "invalid_request", message: err.message }, { status: 400 });
    }
    throw err;
  }
}
