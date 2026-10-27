import { PENNY_PER_DAY, type Tier } from "./config";
import type { LineItem } from "./repo";

/** Line items for one year of membership, plus Penny per Knight per Day if chosen. */
export function duesItems(tier: Tier, pennyPerDay: boolean, label = `${tier.name} membership (1 year)`): LineItem[] {
  const items: LineItem[] = [{ fund: "MEMBERSHIP", description: label, amountCents: tier.priceCents }];
  if (pennyPerDay) items.push({ fund: "PENNY", description: `${PENNY_PER_DAY.name} (1 year)`, amountCents: PENNY_PER_DAY.priceCents });
  return items;
}
