"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white"
    >
      <div className="mx-auto max-w-xl px-6 pb-12 pt-20 text-center sm:pt-24">
        <h1 className="text-[2.1rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[2.6rem]">
          o-auth 2.0 Simplified
        </h1>

        <p className="mt-3 text-[15px] text-muted">
          Written by <span className="text-ink">Aaron Parecki</span>
        </p>

        <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-ink">
          o-auth 2.0 is the modern standard for securing access to APIs.
        </p>

        <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.75] text-muted">
          This site is dedicated to explaining o-auth 2.0 in plain, practical
          terms — no legal jargon, no ambiguous diagrams. Whether you're
          building an API, a mobile app, or a single-page app, you'll find a
          clear explanation of the flow that applies to you, along with the
          reasoning behind each design decision in the spec.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/oauth2-servers/background/"
            className="inline-flex w-full items-center justify-center rounded-md border border-border px-6 py-2.5 text-sm font-medium text-ink transition hover:border-ink sm:w-auto"
          >
            Learn about o-auth 2.0
          </a>
          <Link
            href="/solve"
            className="inline-flex w-full items-center justify-center rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-dark sm:w-auto"
          >
            Solve it with Okhla
          </Link>
        </div>

        <p className="mt-7 text-sm">
          <Link
            href="/playground"
            className="font-medium text-accent hover:underline"
          >
            Learn more in the o-auth 2.0 Playground →
          </Link>
        </p>
      </div>
    </motion.section>
  );
}
