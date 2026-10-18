"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DeleteAccountForm() {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitting(false);
        setError(data.message || "Could not delete your account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-medium text-muted">
        Type <span className="font-mono font-semibold text-ink">DELETE</span> to confirm
      </label>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 w-full max-w-xs rounded-md border border-border px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
      />

      {error ? (
        <p role="alert" aria-live="polite" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        onClick={handleDelete}
        disabled={confirmText !== "DELETE" || submitting}
        className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Deleting…" : "Delete my account"}
      </button>
    </div>
  );
}
