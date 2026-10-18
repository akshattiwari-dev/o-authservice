// Shared test setup — generates an ephemeral signing keypair and sane
// defaults so `npm test` works without requiring a full .env, as long as
// DATABASE_URL points at a reachable Postgres (see README "Testing").
import { generateKeyPairSync } from "crypto";

if (!process.env.OAUTH_PRIVATE_KEY || !process.env.OAUTH_PUBLIC_KEY) {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.OAUTH_PRIVATE_KEY = privateKey;
  process.env.OAUTH_PUBLIC_KEY = publicKey;
}

process.env.ACCESS_TOKEN_TTL ||= "900";
process.env.REFRESH_TOKEN_TTL ||= "2592000";
process.env.AUTHORIZATION_CODE_TTL ||= "120";
process.env.NEXTAUTH_SECRET ||= "test-secret-not-for-production";
process.env.NEXTAUTH_URL ||= "http://localhost:3000";

// B4: registers jest-dom's matchers (toBeInTheDocument, etc.) on vitest's
// expect. Safe to import unconditionally — it only extends the matcher
// table at import time, it doesn't touch the DOM, so node-environment
// tests that never use these matchers are unaffected.
import "@testing-library/jest-dom/vitest";

// B4: with `test.globals: false`, @testing-library/react's automatic
// afterEach-cleanup never registers (it feature-detects a global
// `afterEach`, which isn't there), so unmounted trees from a previous
// component test would otherwise leak into the next one and produce
// "multiple elements found" failures. Importing afterEach explicitly here
// and guarding on `document` keeps this a no-op for the Postgres-backed
// node-environment tests, which have no DOM to clean up.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
