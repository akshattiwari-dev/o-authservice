/**
 * CI helper: if OAUTH_PRIVATE_KEY/OAUTH_PUBLIC_KEY aren't already supplied
 * (e.g. via repo secrets), generate a throwaway RSA keypair for the CI run
 * only and append it to $GITHUB_ENV so later steps in the same job see it.
 * Never use this for anything other than a CI test run.
 */
const { generateKeyPairSync } = require("crypto");
const fs = require("fs");

if (process.env.OAUTH_PRIVATE_KEY && process.env.OAUTH_PUBLIC_KEY) {
  console.log("OAUTH_PRIVATE_KEY/OAUTH_PUBLIC_KEY already set — skipping generation.");
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const escape = (pem) => pem.trim().replace(/\n/g, "\\n");

const githubEnv = process.env.GITHUB_ENV;
if (githubEnv) {
  fs.appendFileSync(githubEnv, `OAUTH_PRIVATE_KEY=${escape(privateKey)}\n`);
  fs.appendFileSync(githubEnv, `OAUTH_PUBLIC_KEY=${escape(publicKey)}\n`);
  console.log("Generated CI-only test signing keys and wrote them to GITHUB_ENV.");
} else {
  // Local invocation outside GitHub Actions — just print them.
  console.log(`OAUTH_PRIVATE_KEY="${escape(privateKey)}"`);
  console.log(`OAUTH_PUBLIC_KEY="${escape(publicKey)}"`);
}
