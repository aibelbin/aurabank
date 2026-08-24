/**
 * Periodic, verified snapshots of the waitlist database.
 *
 * Runs as a sidecar from the same image as the app, so there is no second
 * toolchain to maintain and no package to fetch at container start.
 *
 * Two things make this a real backup rather than a copied file:
 *
 *   VACUUM INTO takes a consistent snapshot of a live database, including
 *   anything still sitting in the write-ahead log. `cp` of a WAL database can
 *   produce a file that is missing recent commits or is simply corrupt.
 *
 *   Every snapshot is opened and integrity-checked before it is kept. A backup
 *   nobody has verified is not a backup, and a corrupt one is worse than none
 *   because it looks like safety.
 *
 *   node scripts/backup-waitlist.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SOURCE = process.env.WAITLIST_DB_PATH ?? "/app/data/waitlist.db";
const DIRECTORY = process.env.BACKUP_DIR ?? "/app/backups";
const INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES ?? 60);
const KEEP = Number(process.env.BACKUP_KEEP ?? 168);

const log = (message) => console.log(`[backup] ${new Date().toISOString()} ${message}`);

/** ISO order is also lexical order, so pruning can sort by filename. */
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

function snapshot() {
  if (!existsSync(SOURCE)) {
    log("no database yet — nothing to back up");
    return;
  }

  mkdirSync(DIRECTORY, { recursive: true });
  const target = join(DIRECTORY, `waitlist-${stamp()}.db`);

  const source = new DatabaseSync(SOURCE);
  try {
    source.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    source.close();
  }

  const copy = new DatabaseSync(target);
  try {
    const { integrity_check: verdict } = copy.prepare("PRAGMA integrity_check").get();
    if (verdict !== "ok") {
      rmSync(target, { force: true });
      throw new Error(`integrity check failed: ${verdict}`);
    }
    const { total } = copy.prepare("SELECT COUNT(*) AS total FROM waitlist").get();
    log(`wrote ${target} — ${total} applications, integrity ok`);
  } finally {
    copy.close();
  }
}

/** Keeps the newest KEEP snapshots and deletes the rest. */
function prune() {
  const snapshots = readdirSync(DIRECTORY)
    .filter((name) => name.startsWith("waitlist-") && name.endsWith(".db"))
    .sort();

  for (const stale of snapshots.slice(0, Math.max(0, snapshots.length - KEEP))) {
    rmSync(join(DIRECTORY, stale), { force: true });
    log(`pruned ${stale}`);
  }
}

function run() {
  try {
    snapshot();
    prune();
  } catch (error) {
    // Never exit on a failed run: a restart loop would be a worse outcome than
    // a missed snapshot, and the next attempt may well succeed.
    log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

log(`every ${INTERVAL_MINUTES}m, keeping ${KEEP}, from ${SOURCE} into ${DIRECTORY}`);
run();
const timer = setInterval(run, INTERVAL_MINUTES * 60 * 1000);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    clearInterval(timer);
    log(`${signal} — stopping`);
    process.exit(0);
  });
}
