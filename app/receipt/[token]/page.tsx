import Link from "next/link";
import { notFound } from "next/navigation";
import { ORG_NAME } from "@/lib/config";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { IS_TEST_MODE } from "@/lib/payments";
import { getMember, getPaymentByReceipt } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const payment = getPaymentByReceipt((await params).token);
  if (!payment || payment.status !== "succeeded") notFound();
  const member = payment.member_id ? getMember(payment.member_id) : undefined;

  return (
    <div className="narrow">
      <div className="card receipt">
        <p className="eyebrow">Payment received</p>
        <h1>Thank you, {payment.name.split(" ")[0]}!</h1>
        {IS_TEST_MODE && <p className="test-banner">Test mode: no real charge was made.</p>}
        <dl className="meta">
          <dt>Receipt</dt><dd>#{payment.id}</dd>
          <dt>Date</dt><dd>{formatDateTime(payment.created_at)}</dd>
          <dt>Paid with</dt><dd>{payment.card_brand} ending {payment.card_last4}</dd>
          <dt>Email</dt><dd>{payment.email}</dd>
        </dl>
        <table>
          <tbody>
            {payment.items.map((i) => (
              <tr key={i.id}><td>{i.description}</td><td className="num">{formatCents(i.amount_cents)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Total</th><th className="num">{formatCents(payment.total_cents)}</th></tr>
          </tfoot>
        </table>
        {member && (
          <p>
            Your membership is active through <strong>{formatDate(member.expires_at)}</strong>.{" "}
            {member.auto_renew ? "It will renew automatically." : "Automatic renewal is off."}
          </p>
        )}
        <p className="muted small">
          {ORG_NAME}. Please keep this receipt for your records.
        </p>
        <Link href="/" className="btn">Back to home</Link>
      </div>
    </div>
  );
}
