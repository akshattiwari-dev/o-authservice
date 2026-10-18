import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { resolvePageSize, cursorWhereDesc, paginateResults } from "@/utils/pagination";

export async function GET(request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    // Kept the legacy `take` param name (was a flat limit before) rather
    // than renaming to `pageSize` — same param now doubles as page size.
    const take = resolvePageSize(url.searchParams.get("take"));
    const cursor = url.searchParams.get("cursor");

    const rows = await prisma.auditLog.findMany({
      where: cursorWhereDesc(cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json(paginateResults(rows, take));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
