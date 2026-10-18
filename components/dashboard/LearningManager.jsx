"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LearningManager({ chapters }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    fetch("/api/chapters/progress")
      .then((r) => r.json())
      .then((d) => setProgress(d.progress || []));
  }, []);

  async function toggle(chapterSlug, completed) {
    setProgress((prev) => {
      const rest = (prev || []).filter((p) => p.chapterSlug !== chapterSlug);
      return [...rest, { chapterSlug, completed }];
    });
    await fetch("/api/chapters/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterSlug, completed }),
    });
  }

  const completedSlugs = new Set((progress || []).filter((p) => p.completed).map((p) => p.chapterSlug));
  const completedCount = completedSlugs.size;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Learning Progress</h1>
      <p className="mt-1 text-sm text-muted">
        {completedCount} of {chapters.length} chapters completed.
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(completedCount / chapters.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 space-y-1">
        {chapters.map((chapter) => {
          const done = completedSlugs.has(chapter.slug);
          return (
            <div
              key={chapter.slug}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(e) => toggle(chapter.slug, e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <Link
                  href={`/oauth2-servers/${chapter.slug}/`}
                  className="text-sm text-ink hover:text-accent"
                >
                  {chapter.title}
                </Link>
              </div>
              {done && <span className="text-xs font-medium text-emerald-700">Completed</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
