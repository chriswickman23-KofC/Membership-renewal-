import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { formatCents, formatDateTime } from "@/lib/format";
import { listPayments } from "@/lib/repo";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
  const { status = "", kind = "" } = await searchParams;
  const payments = listPayments({ status: status || undefined, kind: kind || undefined });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Payments</h1>
        <a className="btn" href="/admin/export/payments">Export CSV</a>
      </div>
      <form className="filters">
        <select name="kind" defaultValue={kind} aria-label="Type">
          <option value="">All types</option>
          <option value="new_membership">New membership</option>
          <option value="renewal">Renewal</option>
          <option value="donation">Donation only</option>
        </select>
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">All statuses</option>
          <option value="succeeded">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <button className="btn">Filter</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Name</th><th>Type</th><th>Breakdown</th><th className="num">Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{formatDateTime(p.created_at)}</td>
                <td>
                  {p.member_id ? <Link href={`/admin/members/${p.member_id}`}>{p.name}</Link> : p.name}
                  <div className="muted small">{p.email}</div>
                </td>
                <td>{p.kind.replace("_", " ")}</td>
                <td>
                  {p.items.map((i) => <div key={i.id}>{i.fund}: {formatCents(i.amount_cents)}</div>)}
                  {p.failure_reason && <div className="error small">{p.failure_reason}</div>}
                </td>
                <td className="num">{formatCents(p.total_cents)}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={7} className="muted">No payments found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
