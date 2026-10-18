import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

/** Hash a user password or OAuth client secret for storage. */
export async function hashSecret(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Compare a plaintext value against a bcrypt hash. */
export async function verifySecret(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * SHA-256 hash for high-volume, non-password secrets (authorization codes,
 * refresh tokens, API keys). These are already high-entropy random values,
 * not human-guessable passwords, so a fast cryptographic hash is the right
 * tool — bcrypt's deliberate slowness would just add latency here without
 * adding real security for a 256-bit random input.
 */
export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Cryptographically random URL-safe token, `bytes` of entropy. */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Short random ID suitable for client-facing identifiers (not secret). */
export function randomId(bytes = 12) {
  return crypto.randomBytes(bytes).toString("hex");
}
