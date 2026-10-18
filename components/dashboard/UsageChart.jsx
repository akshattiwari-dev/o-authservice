// Server-rendered (no "use client") — takes its data as a prop computed in
// the dashboard page (see getRecentTokenIssuance in services/tokenService.js),
// nothing fetched client-side.
const SAMPLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SAMPLE_VALUES = [4, 7, 3, 9, 12, 6, 8];

export default function UsageChart({ series }) {
  // series is null only when the real query threw (see the dashboard page)
  // — fall back to a clearly-labeled sample so the chart never silently
  // shows fake numbers as if they were real.
  const usingSample = !series;
  const labels = usingSample ? SAMPLE_DAYS : series.map((d) => d.label);
  const values = usingSample ? SAMPLE_VALUES : series.map((d) => d.count);
  const max = Math.max(1, ...values);
  const allZero = !usingSample && values.every((v) => v === 0);

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Token issuance (last 7 days)</h2>
        {usingSample && <span className="text-[11px] text-muted">Sample data</span>}
      </div>

      {allZero ? (
        <p className="mt-5 text-sm text-muted">No tokens issued in the last 7 days.</p>
      ) : (
        <div className="mt-5 flex h-32 items-end gap-3">
          {values.map((value, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t bg-accent-light transition-all hover:bg-accent"
                style={{ height: `${(value / max) * 100}%` }}
                title={`${value} token${value === 1 ? "" : "s"}`}
              />
              <span className="text-[10px] text-muted">{labels[i]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
