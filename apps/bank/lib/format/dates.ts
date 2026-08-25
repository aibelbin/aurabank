/**
 * Every date in the bank is printed the same way, in UTC.
 *
 * A record has one timestamp, not one per reader's timezone: two members
 * discussing the same case must be able to say "the 25th" and mean it. UTC
 * also keeps server and client markup identical, so a date never flickers.
 */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MINUTE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDay(iso: string): string {
  return DAY.format(new Date(iso));
}

const SHORT_DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/**
 * Day and month, for a register line.
 *
 * The year is dropped and then put back only when it is not the current one —
 * the way a ledger writes its dates. A full date on every line of a register
 * wraps on a phone, and wrapping costs more than the year is worth.
 */
export function formatRegisterDay(iso: string, now = new Date()): string {
  const when = new Date(iso);
  return when.getUTCFullYear() === now.getUTCFullYear()
    ? SHORT_DAY.format(when)
    : DAY.format(when);
}

export function formatMinute(iso: string): string {
  return `${MINUTE.format(new Date(iso)).replace(",", "")} UTC`;
}

/**
 * How long is left, in the coarsest unit that is still true.
 *
 * "In 3 hours" is what a respondent needs; "in 2 hours 51 minutes" is a
 * countdown, and a countdown makes a deadline feel like a game.
 */
export function timeUntil(iso: string, now = new Date()): string {
  const ms = Date.parse(iso) - now.getTime();
  if (ms <= 0) return "elapsed";

  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
