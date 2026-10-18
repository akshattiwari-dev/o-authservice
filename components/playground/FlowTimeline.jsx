"use client";

const STEPS = [
  { n: 1, label: "Authorization Request" },
  { n: 2, label: "Consent" },
  { n: 3, label: "Code Issued" },
  { n: 4, label: "Token Exchange" },
  { n: 5, label: "Access Token" },
  { n: 6, label: "UserInfo" },
];

export default function FlowTimeline({ events }) {
  const reachedSteps = new Set(events.map((e) => e.step));
  const hasError = (n) => events.some((e) => e.step === n && e.status === "error");
  const maxReached = events.length > 0 ? Math.max(...events.map((e) => e.step)) : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((step, i) => {
        const reached = reachedSteps.has(step.n);
        const errored = hasError(step.n);
        const active = step.n === maxReached && reached;

        return (
          <div key={step.n} className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                errored
                  ? "border-red-300 bg-red-50 text-red-700"
                  : reached
                  ? active
                    ? "border-accent bg-accent-light text-accent"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-border bg-white text-muted"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                  errored
                    ? "bg-red-500 text-white"
                    : reached
                    ? "bg-emerald-500 text-white"
                    : "bg-border text-muted"
                }`}
              >
                {reached && !errored ? "✓" : step.n}
              </span>
              {step.label}
            </div>
            {i < STEPS.length - 1 && <span className="text-border">→</span>}
          </div>
        );
      })}
    </div>
  );
}
