import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { resolvePageSize, cursorWhereDesc, paginateResults } from "@/utils/pagination";

export async function GET(request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const take = resolvePageSize(url.searchParams.get("take"));
    const cursor = url.searchParams.get("cursor");

    const rows = await prisma.accessToken.findMany({
      where: cursorWhereDesc(cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: {
        id: true,
        scopes: true,
        revoked: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { email: true } },
        client: { select: { name: true, clientId: true } },
      },
    });

    return NextResponse.json(paginateResults(rows, take));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
