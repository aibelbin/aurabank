/**
 * The fee schedule. Fixed tiers, not free entry.
 *
 * A claimant who can name any number turns every hearing into an argument
 * about the number. Four tiers make claims comparable to each other and reduce
 * a ruling to the only question worth asking: did this happen, or not.
 *
 * One constant, so the amounts can be tuned without a migration.
 */
export const AMOUNT_SCHEDULE = [
  { amount: 100, classification: "Minor" },
  { amount: 250, classification: "Material" },
  { amount: 500, classification: "Severe" },
  { amount: 1000, classification: "Catastrophic" },
] as const;

export type ScheduledAmount = (typeof AMOUNT_SCHEDULE)[number]["amount"];

export function isScheduledAmount(value: number): value is ScheduledAmount {
  return AMOUNT_SCHEDULE.some((tier) => tier.amount === value);
}

export function classify(amount: number): string {
  return AMOUNT_SCHEDULE.find((tier) => tier.amount === amount)?.classification ?? "Unclassified";
}

/** Against a 3,000 opening balance, the top tier is a third of everything you have. */
export const OPENING_BALANCE = 3000;

/** How long a respondent has to reply before the case may be heard without them. */
export const RESPONSE_WINDOW_HOURS = 24;

export function responseDeadline(filedAt: Date): string {
  return new Date(filedAt.getTime() + RESPONSE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * What the bank pays out for a sigma moment, from its own reserve.
 *
 * A separate schedule from the fee one, because being owed by a person and
 * being commended by the bank are not the same act and should not read as
 * though they were. Smaller at the top, too: the bank rewards, it does not
 * ruin.
 */
export const CITATION_SCHEDULE = [
  { amount: 100, classification: "Noted" },
  { amount: 250, classification: "Commended" },
  { amount: 500, classification: "Distinguished" },
] as const;

export function isCitationAmount(value: number): boolean {
  return CITATION_SCHEDULE.some((tier) => tier.amount === value);
}

export function classifyCitation(amount: number): string {
  return CITATION_SCHEDULE.find((tier) => tier.amount === amount)?.classification ?? "Unclassified";
}

/** What the bank's own account opens with. Every award comes out of this. */
export const RESERVE_OPENING_BALANCE = 1_000_000;

/** The handle the bank holds its reserve under. Never a person. */
export const RESERVE_HANDLE = "aurabank";
