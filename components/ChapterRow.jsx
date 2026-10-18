import Link from "next/link";

export default function ChapterRow({ chapter }) {
  const label = chapter.number === null ? "—" : chapter.number;

  return (
    <Link
      href={`/oauth2-servers/${chapter.slug}/`}
      className="group flex items-baseline gap-3 py-1"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-light text-[11px] font-semibold text-accent">
        {label}
      </span>
      <span className="text-[15px] leading-snug text-ink transition-colors group-hover:text-accent">
        {chapter.title}
      </span>
    </Link>
  );
}
