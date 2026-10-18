function base64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return base64url(bytes.buffer);
}

/** Generates a code_verifier + S256 code_challenge pair entirely in the browser. */
export async function generatePkcePairBrowser() {
  const codeVerifier = randomVerifier();
  const encoder = new TextEncoder();
  const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
  const codeChallenge = base64url(digest);
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

export function randomState() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return base64url(bytes.buffer);
}
