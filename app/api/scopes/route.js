import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// Backs the scope checkboxes on the client create/edit forms — previously
// a hardcoded AVAILABLE_SCOPES array in ClientsManager.jsx that silently
// drifted from the actual Scope table.
export async function GET() {
  try {
    await requireSession();
    const scopes = await prisma.scope.findMany({
      orderBy: { name: "asc" },
      select: { name: true, description: true, isDefault: true },
    });
    return NextResponse.json({ scopes });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
