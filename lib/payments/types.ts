export interface CardInput {
  number: string;
  expiry: string; // MM/YY
  cvc: string;
  nameOnCard: string;
}

export type PaymentMethodResult =
  | { ok: true; token: string; brand: string; last4: string }
  | { ok: false; error: string };

export interface ChargeRequest {
  token: string;
  amountCents: number;
  description: string;
  /** True for automatic renewals charged without the customer present. */
  offSession: boolean;
}

export type ChargeResult = { ok: true; reference: string } | { ok: false; reason: string };

/**
 * Anything that can save a card and charge it. The mock provider implements
 * this today; a Stripe/PayPal/Square provider can replace it without touching
 * the rest of the app.
 */
export interface PaymentProvider {
  name: string;
  createPaymentMethod(card: CardInput): Promise<PaymentMethodResult>;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}
