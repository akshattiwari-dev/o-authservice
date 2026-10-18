"use client";

/**
 * Shared error + retry UI for dashboard/admin managers that fetch on
 * mount. aria-live so screen readers announce the failure without the
 * page needing focus to move.
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
    >
      <p className="text-sm text-red-700">{message || "Something went wrong loading this."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-300 bg-white px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
