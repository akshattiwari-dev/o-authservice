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

    const rows = await prisma.oAuthClient.findMany({
      where: cursorWhereDesc(cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: {
        id: true,
        clientId: true,
        name: true,
        isPublic: true,
        disabled: true,
        createdAt: true,
        owner: { select: { email: true, name: true } },
        _count: { select: { accessTokens: true } },
      },
    });

    return NextResponse.json(paginateResults(rows, take));
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
