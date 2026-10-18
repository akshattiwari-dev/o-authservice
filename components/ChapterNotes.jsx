"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ChapterNotes({ chapterSlug }) {
  const { data: session, status } = useSession();
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/chapters/notes?chapterSlug=${encodeURIComponent(chapterSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        setBody(d.note?.body || "");
        setLoaded(true);
      });
  }, [status, chapterSlug]);

  useEffect(() => {
    if (!loaded) return;
    setSaved(false);
    const timeout = setTimeout(async () => {
      await fetch("/api/chapters/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterSlug, body }),
      });
      setSaved(true);
    }, 700);
    return () => clearTimeout(timeout);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-article px-6 pb-10">
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Sign in
          </Link>{" "}
          to keep private notes on this chapter and track your progress.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-article px-6 pb-10">
      <div className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your private notes</p>
          <span className="text-xs text-muted">{saved ? "Saved" : "Saving…"}</span>
        </div>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notes only you can see on this chapter…"
          className="mt-2 w-full resize-y rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}
