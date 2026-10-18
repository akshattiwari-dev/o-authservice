import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { updateClientSchema } from "@/utils/validation";
import { getClientForOwner, updateClient, deleteClient } from "@/services/clientService";
import { logAudit, getClientIp } from "@/services/auditService";

const NOT_FOUND = { error: "not_found", message: "Client not found." };

export async function GET(request, { params }) {
  try {
    const session = await requireSession();
    const client = await getClientForOwner(params.id, session.user.id);
    if (!client) return NextResponse.json(NOT_FOUND, { status: 404 });
    const { clientSecretHash, ...safe } = client;
    return NextResponse.json({ client: safe });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "Check the client fields and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateClient(params.id, session.user.id, parsed.data);
    if (!updated) return NextResponse.json(NOT_FOUND, { status: 404 });

    await logAudit({
      userId: session.user.id,
      action: "client.updated",
      metadata: { clientId: updated.clientId },
      ip: getClientIp(request),
    });

    const { clientSecretHash, ...safe } = updated;
    return NextResponse.json({ client: safe });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession();
    const deleted = await deleteClient(params.id, session.user.id);
    if (!deleted) return NextResponse.json(NOT_FOUND, { status: 404 });

    await logAudit({
      userId: session.user.id,
      action: "client.deleted",
      metadata: { clientId: deleted.clientId },
      ip: getClientIp(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
