"use client";

import { useState } from "react";

export default function SecretReveal({ label, value }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{label} — save it now, it won't be shown again.</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="block flex-1 break-all rounded bg-white px-3 py-2 text-xs text-amber-950">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
