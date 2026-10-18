"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

export default function Header() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 48);
  });

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-black text-white"
      style={{ height: "var(--header-height)" }}
    >
      <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center px-4 sm:px-6">
        {/* Sponsor lockup, left */}
        <div className="absolute left-4 flex items-center gap-2 sm:left-6">
          <span className="text-[11px] leading-none tracking-wide text-white/50">
            Sponsored by
          </span>
          <Link
            href="/solve"
            className="flex items-center gap-1.5 transition hover:opacity-80"
            aria-label="Okhla, sponsor of o-auth"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.4" />
              <circle cx="8" cy="8" r="2.5" fill="white" />
            </svg>
            <span className="text-[13px] font-semibold tracking-tight text-white">
              Okhla
            </span>
          </Link>
        </div>

        {/* Center logomark — premium seal, shrinks smoothly on scroll, stays centered/sticky */}
        <Link
          href="/"
          aria-label="o-auth 2.0 Simplified home"
          className="flex items-center justify-center"
        >
          <motion.svg
            viewBox="0 0 44 44"
            aria-hidden="true"
            animate={{
              width: scrolled ? 32 : 64,
              height: scrolled ? 32 : 64,
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.7 }}
          >
            <defs>
              <radialGradient id="sealDepth" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>

            {/* outer edge */}
            <circle cx="22" cy="22" r="21" fill="url(#sealDepth)" stroke="white" strokeWidth="1" />

            {/* tick-mark ring, like a coin/seal edge */}
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i / 32) * Math.PI * 2;
              const inner = 18.5;
              const outer = 20;
              const x1 = 22 + inner * Math.cos(angle);
              const y1 = 22 + inner * Math.sin(angle);
              const x2 = 22 + outer * Math.cos(angle);
              const y2 = 22 + outer * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeWidth="0.6"
                  opacity="0.55"
                />
              );
            })}

            {/* inner ring */}
            <circle cx="22" cy="22" r="15.5" fill="none" stroke="white" strokeWidth="0.75" opacity="0.6" />

            {/* letterform */}
            <text
              x="22"
              y="28.5"
              textAnchor="middle"
              fontSize="16"
              fontWeight="600"
              fill="white"
              fontFamily="Georgia, 'Times New Roman', serif"
              letterSpacing="0.5"
            >
              o
            </text>

            {/* small accent mark below, seal-like flourish */}
            <circle cx="22" cy="33.5" r="0.9" fill="white" opacity="0.8" />
          </motion.svg>
        </Link>
      </div>
    </header>
  );
}
