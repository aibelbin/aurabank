/**
 * Periodic, verified snapshots of the ledger — and of the exhibits with it.
 *
 * Runs as a sidecar from the same image as the app, so there is no second
 * toolchain to maintain and no package to fetch at container start.
 *
 * Three things make this a real backup rather than a copied file:
 *
 *   VACUUM INTO takes a consistent snapshot of a live database, including
 *   anything still sitting in the write-ahead log. `cp` of a WAL database can
 *   produce a file that is missing recent commits or is simply corrupt.
 *
 *   Every snapshot is opened, integrity-checked, AND reconciled — balances are
 *   re-derived from the ledger and must agree. A backup nobody has verified is
 *   not a backup, and one that restores a wrong balance is worse than none.
 *
 *   Exhibits are copied alongside it. A restore that brings back the cases and
 *   loses their plates returns a docket nobody can re-read.
 *
 *   node scripts/backup-bank.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE = process.env.BANK_DB_PATH ?? "/app/data/bank.db";
const EVIDENCE = process.env.BANK_EVIDENCE_DIR ?? "/app/evidence";
const DIRECTORY = process.env.BACKUP_DIR ?? "/app/backups";
const INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES ?? 60);
const KEEP = Number(process.env.BACKUP_KEEP ?? 168);
const OPENING_BALANCE = 3000;

const log = (message) => console.log(`[backup] ${new Date().toISOString()} ${message}`);

/** ISO order is also lexical order, so pruning can sort by filename. */
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

/** The same reconciliation `scripts/check-ledger.mjs` runs, against a snapshot. */
function reconcile(db) {
  const movements = new Map(
    db
      .prepare("SELECT account_id, SUM(delta) AS total FROM ledger_entries GROUP BY account_id")
      .all()
      .map((row) => [row.account_id, row.total]),
  );

  for (const account of db.prepare("SELECT id, handle, balance FROM accounts").all()) {
    const derived = OPENING_BALANCE + (movements.get(account.id) ?? 0);
    if (derived !== account.balance) {
      throw new Error(`${account.handle} holds ${account.balance}, ledger says ${derived}`);
    }
  }

  const { total } = db.prepare("SELECT COALESCE(SUM(delta), 0) AS total FROM ledger_entries").get();
  if (total !== 0) throw new Error(`ledger sums to ${total}, not zero`);
}

function snapshotLedger(at) {
  const target = join(DIRECTORY, `bank-${at}.db`);

  const source = new DatabaseSync(SOURCE);
  try {
    source.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    source.close();
  }

  const copy = new DatabaseSync(target, { readOnly: true });
  try {
    const { integrity_check: verdict } = copy.prepare("PRAGMA integrity_check").get();
    if (verdict !== "ok") throw new Error(`integrity check failed: ${verdict}`);
    reconcile(copy);

    const { accounts } = copy.prepare("SELECT COUNT(*) AS accounts FROM accounts").get();
    const { cases } = copy.prepare("SELECT COUNT(*) AS cases FROM cases").get();
    log(`wrote ${target} — ${accounts} accounts, ${cases} cases, integrity ok, ledger reconciled`);
  } catch (error) {
    // A snapshot that cannot be verified is deleted rather than kept: a bad
    // backup in the directory is indistinguishable from a good one later.
    copy.close();
    rmSync(target, { force: true });
    throw error;
  }
  copy.close();
}

/** Exhibits are immutable once filed, so only new plates are ever copied. */
function snapshotEvidence(at) {
  if (!existsSync(EVIDENCE)) return;

  const target = join(DIRECTORY, `evidence-${at}`);
  const plates = readdirSync(EVIDENCE).filter((name) => /^[0-9a-f]{32}\.(png|jpg|webp)$/.test(name));
  if (plates.length === 0) return;

  mkdirSync(target, { recursive: true });
  let bytes = 0;
  for (const plate of plates) {
    const from = join(EVIDENCE, plate);
    copyFileSync(from, join(target, plate));
    bytes += statSync(from).size;
  }

  log(`wrote ${target} — ${plates.length} exhibits, ${Math.ceil(bytes / 1024)} KB`);
}

/** Keeps the newest KEEP snapshots, and the exhibit sets beside them. */
function prune() {
  const entries = readdirSync(DIRECTORY);

  const databases = entries.filter((name) => name.startsWith("bank-") && name.endsWith(".db")).sort();
  for (const stale of databases.slice(0, Math.max(0, databases.length - KEEP))) {
    rmSync(join(DIRECTORY, stale), { force: true });
    log(`pruned ${stale}`);
  }

  const evidence = entries.filter((name) => name.startsWith("evidence-")).sort();
  for (const stale of evidence.slice(0, Math.max(0, evidence.length - KEEP))) {
    rmSync(join(DIRECTORY, stale), { recursive: true, force: true });
    log(`pruned ${stale}`);
  }
}

function run() {
  try {
    if (!existsSync(SOURCE)) {
      log("no ledger yet — nothing to back up");
      return;
    }
    mkdirSync(DIRECTORY, { recursive: true });

    // One timestamp for both, so a database and its exhibits restore as a pair.
    const at = stamp();
    snapshotLedger(at);
    snapshotEvidence(at);
    prune();
  } catch (error) {
    // Never exit on a failed run: a restart loop would be a worse outcome than
    // a missed snapshot, and the next attempt may well succeed.
    log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

log(`every ${INTERVAL_MINUTES}m, keeping ${KEEP}, from ${SOURCE} and ${EVIDENCE} into ${DIRECTORY}`);
run();
const timer = setInterval(run, INTERVAL_MINUTES * 60 * 1000);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    clearInterval(timer);
    log(`${signal} — stopping`);
    process.exit(0);
  });
}
