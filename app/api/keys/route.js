import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { createApiKeySchema } from "@/utils/validation";
import { createApiKey, listApiKeys } from "@/services/apiKeyService";
import { logAudit, getClientIp } from "@/services/auditService";

export async function GET() {
  try {
    const session = await requireSession();
    const keys = await listApiKeys(session.user.id);
    return NextResponse.json({ keys });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "A key name is required.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { row, rawKey } = await createApiKey(session.user.id, parsed.data.name);

    await logAudit({
      userId: session.user.id,
      action: "apiKey.created",
      metadata: { keyId: row.id },
      ip: getClientIp(request),
    });

    // rawKey is only ever available in this response.
    return NextResponse.json({ id: row.id, name: row.name, key: rawKey }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
