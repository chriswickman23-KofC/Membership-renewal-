import crypto from "node:crypto";
import { db } from "./db";
import type { FundId, TierId } from "./config";
import { EXPIRING_SOON_DAYS } from "./config";
import { addDays, addYears } from "./format";

export type MemberStatus = "active" | "past_due" | "expired" | "cancelled";
export type PaymentKind = "new_membership" | "renewal" | "donation";

export interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tier: TierId;
  status: MemberStatus;
  auto_renew: number;
  penny_per_day: number;
  payment_token: string | null;
  card_brand: string | null;
  card_last4: string | null;
  joined_at: string;
  expires_at: string;
  last_renewal_attempt_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  member_id: number | null;
  name: string;
  email: string;
  kind: PaymentKind;
  total_cents: number;
  status: "succeeded" | "failed";
  provider: string;
  provider_ref: string | null;
  failure_reason: string | null;
  card_brand: string | null;
  card_last4: string | null;
  receipt_token: string;
  created_at: string;
}

export interface PaymentItem {
  id: number;
  payment_id: number;
  fund: FundId;
  description: string;
  amount_cents: number;
}

export interface LineItem {
  fund: FundId;
  description: string;
  amountCents: number;
}

// ---------- Members ----------

export function getMember(id: number): Member | undefined {
  return db().prepare("SELECT * FROM members WHERE id = ?").get(id) as Member | undefined;
}

export function findMemberByEmail(email: string): Member | undefined {
  return db().prepare("SELECT * FROM members WHERE email = ?").get(email.trim()) as Member | undefined;
}

