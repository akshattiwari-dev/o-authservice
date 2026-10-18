/**
 * Generates an RSA keypair for signing o-auth access tokens (RS256).
 *
 * Run once: `npm run keys:generate`
 * Copy the two printed lines into your .env file as OAUTH_PRIVATE_KEY and
 * OAUTH_PUBLIC_KEY. Re-running this rotates the key — any previously issued
 * access tokens will fail verification, so bump OAUTH_KEY_ID when you do.
 */
const { generateKeyPairSync } = require("crypto");

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function toEnvLine(name, pem) {
  return `${name}="${pem.trim().replace(/\n/g, "\\n")}"`;
}

console.log("\n# Paste these into your .env file:\n");
console.log(toEnvLine("OAUTH_PRIVATE_KEY", privateKey));
console.log(toEnvLine("OAUTH_PUBLIC_KEY", publicKey));
console.log("");
