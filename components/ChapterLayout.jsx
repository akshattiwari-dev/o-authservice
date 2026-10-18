import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Header from "./Header";
import FooterCTA from "./FooterCTA";
import ChapterContent from "./ChapterContent";
import ChapterNotes from "./ChapterNotes";
import { getAdjacentChapters } from "@/data/chapters";

export default function ChapterLayout({ chapter }) {
  const { previous, next } = getAdjacentChapters(chapter.slug);
  const label = chapter.number === null ? "—" : chapter.number;

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div style={{ paddingTop: "var(--header-height)" }}>
        <article className="mx-auto max-w-article px-6 pb-8 pt-16">
          <Link
            href="/#toc"
            className="text-sm text-muted transition hover:text-accent"
          >
            ← Table of Contents
          </Link>

          <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent-light text-3xl font-extrabold text-accent ring-4 ring-accent-light/50">
              {label}
            </span>
            <h1 className="text-[1.9rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[2.25rem]">
              {chapter.title}
            </h1>
          </div>

          <div className="prose-article mt-12">
            <ChapterContent blocks={chapter.content} />
          </div>
        </article>

        <ChapterNotes chapterSlug={chapter.slug} />

        <nav className="mx-auto max-w-article px-6 py-10">
          <div className="flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {previous ? (
                <Link
                  href={`/oauth2-servers/${previous.slug}/`}
                  className="group inline-flex items-start gap-2"
                >
                  <ArrowLeft
                    size={15}
                    className="mt-0.5 shrink-0 text-muted transition group-hover:text-accent"
                  />
                  <span>
                    <span className="block text-xs text-muted">
                      Previous Chapter
                    </span>
                    <span className="mt-0.5 block text-[15px] font-medium text-accent group-hover:underline">
                      {previous.title}
                    </span>
                  </span>
                </Link>
              ) : null}
            </div>

            <div className="sm:text-right">
              {next ? (
                <Link
                  href={`/oauth2-servers/${next.slug}/`}
                  className="group inline-flex items-start gap-2 sm:flex-row-reverse"
                >
                  <ArrowRight
                    size={15}
                    className="mt-0.5 shrink-0 text-muted transition group-hover:text-accent"
                  />
                  <span>
                    <span className="block text-xs text-muted">
                      Next Chapter
                    </span>
                    <span className="mt-0.5 block text-[15px] font-medium text-accent group-hover:underline">
                      {next.title}
                    </span>
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </nav>

        <FooterCTA />
      </div>
    </main>
  );
}