export function listMembers(opts: { q?: string; status?: string } = {}): Member[] {
  const where: string[] = [];
  const params: string[] = [];
  if (opts.q) {
    where.push("(first_name || ' ' || last_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  if (opts.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  const sql = `SELECT * FROM members ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY last_name, first_name`;
  return db().prepare(sql).all(...params) as unknown as Member[];
}

export interface MemberDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tier: TierId;
  autoRenew: boolean;
  pennyPerDay: boolean;
}

export interface SavedCard {
  token: string;
  brand: string;
  last4: string;
}

/**
 * Creates a member or, if the email already exists, updates their details and
 * extends their membership by one year from whichever is later: now or their
 * current expiry. Returns the member id and whether they were new.
 */
export function upsertMemberAfterPayment(details: MemberDetails, card: SavedCard, nowIso: string) {
  const existing = findMemberByEmail(details.email);
  if (existing) {
    const base = existing.expires_at > nowIso && existing.status !== "cancelled" ? existing.expires_at : nowIso;
    db()
      .prepare(
        `UPDATE members SET first_name=?, last_name=?, phone=?, address=?, city=?, state=?, zip=?, tier=?,
           status='active', auto_renew=?, penny_per_day=?, payment_token=?, card_brand=?, card_last4=?, expires_at=?,
           last_renewal_attempt_at=NULL, updated_at=? WHERE id=?`,
      )
      .run(
        details.firstName, details.lastName, details.phone, details.address, details.city, details.state, details.zip,
        details.tier, details.autoRenew ? 1 : 0, details.pennyPerDay ? 1 : 0, card.token, card.brand, card.last4, addYears(base, 1), nowIso, existing.id,
      );
    return { memberId: existing.id, isNew: false };
  }
  const result = db()
    .prepare(
      `INSERT INTO members (first_name, last_name, email, phone, address, city, state, zip, tier, status, auto_renew,
         penny_per_day, payment_token, card_brand, card_last4, joined_at, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      details.firstName, details.lastName, details.email.trim().toLowerCase(), details.phone, details.address,
      details.city, details.state, details.zip, details.tier, details.autoRenew ? 1 : 0, details.pennyPerDay ? 1 : 0, card.token, card.brand,
      card.last4, nowIso, addYears(nowIso, 1), nowIso, nowIso,
    );
  return { memberId: Number(result.lastInsertRowid), isNew: true };
}

export function updateMember(id: number, fields: Partial<Pick<Member, "status" | "auto_renew" | "penny_per_day" | "expires_at" | "last_renewal_attempt_at" | "notes">>) {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => fields[k] ?? null);
  db().prepare(`UPDATE members SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, new Date().toISOString(), id);
}

// ---------- Payments ----------

export interface NewPayment {
  memberId: number | null;
  name: string;
  email: string;
  kind: PaymentKind;
  status: "succeeded" | "failed";
  provider: string;
  providerRef: string | null;
  failureReason: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  items: LineItem[];
  createdAt: string;
}

export function insertPayment(p: NewPayment): { id: number; receiptToken: string } {
  const receiptToken = crypto.randomBytes(16).toString("base64url");
  const total = p.items.reduce((s, i) => s + i.amountCents, 0);
  const result = db()
    .prepare(
      `INSERT INTO payments (member_id, name, email, kind, total_cents, status, provider, provider_ref, failure_reason,
         card_brand, card_last4, receipt_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.memberId, p.name, p.email.trim().toLowerCase(), p.kind, total, p.status, p.provider, p.providerRef,
      p.failureReason, p.cardBrand, p.cardLast4, receiptToken, p.createdAt,
    );
  const id = Number(result.lastInsertRowid);
  const insertItem = db().prepare("INSERT INTO payment_items (payment_id, fund, description, amount_cents) VALUES (?, ?, ?, ?)");
  for (const item of p.items) insertItem.run(id, item.fund, item.description, item.amountCents);
  return { id, receiptToken };
}

export function getPaymentItems(paymentId: number): PaymentItem[] {
  return db().prepare("SELECT * FROM payment_items WHERE payment_id = ? ORDER BY id").all(paymentId) as unknown as PaymentItem[];
}

export function getPaymentByReceipt(token: string): (Payment & { items: PaymentItem[] }) | undefined {
  const payment = db().prepare("SELECT * FROM payments WHERE receipt_token = ?").get(token) as Payment | undefined;
  if (!payment) return undefined;
  return { ...payment, items: getPaymentItems(payment.id) };
}

export function listPaymentsForMember(memberId: number): (Payment & { items: PaymentItem[] })[] {
  const rows = db().prepare("SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC").all(memberId) as unknown as Payment[];
  return rows.map((p) => ({ ...p, items: getPaymentItems(p.id) }));
}

export function listPayments(opts: { status?: string; kind?: string; limit?: number } = {}): (Payment & { items: PaymentItem[] })[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.status) {
    where.push("status = ?");
    params.push(opts.status);
  }
  if (opts.kind) {
    where.push("kind = ?");
    params.push(opts.kind);
  }
  params.push(opts.limit ?? 500);
  const rows = db()
    .prepare(`SELECT * FROM payments ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`)
    .all(...params) as unknown as Payment[];
  return rows.map((p) => ({ ...p, items: getPaymentItems(p.id) }));
}

export interface DonationRow {
  item_id: number;
  payment_id: number;
  fund: FundId;
  amount_cents: number;
  name: string;
  email: string;
  member_id: number | null;
  kind: PaymentKind;
  provider_ref: string | null;
  created_at: string;
}

export function listDonations(opts: { fund?: string; from?: string; to?: string } = {}): DonationRow[] {
  const where = ["p.status = 'succeeded'", "i.fund != 'MEMBERSHIP'"];
  const params: string[] = [];
  if (opts.fund) {
    where.push("i.fund = ?");
    params.push(opts.fund);
  }
  if (opts.from) {
    where.push("p.created_at >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    where.push("p.created_at < ?");
    params.push(opts.to);
  }
  return db()
    .prepare(
      `SELECT i.id AS item_id, p.id AS payment_id, i.fund, i.amount_cents, p.name, p.email, p.member_id, p.kind,
         p.provider_ref, p.created_at
       FROM payment_items i JOIN payments p ON p.id = i.payment_id
       WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC`,
    )
    .all(...params) as unknown as DonationRow[];
}

// ---------- Dashboard ----------

export function fundTotals(fromIso?: string): Record<FundId, { cents: number; count: number }> {
  const rows = db()
    .prepare(
      `SELECT i.fund, SUM(i.amount_cents) AS cents, COUNT(*) AS count
       FROM payment_items i JOIN payments p ON p.id = i.payment_id
       WHERE p.status = 'succeeded' AND p.created_at >= ? GROUP BY i.fund`,
    )
    .all(fromIso ?? "") as { fund: FundId; cents: number; count: number }[];
  const out: Record<FundId, { cents: number; count: number }> = {
    MEMBERSHIP: { cents: 0, count: 0 },
    PENNY: { cents: 0, count: 0 },
    VKCCI: { cents: 0, count: 0 },
    KOVAR: { cents: 0, count: 0 },
  };
  for (const r of rows) out[r.fund] = { cents: Number(r.cents), count: Number(r.count) };
  return out;
}

export function memberStatusCounts(): Record<MemberStatus, number> {
  const rows = db().prepare("SELECT status, COUNT(*) AS n FROM members GROUP BY status").all() as { status: MemberStatus; n: number }[];
  const out: Record<MemberStatus, number> = { active: 0, past_due: 0, expired: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

export function membersExpiringSoon(nowIso: string): Member[] {
  return db()
    .prepare("SELECT * FROM members WHERE status = 'active' AND expires_at >= ? AND expires_at < ? ORDER BY expires_at")
    .all(nowIso, addDays(nowIso, EXPIRING_SOON_DAYS)) as unknown as Member[];
}
