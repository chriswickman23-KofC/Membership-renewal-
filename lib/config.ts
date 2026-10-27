// Central settings for membership tiers and donation funds.
// Edit prices and descriptions here; amounts are in cents.

export const ORG_NAME = process.env.ORG_NAME ?? "Knights of Columbus Council 11136";

export type TierId = "individual" | "under_25";

export interface Tier {
  id: TierId;
  name: string;
  priceCents: number;
  description: string;
}

export const TIERS: Tier[] = [
  { id: "individual", name: "Individual", priceCents: 5000, description: "One adult member" },
  { id: "under_25", name: "25 and Under", priceCents: 3200, description: "Members aged 25 and under" },
];

export function getTier(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export type FundId = "MEMBERSHIP" | "PENNY" | "VKCCI" | "KOVAR";
export type DonationFundId = "VKCCI" | "KOVAR";

export interface DonationFund {
  id: DonationFundId;
  slug: string;
  name: string;
  description: string;
  /** Donations are made on the organization's own website. */
  website: string;
  /** Label of the field on that website where donors enter our council number. */
  councilField: string;
  /** True if the website link already fills in the council number. */
  councilPrefilled: boolean;
}

export const COUNCIL_NUMBER = "11136";

export const DONATION_FUNDS: DonationFund[] = [
  {
    id: "VKCCI", slug: "vkcci", name: "VKCCI", description: "Support the programs and community work of VKCCI.",
    // CardPointe's pay page doesn't accept prefilled fields, so donors type the number into "Member #".
    website: "https://virginiaknights.securepayments.cardpointe.com/pay",
    councilField: "Member #",
    councilPrefilled: false,
  },
  {
    id: "KOVAR", slug: "kovar", name: "KOVAR", description: "Support the programs and community work of KOVAR.",
    // GiveDirect fills its "Council Number" field (txt1) from the link.
    website: `https://donate.givedirect.org/?cid=1467&txt1=${COUNCIL_NUMBER}`,
    councilField: "Council Number",
    councilPrefilled: true,
  },
];

export function getFundBySlug(slug: string): DonationFund | undefined {
  return DONATION_FUNDS.find((f) => f.slug === slug.toLowerCase());
}

export const FUND_LABELS: Record<FundId, string> = {
  MEMBERSHIP: "Membership dues",
  PENNY: "Penny per Knight per Day",
  VKCCI: "VKCCI donation",
  KOVAR: "KOVAR donation",
};


/** Optional yearly add-on charged with membership dues (one penny a day for a year). */
export const PENNY_PER_DAY = {
  name: "Penny per Knight per Day",
  priceCents: 365,
  description: "One penny a day for a year, collected with your annual dues.",
};

// Auto-renewal policy
export const RENEWAL_GRACE_DAYS = 14; // past_due members are expired after this
export const RENEWAL_RETRY_DAYS = 3; // wait between failed renewal attempts
export const EXPIRING_SOON_DAYS = 30;
