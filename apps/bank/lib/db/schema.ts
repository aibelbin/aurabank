/**
 * Every table the clearing house owns, and nothing another app may read.
 *
 * Kept as one statement block rather than a migration chain: there is no
 * deployed data yet. The first release that has to preserve real balances is
 * the one that earns a migration runner.
 */
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    -- The unique name someone signs in with and is named by on every case.
    handle        TEXT NOT NULL UNIQUE COLLATE NOCASE,
    -- What they are actually called. Not unique: two people may share a name.
    display_name  TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    -- 'reserve' is the bank's own account. It is not a person: it never signs
    -- in, never files, and exists so that issuing aura is still a transfer.
    role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member','judge','reserve')),
    balance       INTEGER NOT NULL DEFAULT 3000,
    -- What this account was opened with. A member opens at 3,000 and the
    -- reserve at a million, so reconciling a balance means knowing where it
    -- started rather than assuming everyone started in the same place.
    opening_balance INTEGER NOT NULL DEFAULT 3000,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    code            TEXT PRIMARY KEY,
    issued_to_email TEXT,
    issued_by       INTEGER NOT NULL REFERENCES accounts(id),
    created_at      TEXT NOT NULL,
    redeemed_by     INTEGER REFERENCES accounts(id),
    redeemed_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS cases (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    -- A claim is against a person. A citation is against the reserve: the
    -- claimant is the one owed aura either way, and only the counterparty
    -- differs, which is what lets both run through one ledger and one
    -- state machine.
    kind              TEXT NOT NULL DEFAULT 'claim' CHECK (kind IN ('claim','citation')),
    claimant_id       INTEGER NOT NULL REFERENCES accounts(id),
    respondent_id     INTEGER NOT NULL REFERENCES accounts(id),
    amount            INTEGER NOT NULL,
    statement         TEXT NOT NULL,
    status            TEXT NOT NULL
                      CHECK (status IN ('awaiting_response','under_review',
                                        'granted','dismissed','withdrawn')),
    undefended        INTEGER NOT NULL DEFAULT 0,
    filed_at          TEXT NOT NULL,
    response_deadline TEXT NOT NULL,
    ruled_at          TEXT,
    ruled_by          INTEGER REFERENCES accounts(id),
    CHECK (claimant_id <> respondent_id)
  );

  -- The hearing, in order. The case's own statement column is the filing and
  -- comes before all of these; everything after it is a remark, whoever said
  -- it. Replaces a single-reply table: a hearing is a conversation, and one
  -- row per case could not hold one.
  CREATE TABLE IF NOT EXISTS remarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id    INTEGER NOT NULL REFERENCES cases(id),
    author_id  INTEGER NOT NULL REFERENCES accounts(id),
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exhibits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id     INTEGER NOT NULL REFERENCES cases(id),
    uploaded_by INTEGER NOT NULL REFERENCES accounts(id),
    filename    TEXT NOT NULL,
    mime        TEXT NOT NULL,
    bytes       INTEGER NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases(id),
    account_id    INTEGER NOT NULL REFERENCES accounts(id),
    delta         INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    UNIQUE (case_id, account_id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  -- The docket and the admin queue both read by status; the statement and the
  -- case sheet both read by party. Without these every list is a table scan.
  CREATE INDEX IF NOT EXISTS idx_cases_status      ON cases(status, id DESC);
  CREATE INDEX IF NOT EXISTS idx_cases_claimant    ON cases(claimant_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_cases_respondent  ON cases(respondent_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ledger_account    ON ledger_entries(account_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_exhibits_case     ON exhibits(case_id, id);
  CREATE INDEX IF NOT EXISTS idx_remarks_case      ON remarks(case_id, id);
  CREATE INDEX IF NOT EXISTS idx_invites_issuer    ON invites(issued_by, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions(expires_at);
`;
