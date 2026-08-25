/** Shapes the database hands back. Column names are kept as SQLite spells them. */

export type Role = "member" | "judge" | "reserve";

/**
 * A claim is against a person; a citation is against the bank's reserve.
 * The claimant is the one owed aura either way.
 */
export type CaseKind = "claim" | "citation";

export type CaseStatus =
  | "awaiting_response"
  | "under_review"
  | "granted"
  | "dismissed"
  | "withdrawn";

export type AccountRow = {
  id: number;
  handle: string;
  display_name: string;
  email: string;
  password_hash: string;
  role: Role;
  balance: number;
  opening_balance: number;
  created_at: string;
};

/** An account as another member may see it. No email, no hash. */
export type Member = {
  id: number;
  handle: string;
  display_name: string;
  role: Role;
  balance: number;
};

export type InviteRow = {
  code: string;
  issued_to_email: string | null;
  issued_by: number;
  created_at: string;
  redeemed_by: number | null;
  redeemed_at: string | null;
};

export type InviteListing = InviteRow & { redeemed_by_handle: string | null };

export type CaseRow = {
  id: number;
  kind: CaseKind;
  claimant_id: number;
  respondent_id: number;
  amount: number;
  statement: string;
  status: CaseStatus;
  undefended: number;
  filed_at: string;
  response_deadline: string;
  ruled_at: string | null;
  ruled_by: number | null;
};

/** A case with both parties named, which is how every screen shows one. */
export type CaseListing = CaseRow & {
  claimant_handle: string;
  claimant_name: string;
  respondent_handle: string;
  respondent_name: string;
  respondent_role: Role;
  ruled_by_handle: string | null;
};

/** One turn in a hearing. The filing itself is not a remark; it precedes them. */
export type RemarkRow = {
  id: number;
  case_id: number;
  author_id: number;
  body: string;
  created_at: string;
};

export type RemarkListing = RemarkRow & {
  author_handle: string;
  author_name: string;
  author_role: Role;
};

export type ExhibitRow = {
  id: number;
  case_id: number;
  uploaded_by: number;
  filename: string;
  mime: string;
  bytes: number;
  created_at: string;
};

export type LedgerRow = {
  id: number;
  case_id: number;
  account_id: number;
  delta: number;
  balance_after: number;
  created_at: string;
};

/** A ledger entry dressed for the statement: who it was against, and why. */
export type Movement = LedgerRow & {
  counterparty_handle: string;
  case_amount: number;
};
