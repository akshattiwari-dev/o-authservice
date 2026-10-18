import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { createClientSchema } from "@/utils/validation";
import { createClient, listClientsForOwner } from "@/services/clientService";
import { logAudit, getClientIp } from "@/services/auditService";

export async function GET() {
  try {
    const session = await requireSession();
    const clients = await listClientsForOwner(session.user.id);
    // Never expose clientSecretHash to the frontend.
    const safe = clients.map(({ clientSecretHash, ...rest }) => rest);
    return NextResponse.json({ clients: safe });
  } catch (err) {
    if (err instanceof Response || err instanceof NextResponse) return err;
    throw err;
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "Check the client fields and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { client, clientSecret } = await createClient({ ownerId: session.user.id, ...parsed.data });
    const { clientSecretHash, ...safeClient } = client;

    await logAudit({
      userId: session.user.id,
      action: "client.created",
      metadata: { clientId: client.clientId },
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    // clientSecret (raw) is only ever returned here, at creation time.
    return NextResponse.json({ client: safeClient, clientSecret }, { status: 201 });
  } catch (err) {
    if (err instanceof Response || err instanceof NextResponse) return err;
    throw err;
  }
}
