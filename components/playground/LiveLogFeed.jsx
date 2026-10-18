"use client";

import { useState } from "react";

const STATUS_STYLES = {
  info: "border-border bg-white",
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
};

const STATUS_DOT = {
  info: "bg-accent",
  success: "bg-emerald-500",
  error: "bg-red-500",
};

export default function LiveLogFeed({ events }) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
        Live request/response logs will appear here once you start a flow.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div
          key={i}
          className={`rounded-lg border p-4 ${STATUS_STYLES[event.status] || STATUS_STYLES.info}`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[event.status] || STATUS_DOT.info}`} />
            <p className="text-sm font-semibold text-ink">
              Step {event.step}: {event.title}
            </p>
            <span className="ml-auto text-[11px] text-muted">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {event.detail && <p className="mt-1.5 text-xs text-muted">{event.detail}</p>}
          {event.request && <PayloadBlock label="Request" data={event.request} />}
          {event.response && <PayloadBlock label="Response" data={event.response} />}
          {event.curl && <CurlBlock curl={event.curl} />}
        </div>
      ))}
    </div>
  );
}

function PayloadBlock({ label, data }) {
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded bg-ink/[0.04] p-2 font-mono text-[11px] leading-relaxed text-ink">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function CurlBlock({ curl }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">cURL</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(curl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-[10px] font-medium text-accent hover:underline"
        >
          {copied ? "Copied" : "Copy as cURL"}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded bg-ink text-white p-2 font-mono text-[11px] leading-relaxed">
        {curl}
      </pre>
    </div>
  );
}
