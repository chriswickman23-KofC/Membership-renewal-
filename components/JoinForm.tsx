"use client";

import { startTransition, useActionState, useState } from "react";
import { joinAction, type FormState } from "@/app/actions";
import { DONATION_FUNDS, PENNY_PER_DAY, TIERS } from "@/lib/config";
import { formatCents } from "@/lib/format";
import CardFields from "./CardFields";
import DonationPicker from "./DonationPicker";

const initial: FormState = { error: null };

export default function JoinForm({ testMode }: { testMode: boolean }) {
  const [state, action, pending] = useActionState(joinAction, initial);
  const [tierId, setTierId] = useState(TIERS[0].id);
  const [autoRenew, setAutoRenew] = useState(true);
  const [penny, setPenny] = useState(true);

  const tier = TIERS.find((t) => t.id === tierId)!;
  const lines = [
    { label: `${tier.name} membership (1 year)`, cents: tier.priceCents },
    ...(penny ? [{ label: PENNY_PER_DAY.name, cents: PENNY_PER_DAY.priceCents }] : []),
  ];
  const total = lines.reduce((s, l) => s + l.cents, 0);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        // Submit manually so React doesn't reset the form when payment fails.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <fieldset className="card">
        <legend>Membership level</legend>
        <div className="tiers">
          {TIERS.map((t) => (
            <label key={t.id} className={`tier ${t.id === tierId ? "tier-on" : ""}`}>
              <input type="radio" name="tier" value={t.id} checked={t.id === tierId} onChange={() => setTierId(t.id)} />
              <strong>{t.name}</strong>
              <span className="price">{formatCents(t.priceCents)}/yr</span>
              <small>{t.description}</small>
            </label>
          ))}
        </div>
        <label className="check penny">
          <input type="checkbox" name="penny_per_day" checked={penny} onChange={(e) => setPenny(e.target.checked)} />
          <span>
            <strong>Add {PENNY_PER_DAY.name}: {formatCents(PENNY_PER_DAY.priceCents)}/yr.</strong>{" "}
            {PENNY_PER_DAY.description}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="auto_renew" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
          <span>
            Renew my membership automatically each year at {formatCents(total)}. You can turn this off at any
            time by contacting us.
          </span>
        </label>
      </fieldset>

      <fieldset className="card">
        <legend>Your details</legend>
        <div className="row">
          <label className="field"><span>First name *</span><input name="first_name" autoComplete="given-name" required /></label>
          <label className="field"><span>Last name *</span><input name="last_name" autoComplete="family-name" required /></label>
        </div>
        <div className="row">
          <label className="field"><span>Email *</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Phone</span><input name="phone" type="tel" autoComplete="tel" /></label>
        </div>
        <label className="field"><span>Street address</span><input name="address" autoComplete="street-address" /></label>
        <div className="row three">
          <label className="field"><span>City</span><input name="city" autoComplete="address-level2" /></label>
          <label className="field"><span>State</span><input name="state" autoComplete="address-level1" /></label>
          <label className="field"><span>ZIP</span><input name="zip" autoComplete="postal-code" /></label>
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>Optional donations</legend>
        <p className="muted">Donations are made directly on each organization&apos;s website (opens in a new tab) and are not part of this payment.</p>
        {DONATION_FUNDS.map((f) => (
          <div key={f.id} className="fund">
            <h3>{f.name}</h3>
            <p className="muted">{f.description}</p>
            <DonationPicker fund={f} />
          </div>
        ))}
      </fieldset>

      <CardFields testMode={testMode} />

      <section className="card summary" aria-label="Order summary">
        <h2>Summary</h2>
        <table>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label}><td>{l.label}</td><td className="num">{formatCents(l.cents)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Total today</th><th className="num">{formatCents(total)}</th></tr>
          </tfoot>
        </table>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Processing…" : `Pay ${formatCents(total)}`}
        </button>
      </section>
    </form>
  );
}
