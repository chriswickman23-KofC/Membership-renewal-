# Membership & Donations

A membership management and payment system with annual auto-renewing dues.
Donations to **VKCCI** and **KOVAR** link out to each organization's own website.

Built with Next.js 16 and SQLite (Node's built-in `node:sqlite`, so no native dependencies). Requires Node 22.13+.

## Run it

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and CRON_SECRET
npm run dev
```

- Public site: http://localhost:3000
- Staff admin: http://localhost:3000/admin (password = `ADMIN_PASSWORD`)

Data is stored in `data/membership.db`. Override the folder with `DATA_DIR`.

## What's included

**Public**
- `/join`: pick a membership level and opt in to auto-renew. VKCCI and KOVAR each have a "Donate on the … website" button that opens that organization's donation page in a new tab, so the membership form isn't lost.
- **Penny per Knight per Day** ($3.65/yr, `PENNY_PER_DAY` in `lib/config.ts`): an optional add-on, checked by default, charged with dues and renewed with them each year. Staff can add or remove it per member; it's reported as its own line in revenue and exports.
- Council number **11136** (`COUNCIL_NUMBER` in `lib/config.ts`): the KOVAR (GiveDirect) link fills in its "Council Number" field automatically. VKCCI's CardPointe page can't be prefilled, so donors are told to enter 11136 in its "Member #" field and get a Copy button.
- "Donate to VKCCI / KOVAR" links in the header and on the home page go straight to each organization's website.
- `/receipt/<token>`: an itemized receipt. Links are unguessable tokens, not sequential IDs.
- Joining again with an existing email renews early and adds a year to the current expiry.

**Admin**
- Dashboard: member counts by status, membership revenue (year to date and all time), memberships expiring in the next 30 days, recent payments.
- Members: search and filter, plus a detail page where staff can turn auto-renew on or off, cancel, record a cash or check payment (adds a year), and keep notes.
- Payments: every attempt, including failures.
- CSV exports for members and payments.

**Auto-renewal** (`lib/renewals.ts`)
- When a membership reaches its expiry date, the saved card is charged for one more year. The anniversary date is kept.
- If the charge fails, the member becomes `past_due` and the charge is retried every 3 days.
- Past-due memberships expire after a 14-day grace period. Memberships without auto-renew expire on their expiry date.
- Run renewals daily from any scheduler:
  ```bash
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/renewals
  ```
  Or click **Run due renewals now** on the dashboard.

## Configuration

Edit `lib/config.ts` to change membership levels and prices, the VKCCI and KOVAR website links, and the grace and retry periods.
Set the organization name with `ORG_NAME`.

## Payments (currently mocked)

`lib/payments/mock.ts` simulates a processor; no money moves and full card numbers are never stored. Test cards (any future expiry, any CVC):

| Card | Result |
| --- | --- |
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 0341 | First payment succeeds; auto-renewals fail |

To go live, write a provider that implements `PaymentProvider` (`lib/payments/types.ts`) and set it in `lib/payments/index.ts`.
With Stripe, replace the card fields with Stripe Elements so card data never reaches this server.

## Not built yet
- Email receipts and renewal reminders (the dashboard lists who to remind).
- Self-service member portal (update card, cancel auto-renew).
- Real payment processor and production hosting.
