import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { PENNY_PER_DAY, getTier } from "@/lib/config";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { getMember, listPaymentsForMember } from "@/lib/repo";
import { cancelMembershipAction, recordOfflinePaymentAction, saveNotesAction, setAutoRenewAction, setPennyPerDayAction } from "../../../actions";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const member = getMember(Number((await params).id));
  if (!member) notFound();
  const tier = getTier(member.tier);
  const payments = listPaymentsForMember(member.id);
  const address = [member.address, [member.city, member.state].filter(Boolean).join(", "), member.zip].filter(Boolean).join(" ");

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{member.first_name} {member.last_name}</h1>
        <StatusBadge status={member.status} />
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Membership</h2>
          <dl className="meta">
            <dt>Level</dt><dd>{tier?.name} ({tier && formatCents(tier.priceCents)}/yr)</dd>
            <dt>Member since</dt><dd>{formatDate(member.joined_at)}</dd>
            <dt>Expires</dt><dd>{formatDate(member.expires_at)}</dd>
            <dt>Penny per Knight</dt><dd>{member.penny_per_day ? `Yes (${formatCents(PENNY_PER_DAY.priceCents)}/yr)` : "No"}</dd>
            <dt>Auto-renew</dt><dd>{member.auto_renew ? "On" : "Off"}</dd>
            <dt>Saved card</dt><dd>{member.card_last4 ? `${member.card_brand} ending ${member.card_last4}` : "None"}</dd>
          </dl>
          <div className="actions">
            {member.status !== "cancelled" && (
              <form action={setAutoRenewAction}>
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="auto_renew" value={member.auto_renew ? "0" : "1"} />
                <button className="btn" disabled={!member.auto_renew && !member.payment_token}>
                  {member.auto_renew ? "Turn off auto-renew" : "Turn on auto-renew"}
                </button>
              </form>
            )}
            <form action={setPennyPerDayAction}>
              <input type="hidden" name="id" value={member.id} />
              <input type="hidden" name="penny_per_day" value={member.penny_per_day ? "0" : "1"} />
              <button className="btn">{member.penny_per_day ? "Remove Penny per Knight" : "Add Penny per Knight"}</button>
            </form>
            {member.status !== "cancelled" && (
              <form action={cancelMembershipAction}>
                <input type="hidden" name="id" value={member.id} />
                <button className="btn btn-danger">Cancel membership</button>
              </form>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Contact</h2>
          <dl className="meta">
            <dt>Email</dt><dd><a href={`mailto:${member.email}`}>{member.email}</a></dd>
            <dt>Phone</dt><dd>{member.phone || "—"}</dd>
            <dt>Address</dt><dd>{address || "—"}</dd>
          </dl>
          <form action={saveNotesAction} className="stack">
            <input type="hidden" name="id" value={member.id} />
            <label className="field">
              <span>Staff notes</span>
              <textarea name="notes" rows={3} defaultValue={member.notes ?? ""} />
            </label>
            <button className="btn">Save notes</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Record a cash or check payment</h2>
        <p className="muted">Adds one year of {tier?.name} dues ({tier && formatCents(tier.priceCents)}){member.penny_per_day ? ` plus ${PENNY_PER_DAY.name} (${formatCents(PENNY_PER_DAY.priceCents)})` : ""} and marks the membership active.</p>
        <form action={recordOfflinePaymentAction} className="filters">
          <input type="hidden" name="id" value={member.id} />
          <select name="method" aria-label="Payment method">
            <option value="check">Check</option>
            <option value="cash">Cash</option>
          </select>
          <input name="reference" placeholder="Check # or note (optional)" aria-label="Reference" />
          <button className="btn">Record payment</button>
        </form>
      </section>

      <section className="card">
        <h2>Payment history</h2>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Items</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.created_at)}</td>
                <td>{p.kind.replace("_", " ")} <span className="muted small">via {p.provider}</span></td>
                <td>
                  {p.items.map((i) => <div key={i.id}>{i.description}: {formatCents(i.amount_cents)}</div>)}
                  {p.failure_reason && <div className="error small">{p.failure_reason}</div>}
                </td>
                <td className="num">{formatCents(p.total_cents)}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={5} className="muted">No payments.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
