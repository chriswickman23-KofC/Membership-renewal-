import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  tier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'expired', 'cancelled')),
  auto_renew INTEGER NOT NULL DEFAULT 1,
  penny_per_day INTEGER NOT NULL DEFAULT 0,
  payment_token TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  joined_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_renewal_attempt_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('new_membership', 'renewal', 'donation')),
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  provider TEXT NOT NULL,
  provider_ref TEXT,
  failure_reason TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  receipt_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_items (
  id INTEGER PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  fund TEXT NOT NULL CHECK (fund IN ('MEMBERSHIP', 'PENNY', 'VKCCI', 'KOVAR')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_items_payment ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_items_fund ON payment_items(fund);
CREATE INDEX IF NOT EXISTS idx_members_expires ON members(expires_at);
`;

const globalForDb = globalThis as unknown as { __membershipDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!globalForDb.__membershipDb) {
    const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const conn = new DatabaseSync(path.join(dir, "membership.db"));
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    conn.exec(SCHEMA);
    migrate(conn);
    globalForDb.__membershipDb = conn;
  }
  return globalForDb.__membershipDb;
}

/** Brings databases created by earlier versions up to the current schema. */
function migrate(conn: DatabaseSync) {
  const memberCols = conn.prepare("PRAGMA table_info(members)").all() as { name: string }[];
  if (!memberCols.some((c) => c.name === "penny_per_day")) {
    conn.exec("ALTER TABLE members ADD COLUMN penny_per_day INTEGER NOT NULL DEFAULT 0");
  }
  const items = conn.prepare("SELECT sql FROM sqlite_master WHERE name = 'payment_items'").get() as { sql: string };
  if (!items.sql.includes("'PENNY'")) {
    conn.exec(`
      BEGIN;
      ALTER TABLE payment_items RENAME TO payment_items_old;
      CREATE TABLE payment_items (
        id INTEGER PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id),
        fund TEXT NOT NULL CHECK (fund IN ('MEMBERSHIP', 'PENNY', 'VKCCI', 'KOVAR')),
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL
      );
      INSERT INTO payment_items SELECT * FROM payment_items_old;
      DROP TABLE payment_items_old;
      CREATE INDEX IF NOT EXISTS idx_items_payment ON payment_items(payment_id);
      CREATE INDEX IF NOT EXISTS idx_items_fund ON payment_items(fund);
      COMMIT;
    `);
  }
}

export function transaction<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}
