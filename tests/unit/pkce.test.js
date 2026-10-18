import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyPkce, isAllowedChallengeMethod, generatePkcePair } from "@/oauth/pkce";

function s256(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

describe("oauth/pkce", () => {
  it("verifies a correct S256 code_verifier against its code_challenge", () => {
    const codeVerifier = "a".repeat(64);
    const codeChallenge = s256(codeVerifier);

    const ok = verifyPkce({ codeVerifier, codeChallenge, codeChallengeMethod: "S256" });
    expect(ok).toBe(true);
  });

  it("rejects a code_verifier that doesn't match the stored challenge", () => {
    const codeChallenge = s256("a".repeat(64));
    const ok = verifyPkce({ codeVerifier: "b".repeat(64), codeChallenge, codeChallengeMethod: "S256" });
    expect(ok).toBe(false);
  });

  it("rejects the plain method outright, even with a matching verifier", () => {
    // "plain" means challenge === verifier, which would trivially match if
    // this server accepted it — it must not.
    const codeVerifier = "a".repeat(64);
    const ok = verifyPkce({ codeVerifier, codeChallenge: codeVerifier, codeChallengeMethod: "plain" });
    expect(ok).toBe(false);
  });

  it("rejects unrecognized challenge methods", () => {
    const codeVerifier = "a".repeat(64);
    const codeChallenge = s256(codeVerifier);
    const ok = verifyPkce({ codeVerifier, codeChallenge, codeChallengeMethod: "S1" });
    expect(ok).toBe(false);
  });

  it("treats no challenge + no verifier as valid (PKCE wasn't used)", () => {
    expect(verifyPkce({ codeVerifier: undefined, codeChallenge: null, codeChallengeMethod: null })).toBe(true);
  });

  it("rejects a verifier presented when no challenge was ever stored", () => {
    expect(
      verifyPkce({ codeVerifier: "a".repeat(64), codeChallenge: null, codeChallengeMethod: null })
    ).toBe(false);
  });

  it("isAllowedChallengeMethod only allows S256", () => {
    expect(isAllowedChallengeMethod("S256")).toBe(true);
    expect(isAllowedChallengeMethod("plain")).toBe(false);
    expect(isAllowedChallengeMethod(undefined)).toBe(false);
  });

  it("generatePkcePair produces a verifier/challenge pair that verifies", () => {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePkcePair();
    expect(codeChallengeMethod).toBe("S256");
    expect(verifyPkce({ codeVerifier, codeChallenge, codeChallengeMethod })).toBe(true);
  });
});
