"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ChapterRow from "./ChapterRow";
import { chapters } from "@/data/chapters";

export default function TableOfContents() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section id="toc" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Table of Contents
        </h2>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search for a topic</span>
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a Topic"
            className="w-full rounded-full border border-border bg-surface py-2 pl-8 pr-3 text-sm text-ink placeholder:text-muted/60 transition focus:border-accent focus:bg-white"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          No chapters match “{query}”.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-10 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((chapter) => (
            <ChapterRow chapter={chapter} key={chapter.slug} />
          ))}
        </div>
      )}
    </section>
  );
}
