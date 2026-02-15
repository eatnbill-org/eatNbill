/**
 * AES-256-GCM Encryption for Integration Secrets
 *
 * Uses a master key from environment to encrypt/decrypt
 * webhook secrets stored in the database.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "../env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypts plaintext using AES-256-GCM
 * @param plaintext - The secret to encrypt
 * @returns Object containing ciphertext and iv (both base64 encoded)
 */
export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const masterKey = getMasterKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Append auth tag to ciphertext
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]);

  return {
    ciphertext: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param ciphertext - Base64 encoded ciphertext with auth tag
 * @param iv - Base64 encoded initialization vector
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (tampered or wrong key)
 */
export function decrypt(ciphertext: string, iv: string): string {
  const masterKey = getMasterKey();
  const ivBuffer = Buffer.from(iv, "base64");
  const combined = Buffer.from(ciphertext, "base64");

  // Extract auth tag from end of ciphertext
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(0, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, masterKey, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Gets the master key from environment, validating it's 32 bytes
 */
function getMasterKey(): Buffer {
  const keyHex = env.INTEGRATION_SECRET_MASTER_KEY;

  if (!keyHex) {
    throw new Error(
      "INTEGRATION_SECRET_MASTER_KEY is not set. Generate with: openssl rand -hex 32"
    );
  }

  const keyBuffer = Buffer.from(keyHex, "hex");

  if (keyBuffer.length !== 32) {
    throw new Error(
      "INTEGRATION_SECRET_MASTER_KEY must be 32 bytes (64 hex characters)"
    );
  }

  return keyBuffer;
}

/**
 * Generates a random webhook secret
 * @returns 32 character hex string
 */
export function generateWebhookSecret(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Computes HMAC-SHA256 for webhook signature verification
 */
export function computeHmac(secret: string, payload: string): string {
  const { createHmac } = require("crypto");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Timing-safe comparison for signature verification
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: tse } = require("crypto");
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return tse(bufA, bufB);
}
