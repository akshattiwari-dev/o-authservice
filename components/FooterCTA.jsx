import Link from "next/link";

export default function FooterCTA() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Want to implement o-auth 2.0 without the hassle?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-[1.75] text-muted">
          We've built API access management as a service that is secure,
          scalable, and always on, so you can ship a more secure product,
          faster.
        </p>
        <Link
          href="/solve"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-accent px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white"
        >
          Secure your APIs
        </Link>

        <p className="mt-8 text-sm text-muted">
          o-auth is brought to you by the team at{" "}
          <Link
            href="/solve"
            className="inline-flex items-center gap-1 font-semibold text-ink hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="8" r="2.5" fill="currentColor" />
            </svg>
            Okhla
          </Link>
        </p>
      </div>
    </section>
  );
}
