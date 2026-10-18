import crypto from "crypto";

/**
 * Verify a PKCE code_verifier against the code_challenge stored at
 * authorization time.
 *
 * Per this platform's hardened policy, "plain" is REJECTED — RFC 7636
 * allows it, but it provides no protection against authorization code
 * interception (the "challenge" and the secret verifier are the same
 * string), so it's disabled outright rather than merely discouraged.
 * Only S256 is accepted.
 */
export function verifyPkce({ codeVerifier, codeChallenge, codeChallengeMethod }) {
  if (!codeChallenge) {
    // No PKCE was used on this authorization request at all.
    return !codeVerifier;
  }
  if (!codeVerifier) return false;

  if (codeChallengeMethod !== "S256") {
    // Covers "plain" and any unrecognized method — both rejected.
    return false;
  }

  const computed = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return timingSafeEqual(computed, codeChallenge);
}

/** True if the method is one this server will ever accept at the authorize endpoint. */
export function isAllowedChallengeMethod(method) {
  return method === "S256";
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Generate a code_verifier + S256 code_challenge pair, for the Playground's own demo flow. */
export function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

