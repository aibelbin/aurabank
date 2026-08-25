import { randomInt } from "node:crypto";

/**
 * Crockford's alphabet: no I, L, O or U.
 *
 * These codes are read off a screen and typed into a phone, often from a
 * message someone forwarded. Dropping the characters that look like each other
 * removes the support conversation about whether that was a one or an ell.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 8;

/** Eight characters of 32 is forty bits — unguessable, and single use besides. */
export function newInviteCode(): string {
  const characters = Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}

/**
 * The canonical form of whatever someone typed.
 *
 * Case, spaces and hyphens are all noise; a code pasted from a message may
 * carry any of them. Stored and compared in this form only, so there is one
 * spelling of a code in the database.
 */
export function normaliseCode(input: string): string {
  const stripped = [...input.toUpperCase()].filter((character) => ALPHABET.includes(character));
  if (stripped.length !== LENGTH) return "";
  return `${stripped.slice(0, 4).join("")}-${stripped.slice(4).join("")}`;
}
