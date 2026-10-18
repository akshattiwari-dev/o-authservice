/**
 * Cursor pagination convention for admin list endpoints:
 * `?cursor=<opaque>&take=<n>` -> `{ items, nextCursor }`.
 *
 * Cursor is `createdAt|id` (base64url), and we sort/filter by
 * (createdAt desc, id desc) rather than id alone — id is a cuid, not
 * time-sortable, so id-only cursoring would paginate in a meaningless
 * order. This works without a compound unique index.
 */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

export function resolvePageSize(rawTake) {
  const n = Number(rawTake);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

export function encodeCursor(createdAt, id) {
  return Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString("base64url");
}

export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [createdAtStr, id] = decoded.split("|");
    if (!createdAtStr || !id) return null;
    const createdAt = new Date(createdAtStr);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

// Prisma `where` fragment implementing "strictly before this cursor" for a
// (createdAt desc, id desc) ordering. Merge with any other filters via AND.
export function cursorWhereDesc(cursor) {
  const decoded = decodeCursor(cursor);
  if (!decoded) return {};
  return {
    OR: [
      { createdAt: { lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, id: { lt: decoded.id } },
    ],
  };
}

// Given `take + 1` rows fetched in (createdAt desc, id desc) order, split
// into the page to return and the nextCursor (or null if that was the
// last page).
export function paginateResults(rows, take) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;
  return { items, nextCursor };
}
