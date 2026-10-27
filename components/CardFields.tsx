export default function CardFields({ testMode }: { testMode: boolean }) {
  return (
    <fieldset className="card">
      <legend>Payment</legend>
      {testMode && (
        <p className="test-banner">
          Test mode: no real charge is made. Use <code>4242 4242 4242 4242</code> with any future expiry and any CVC.
          Use <code>4000 0000 0000 0002</code> to simulate a decline.
        </p>
      )}
      <label className="field">
        <span>Name on card</span>
        <input name="card_name" autoComplete="cc-name" required />
      </label>
      <label className="field">
        <span>Card number</span>
        <input name="card_number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" required />
      </label>
      <div className="row">
        <label className="field">
          <span>Expiry (MM/YY)</span>
          <input name="card_expiry" autoComplete="cc-exp" placeholder="MM/YY" required />
        </label>
        <label className="field">
          <span>CVC</span>
          <input name="card_cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
        </label>
      </div>
    </fieldset>
  );
}
