"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms) {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function ExpiryCountdown({ expiresAt }) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  const expired = remaining <= 0;

  return (
    <span className={expired ? "text-muted" : "text-ink"}>
      {expired ? "Expired" : `Expires in ${formatRemaining(remaining)}`}
    </span>
  );
}
