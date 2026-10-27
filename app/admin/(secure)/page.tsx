import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { EXPIRING_SOON_DAYS, FUND_LABELS, getTier, type FundId } from "@/lib/config";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { IS_TEST_MODE } from "@/lib/payments";
import { fundTotals, listPayments, memberStatusCounts, membersExpiringSoon } from "@/lib/repo";
import { runRenewalsAction } from "../actions";

const FUNDS: FundId[] = ["MEMBERSHIP", "PENNY"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  const counts = memberStatusCounts();
  const ytd = fundTotals(yearStart);
  const allTime = fundTotals();
  const expiring = membersExpiringSoon(now.toISOString());
  const recent = listPayments({ limit: 10 });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Dashboard</h1>
        <form action={runRenewalsAction}>
          <button className="btn">Run due renewals now</button>
        </form>
      </div>
      {IS_TEST_MODE && <p className="test-banner">Payments are in test mode. No real money is moving.</p>}
      {sp.renewed !== undefined && (
        <p className="notice">
          Renewal run complete: {sp.renewed} renewed, {sp.failed} failed, {sp.expired} expired.
        </p>
      )}

      <div className="stats">
        <Link href="/admin/members?status=active" className="stat"><span>Active members</span><strong>{counts.active}</strong></Link>
        <Link href="/admin/members?status=past_due" className="stat"><span>Past due</span><strong>{counts.past_due}</strong></Link>
        <Link href="/admin/members?status=expired" className="stat"><span>Expired</span><strong>{counts.expired}</strong></Link>
        <div className="stat"><span>Expiring in {EXPIRING_SOON_DAYS} days</span><strong>{expiring.length}</strong></div>
      </div>

      <section className="card">
        <h2>Revenue</h2>
        <table>
          <thead>
            <tr><th>Fund</th><th className="num">{now.getUTCFullYear()} to date</th><th className="num">All time</th><th className="num">Gifts / payments</th></tr>
          </thead>
          <tbody>
            {FUNDS.map((f) => (
              <tr key={f}>
                <td>{FUND_LABELS[f]}</td>
                <td className="num">{formatCents(ytd[f].cents)}</td>
                <td className="num">{formatCents(allTime[f].cents)}</td>
                <td className="num">{allTime[f].count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Expiring in the next {EXPIRING_SOON_DAYS} days</h2>
        {expiring.length === 0 ? (
          <p className="muted">No memberships are expiring soon.</p>
        ) : (
          <table>
            <thead><tr><th>Member</th><th>Level</th><th>Expires</th><th>Auto-renew</th></tr></thead>
            <tbody>
              {expiring.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/admin/members/${m.id}`}>{m.first_name} {m.last_name}</Link></td>
                  <td>{getTier(m.tier)?.name}</td>
                  <td>{formatDate(m.expires_at)}</td>
                  <td>{m.auto_renew ? `Yes (${m.card_brand} •${m.card_last4})` : "No — send a reminder"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div className="page-head">
          <h2>Recent payments</h2>
          <Link href="/admin/payments">View all</Link>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Name</th><th>Items</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.created_at)}</td>
                <td>{p.member_id ? <Link href={`/admin/members/${p.member_id}`}>{p.name}</Link> : p.name}</td>
                <td>{p.items.map((i) => i.fund).join(" + ")}</td>
                <td className="num">{formatCents(p.total_cents)}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan={5} className="muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
