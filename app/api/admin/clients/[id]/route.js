import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit, getClientIp } from "@/services/auditService";
import { invalidateClientCache } from "@/services/clientService";

const schema = z.object({ disabled: z.boolean() });

export async function PATCH(request, { params }) {
  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "`disabled` (boolean) is required.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.oAuthClient.update({
      where: { id: params.id },
      data: { disabled: parsed.data.disabled },
      select: { id: true, clientId: true, name: true, disabled: true },
    });
    // This bypasses services/clientService.js (admin routes update
    // OAuthClient directly), so the cache there needs an explicit nudge —
    // otherwise a just-disabled client could still authenticate for up to
    // CLIENT_CACHE_TTL_MS.
    invalidateClientCache(updated.clientId);

    await logAudit({
      userId: session.user.id,
      action: parsed.data.disabled ? "admin.client.disabled" : "admin.client.enabled",
      metadata: { clientId: updated.clientId },
      ip: getClientIp(request),
    });

    return NextResponse.json({ client: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err.code === "P2025") {
      return NextResponse.json({ error: "not_found", message: "Client not found." }, { status: 404 });
    }
    throw err;
  }
}
