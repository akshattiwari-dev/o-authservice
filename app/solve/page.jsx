import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export const metadata = {
  title: "Solve it with Okhla — o-auth 2.0 Simplified",
  description:
    "Choose what works best for your team. Okhla and Nexus Platform sign-up is free.",
};

const cards = [
  {
    eyebrow: "FREE",
    eyebrowNote: "For the first tier",
    badge: "BEST FOR DEVELOPERS",
    badgeClass: "bg-emerald-200 text-emerald-950",
    name: "Nexus Platform",
    heading: "Secure my customers or SaaS applications",
    description:
      "Build intuitive, secure user experiences in customer-facing applications.",
    cta: "Try Nexus Platform →",
    ctaHref: "/signup?plan=nexus",
    ctaStyle: "solid",
  },
  {
    eyebrow: "FREE TRIAL",
    eyebrowNote: "Get access for 30 days",
    badge: "BEST FOR IT ADMINS",
    badgeClass: "bg-violet-200 text-violet-950",
    name: "Okhla Platform",
    heading: "Secure my employees, contractors, & partners",
    description:
      "Manage secure, frictionless access to the tools and data your teams need, on demand.",
    cta: "Try Okhla Platform →",
    ctaHref: "/signup?plan=okhla",
    ctaStyle: "outline",
    featured: true,
  },
  {
    eyebrow: "FREE",
    eyebrowNote: "Build, test, and manage integrations",
    badge: "BEST FOR DEVELOPERS",
    badgeClass: "bg-emerald-200 text-emerald-950",
    name: "Integrator Plan",
    heading: "Access the Okhla Integrator Free Plan",
    description:
      "Test your code and apps, as well as manage and automate Okhla for employees and partners.",
    cta: "Sign up for Integrator Free Plan →",
    ctaHref: "/signup?plan=integrator",
    ctaStyle: "outline",
  },
];

function DarkNav() {
  return (
    <header className="border-b border-white/10 bg-[#0B0D12]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-9">
          <Link href="/" className="text-[15px] font-semibold text-white">
            Okhla Developer
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/60 lg:flex">
            <span className="cursor-default transition hover:text-white">
              Community
            </span>
            <span className="cursor-default transition hover:text-white">
              Blog
            </span>
            <span className="cursor-default transition hover:text-white">
              Pricing
            </span>
          </div>
        </div>

        <div className="hidden max-w-xs flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 lg:flex">
          <Search size={14} className="text-white/40" />
          <span className="text-sm text-white/40">Search our content…</span>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden text-sm text-white/60 transition hover:text-white md:inline">
            Okhla Docs
          </span>
          <Link
            href="/signin"
            className="hidden text-sm text-white/60 transition hover:text-white md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function PlanCard({ card }) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-6 sm:p-7 ${
        card.featured
          ? "border-white/20 bg-[#12151C] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
          : "border-white/10 bg-[#0F1116]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-white/50">
          {card.eyebrow}
        </p>
      </div>
      <p className="mt-1 text-sm text-white/40">{card.eyebrowNote}</p>

      <h3 className="mt-5 text-[15px] font-semibold text-white/60">
        {card.name}
      </h3>

      <div className="mt-3">
        <span
          className={`inline-block rounded px-2.5 py-1 text-[11px] font-bold tracking-wide ${card.badgeClass}`}
        >
          {card.badge}
        </span>
      </div>

      <h2 className="mt-4 text-[1.4rem] font-bold leading-snug text-white">
        {card.heading}
      </h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-white/55">
        {card.description}
      </p>

      <div className="mt-7 pt-1">
        <Link
          href={card.ctaHref}
          className={
            card.ctaStyle === "solid"
              ? "flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
              : "flex items-center justify-center rounded-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/60"
          }
        >
          {card.cta}
        </Link>
      </div>
    </div>
  );
}

function DarkFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0D12]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-semibold text-white">Okhla Developer</p>
          <p className="mt-6 text-sm text-white/50">
            Questions? Ask us in the{" "}
            <Link href="/playground" className="underline decoration-white/30 hover:decoration-white">
              o-auth Playground
            </Link>
            .
          </p>
          <div className="mt-6 flex items-center gap-4 text-white/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.5 22H1.4l8.1-9.3L1 2h7l4.9 6.1L18.9 2Zm-1.2 18.2h1.7L6.4 3.7H4.6L17.7 20.2Z" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="4" />
              <path d="M10 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/70">Contact & Legal</p>
          <ul className="mt-5 space-y-3 text-sm text-white/50">
            <li>
              <a href="mailto:hello@okhla.example" className="hover:text-white">
                Contact our team
              </a>
            </li>
            <li>
              <a href="mailto:sales@okhla.example" className="hover:text-white">
                Contact sales
              </a>
            </li>
            <li className="text-white/30">Integrator Free Plan terms</li>
            <li className="text-white/30">Site terms</li>
            <li className="text-white/30">Privacy policy</li>
            <li className="text-white/30">Copyright &amp; trademarks</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/70">More information</p>
          <ul className="mt-5 space-y-3 text-sm text-white/50">
            <li>
              <Link href="/solve" className="hover:text-white">
                Integrate with Okhla
              </Link>
            </li>
            <li className="text-white/30">Pricing</li>
            <li className="text-white/30">3rd-party notes</li>
            <li>
              <Link href="/solve" className="hover:text-white">
                Nexus Platform
              </Link>
            </li>
            <li className="text-white/30">Archive</li>
          </ul>
        </div>

        <div className="space-y-6">
          <div>
            <Link href="/" className="text-sm font-semibold text-white hover:underline">
              Okhla.com ›
            </Link>
            <p className="mt-1 text-sm text-white/50">Products, case studies, and resources</p>
          </div>
          <div>
            <Link href="/playground" className="text-sm font-semibold text-white hover:underline">
              Support Center ›
            </Link>
            <p className="mt-1 text-sm text-white/50">Knowledgebase, roadmaps, and more</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/40">Okhla trust ›</p>
            <p className="mt-1 text-sm text-white/50">System status, security, and compliance</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/40">
        Copyright © {new Date().getFullYear()} Okhla. All rights reserved.
      </div>
    </footer>
  );
}

export default function SolvePage() {
  return (
    <main className="min-h-screen bg-[#0B0D12]">
      <DarkNav />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14">
        <h1 className="text-[2.1rem] font-bold leading-tight text-white sm:text-[2.5rem]">
          Choose what works best.{" "}
          <span className="text-emerald-300">Sign up is free.</span>
        </h1>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <PlanCard card={card} key={card.name} />
          ))}
        </div>

        <p className="mt-10 text-center text-[15px] text-white/50">
          Not sure what to choose?{" "}
          <span className="font-semibold text-white">Okhla Platform</span> is
          built for teams; <span className="font-semibold text-white">Nexus Platform</span>{" "}
          is built for customer-facing apps.
        </p>

        <div className="mt-16 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowRight size={14} className="rotate-180" />
            Back to o-auth 2.0 Simplified
          </Link>
        </div>
      </section>

      <DarkFooter />
    </main>
  );
}
