import { FUND_LABELS, RENEWAL_GRACE_DAYS, RENEWAL_RETRY_DAYS, getTier } from "./config";
import { db, transaction } from "./db";
import { duesItems } from "./dues";
import { addDays, addYears } from "./format";
import { paymentProvider } from "./payments";
import { insertPayment, updateMember, type Member } from "./repo";

export interface RenewalRunResult {
  renewed: number;
  failed: number;
  expired: number;
  details: string[];
}

/**
 * Charges auto-renewing members whose membership has reached its expiry date,
 * retries failed renewals every few days during the grace period, and expires
 * memberships that lapse. Safe to run as often as you like (e.g. daily cron).
 */
export async function processRenewals(now = new Date()): Promise<RenewalRunResult> {
  const nowIso = now.toISOString();
  const retryBefore = addDays(nowIso, -RENEWAL_RETRY_DAYS);
  const result: RenewalRunResult = { renewed: 0, failed: 0, expired: 0, details: [] };

  const due = db()
    .prepare(
      `SELECT * FROM members
       WHERE auto_renew = 1 AND status IN ('active', 'past_due') AND expires_at <= ?
         AND (last_renewal_attempt_at IS NULL OR last_renewal_attempt_at <= ?)`,
    )
    .all(nowIso, retryBefore) as unknown as Member[];

  for (const m of due) {
    const tier = getTier(m.tier);
    const name = `${m.first_name} ${m.last_name}`;
    if (!tier || !m.payment_token) {
      updateMember(m.id, { status: "past_due", last_renewal_attempt_at: nowIso });
      result.failed++;
      result.details.push(`${name}: no saved payment method`);
      continue;
    }

    const items = duesItems(tier, !!m.penny_per_day, `${tier.name} membership renewal (1 year)`);
    const charge = await paymentProvider.charge({
      token: m.payment_token,
      amountCents: items.reduce((s, i) => s + i.amountCents, 0),
      description: `${tier.name} membership renewal`,
      offSession: true,
    });

    transaction(() => {
      insertPayment({
        memberId: m.id, name, email: m.email, kind: "renewal", status: charge.ok ? "succeeded" : "failed",
        provider: paymentProvider.name, providerRef: charge.ok ? charge.reference : null,
        failureReason: charge.ok ? null : charge.reason, cardBrand: m.card_brand, cardLast4: m.card_last4,
        items, createdAt: nowIso,
      });
      if (charge.ok) {
        // Keep the member's original anniversary date.
        updateMember(m.id, { status: "active", expires_at: addYears(m.expires_at, 1), last_renewal_attempt_at: null });
      } else {
        updateMember(m.id, { status: "past_due", last_renewal_attempt_at: nowIso });
      }
    });

    if (charge.ok) {
      result.renewed++;
      result.details.push(`${name}: renewed (${FUND_LABELS.MEMBERSHIP})`);
    } else {
      result.failed++;
      result.details.push(`${name}: ${charge.reason}`);
    }
  }

  // Lapse memberships that won't renew, and past-due ones beyond the grace period.
  const lapsed = db()
    .prepare(
      `UPDATE members SET status = 'expired', updated_at = ?
       WHERE (status = 'active' AND auto_renew = 0 AND expires_at <= ?)
          OR (status IN ('active', 'past_due') AND expires_at <= ?)`,
    )
    .run(nowIso, nowIso, addDays(nowIso, -RENEWAL_GRACE_DAYS));
  result.expired = Number(lapsed.changes);

  return result;
}
