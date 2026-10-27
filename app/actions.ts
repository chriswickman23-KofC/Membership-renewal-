"use server";

import { redirect } from "next/navigation";
import { getTier } from "@/lib/config";
import { transaction } from "@/lib/db";
import { paymentProvider, type CardInput } from "@/lib/payments";
import { duesItems } from "@/lib/dues";
import { insertPayment, upsertMemberAfterPayment } from "@/lib/repo";

export interface FormState {
  error: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function readCard(fd: FormData): CardInput {
  return { number: str(fd, "card_number"), expiry: str(fd, "card_expiry"), cvc: str(fd, "card_cvc"), nameOnCard: str(fd, "card_name") };
}

export async function joinAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const firstName = str(fd, "first_name");
  const lastName = str(fd, "last_name");
  const email = str(fd, "email");
  const tier = getTier(str(fd, "tier"));

  if (!firstName || !lastName) return { error: "Please enter your first and last name." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (!tier) return { error: "Please choose a membership level." };

  const pennyPerDay = fd.get("penny_per_day") === "on";
  const items = duesItems(tier, pennyPerDay);
  const total = items.reduce((s, i) => s + i.amountCents, 0);

  const method = await paymentProvider.createPaymentMethod(readCard(fd));
  if (!method.ok) return { error: method.error };

  const charge = await paymentProvider.charge({
    token: method.token,
    amountCents: total,
    description: `${tier.name} membership`,
    offSession: false,
  });

  const now = new Date().toISOString();
  const name = `${firstName} ${lastName}`;

  if (!charge.ok) {
    insertPayment({
      memberId: null, name, email, kind: "new_membership", status: "failed", provider: paymentProvider.name,
      providerRef: null, failureReason: charge.reason, cardBrand: method.brand, cardLast4: method.last4, items, createdAt: now,
    });
    return { error: `Payment failed: ${charge.reason}` };
  }

  const receipt = transaction(() => {
    const { memberId, isNew } = upsertMemberAfterPayment(
      {
        firstName, lastName, email, tier: tier.id, autoRenew: fd.get("auto_renew") === "on", pennyPerDay,
        phone: str(fd, "phone"), address: str(fd, "address"), city: str(fd, "city"), state: str(fd, "state"), zip: str(fd, "zip"),
      },
      { token: method.token, brand: method.brand, last4: method.last4 },
      now,
    );
    return insertPayment({
      memberId, name, email, kind: isNew ? "new_membership" : "renewal", status: "succeeded", provider: paymentProvider.name,
      providerRef: charge.reference, failureReason: null, cardBrand: method.brand, cardLast4: method.last4, items, createdAt: now,
    });
  });

  redirect(`/receipt/${receipt.receiptToken}`);
}
