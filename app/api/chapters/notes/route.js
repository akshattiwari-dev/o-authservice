import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { chapterNoteSchema } from "@/utils/validation";
import { getNote, upsertNote } from "@/services/chapterService";

export async function GET(request) {
  try {
    const session = await requireSession();
    const chapterSlug = new URL(request.url).searchParams.get("chapterSlug");
    if (!chapterSlug) {
      return NextResponse.json(
        { error: "invalid_request", message: "chapterSlug query param is required." },
        { status: 400 }
      );
    }

    const note = await getNote(session.user.id, chapterSlug);
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = chapterNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "Check the fields and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const note = await upsertNote(session.user.id, parsed.data.chapterSlug, parsed.data.body);
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
