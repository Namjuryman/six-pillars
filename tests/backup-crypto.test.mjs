import { expect, test } from "vitest";
import { encryptBackup, decryptBackup } from "../scripts/backup-crypto.mjs";

test("offline encrypted backup preserves UTF-8, dates, IDs and nulls", () => {
  const data = Buffer.from(
    JSON.stringify({
      id: "synthetic-id",
      notes: "仅合成数据\n'引号'",
      date: "2026-10-01",
      unlocked_at: null,
    }),
  );
  const encrypted = encryptBackup(data, "synthetic-test-passphrase");
  expect(encrypted).not.toContain("仅合成数据");
  expect(decryptBackup(encrypted, "synthetic-test-passphrase")).toEqual(data);
  expect(encryptBackup(data, "synthetic-test-passphrase")).not.toBe(encrypted);
});
test("wrong passphrase, tampering and unknown versions fail closed", () => {
  const encrypted = encryptBackup(
    Buffer.from("synthetic"),
    "synthetic-passphrase",
  );
  expect(() => decryptBackup(encrypted, "wrong-passphrase")).toThrow();
  const altered = JSON.parse(encrypted);
  const bytes = Buffer.from(altered.ciphertext, "base64");
  bytes[0] ^= 1;
  altered.ciphertext = bytes.toString("base64");
  expect(() =>
    decryptBackup(JSON.stringify(altered), "synthetic-passphrase"),
  ).toThrow();
  altered.format = "unrecognized";
  expect(() =>
    decryptBackup(JSON.stringify(altered), "synthetic-passphrase"),
  ).toThrow("Unsupported");
});
