import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { chapterProgressSchema } from "@/utils/validation";
import { getProgressForUser, setChapterCompletion } from "@/services/chapterService";

export async function GET() {
  try {
    const session = await requireSession();
    const progress = await getProgressForUser(session.user.id);
    return NextResponse.json({ progress });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = chapterProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: "Check the fields and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await setChapterCompletion(session.user.id, parsed.data.chapterSlug, parsed.data.completed);
    return NextResponse.json({ progress: result });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}
