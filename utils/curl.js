/**
 * Builds a cURL command string for display/copy in the Playground.
 * Secrets already redacted by the caller (see redactSecrets in the token
 * route) are shown as-is here — this function just formats whatever it's
 * given, it doesn't decide what's safe to show.
 */
export function buildCurl({ method = "POST", url, headers = {}, form = null, json = null }) {
  const parts = [`curl -X ${method} '${url}'`];

  for (const [key, value] of Object.entries(headers)) {
    parts.push(`  -H '${key}: ${value}'`);
  }

  if (form) {
    const body = new URLSearchParams(form).toString();
    if (!headers["Content-Type"]) {
      parts.push(`  -H 'Content-Type: application/x-www-form-urlencoded'`);
    }
    parts.push(`  -d '${body}'`);
  } else if (json) {
    if (!headers["Content-Type"]) {
      parts.push(`  -H 'Content-Type: application/json'`);
    }
    parts.push(`  -d '${JSON.stringify(json)}'`);
  }

  return parts.join(" \\\n");
}
