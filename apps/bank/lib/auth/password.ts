import {
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt from `node:crypto`: no dependency, no native module, nothing to keep
 * patched. N is the work factor and the only knob worth tuning; 2^15 costs
 * roughly a tenth of a second here, which is invisible on a sign-in and
 * expensive in bulk. maxmem has to be raised with it — Node's default ceiling
 * is exactly the memory this N asks for.
 */
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Encoded as `scrypt:N:r:p:salt:hash`.
 *
 * The parameters travel with the hash rather than living in this file alone,
 * so raising the work factor later still verifies every password stored under
 * the old one. A bare `salt:hash` would make that a migration.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

/**
 * The same encoding, derived synchronously.
 *
 * Only for opening the judge's account as the database is created, which
 * happens before there is a request to be async inside of.
 */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join(":");
}

/**
 * A fixed salt, used only to spend the same time on a handle that does not
 * exist as on one that does. Without it, sign-in answers "is this handle
 * real?" in a tenth of a second, and the shared error message means nothing.
 */
const DECOY_SALT = randomBytes(SALT_LENGTH);

export async function burnVerifyTime(password: string): Promise<void> {
  await scrypt(password, DECOY_SALT, KEY_LENGTH, PARAMS);
}

/** Constant-time comparison. Returns false on anything malformed. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltPart, hashPart] = parts;
  const N = Number(n);
  const rounds = Number(r);
  const parallelism = Number(p);
  if (!Number.isInteger(N) || !Number.isInteger(rounds) || !Number.isInteger(parallelism)) {
    return false;
  }

  const salt = Buffer.from(saltPart, "base64url");
  const expected = Buffer.from(hashPart, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, expected.length, {
      N,
      r: rounds,
      p: parallelism,
      maxmem: PARAMS.maxmem,
    });
  } catch {
    // Absurd stored parameters would otherwise throw out of a sign-in handler.
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
