import { notFound } from "next/navigation";
import ChapterLayout from "@/components/ChapterLayout";
import { chapters, getChapterBySlug } from "@/data/chapters";

export function generateStaticParams() {
  return chapters.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const chapter = getChapterBySlug(params.slug);
  if (!chapter) return {};

  const title = `${chapter.title} — o-auth 2.0 Simplified`;
  return {
    title,
    description: chapter.description,
    openGraph: {
      title,
      description: chapter.description,
      type: "article",
      url: `/oauth2-servers/${chapter.slug}/`,
    },
    twitter: {
      card: "summary",
      title,
      description: chapter.description,
    },
  };
}

export default function ChapterPage({ params }) {
  const chapter = getChapterBySlug(params.slug);
  if (!chapter) notFound();

  return <ChapterLayout chapter={chapter} />;
}
