import crypto from "node:crypto";
import type { CardInput, ChargeRequest, ChargeResult, PaymentMethodResult, PaymentProvider } from "./types";

/**
 * Simulated payment processor. No money moves and full card numbers are never
 * stored. Test cards (any future expiry, any CVC):
 *   4242 4242 4242 4242  succeeds
 *   4000 0000 0000 0002  declined
 *   4000 0000 0000 9995  insufficient funds
 *   4000 0000 0000 0341  first charge succeeds, automatic renewals fail
 */
export const TEST_CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  insufficientFunds: "4000 0000 0000 9995",
  renewalFails: "4000 0000 0000 0341",
};

type Behavior = "ok" | "decline" | "nsf" | "renewal-fail";

const BEHAVIORS: Record<string, Behavior> = {
  "4000000000000002": "decline",
  "4000000000009995": "nsf",
  "4000000000000341": "renewal-fail",
};

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function brandFor(digits: string): string {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(011|5)/.test(digits)) return "Discover";
  return "Card";
}

function expiryValid(expiry: string): boolean {
  const m = expiry.replace(/\s/g, "").match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function ref(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

export const mockProvider: PaymentProvider = {
  name: "mock",

  async createPaymentMethod(card: CardInput): Promise<PaymentMethodResult> {
    const digits = card.number.replace(/[\s-]/g, "");
    if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) return { ok: false, error: "Card number is invalid." };
    if (!expiryValid(card.expiry)) return { ok: false, error: "Card expiry is invalid or in the past." };
    if (!/^\d{3,4}$/.test(card.cvc.trim())) return { ok: false, error: "Security code is invalid." };
    if (!card.nameOnCard.trim()) return { ok: false, error: "Name on card is required." };

    const behavior = BEHAVIORS[digits] ?? "ok";
    return { ok: true, token: `${ref("pm_mock")}_${behavior}`, brand: brandFor(digits), last4: digits.slice(-4) };
  },

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.amountCents <= 0) return { ok: false, reason: "Amount must be greater than zero." };
    const behavior = req.token.split("_").pop() as Behavior;
    if (behavior === "decline") return { ok: false, reason: "Your card was declined." };
    if (behavior === "nsf") return { ok: false, reason: "Your card has insufficient funds." };
    if (behavior === "renewal-fail" && req.offSession) return { ok: false, reason: "Your card was declined." };
    return { ok: true, reference: ref("ch_mock") };
  },
};
