import Link from "next/link";

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <span className="font-serif text-base">o</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>

        <div className="rounded-lg border border-border bg-white p-6 shadow-soft">{children}</div>

        {footer ? <p className="mt-6 text-center text-sm text-muted">{footer}</p> : null}
      </div>
    </main>
  );
}
