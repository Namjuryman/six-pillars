import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

// Versioned offline backup envelope; passphrases never appear in command arguments.
export function encryptBackup(plain, passphrase) {
  const salt = randomBytes(16),
    iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  key.fill(0);
  return JSON.stringify({
    format: "six-pillars-encrypted-v1",
    kdf: "scrypt-N16384-r8-p1",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
}

export function decryptBackup(envelope, passphrase) {
  const value = JSON.parse(envelope);
  if (
    value.format !== "six-pillars-encrypted-v1" ||
    value.kdf !== "scrypt-N16384-r8-p1"
  )
    throw new Error("Unsupported backup format");
  const salt = Buffer.from(value.salt, "base64"),
    iv = Buffer.from(value.iv, "base64"),
    tag = Buffer.from(value.tag, "base64");
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid backup envelope");
  const key = scryptSync(passphrase, salt, 32);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]);
  } finally {
    key.fill(0);
  }
}
