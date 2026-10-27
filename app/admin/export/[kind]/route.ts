import { isAdmin } from "@/lib/auth";
import { getTier } from "@/lib/config";
import { listMembers, listPayments } from "@/lib/repo";

function csv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          let s = v == null ? "" : String(v);
          // Neutralize spreadsheet formula injection.
          if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { kind } = await params;
  const sp = new URL(req.url).searchParams;
  let body: string;

  if (kind === "members") {
    const members = listMembers({ q: sp.get("q") || undefined, status: sp.get("status") || undefined });
    body = csv([
      ["id", "first_name", "last_name", "email", "phone", "address", "city", "state", "zip", "level", "status", "auto_renew", "penny_per_day", "joined", "expires"],
      ...members.map((m) => [
        m.id, m.first_name, m.last_name, m.email, m.phone, m.address, m.city, m.state, m.zip,
        getTier(m.tier)?.name ?? m.tier, m.status, m.auto_renew ? "yes" : "no", m.penny_per_day ? "yes" : "no", m.joined_at.slice(0, 10), m.expires_at.slice(0, 10),
      ]),
    ]);
  } else if (kind === "payments") {
    const payments = listPayments({ limit: 100_000 });
    const sum = (p: (typeof payments)[number], fund: string) => dollars(p.items.filter((i) => i.fund === fund).reduce((s, i) => s + i.amount_cents, 0));
    body = csv([
      ["payment_id", "date", "name", "email", "type", "status", "membership", "penny_per_day", "total", "processor", "processor_ref", "failure_reason"],
      ...payments.map((p) => [
        p.id, p.created_at, p.name, p.email, p.kind, p.status, sum(p, "MEMBERSHIP"), sum(p, "PENNY"), dollars(p.total_cents), p.provider, p.provider_ref, p.failure_reason,
      ]),
    ]);
  } else {
    return new Response("Not found", { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${stamp}.csv"`,
    },
  });
}
