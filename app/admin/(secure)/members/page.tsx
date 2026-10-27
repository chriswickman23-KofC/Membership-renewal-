import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { getTier } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { listMembers } from "@/lib/repo";

const STATUSES = ["", "active", "past_due", "expired", "cancelled"];

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const members = listMembers({ q: q || undefined, status: status || undefined });
  const exportQuery = new URLSearchParams({ ...(q && { q }), ...(status && { status }) }).toString();

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Members <span className="muted">({members.length})</span></h1>
        <a className="btn" href={`/admin/export/members${exportQuery ? `?${exportQuery}` : ""}`}>Export CSV</a>
      </div>
      <form className="filters">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone" aria-label="Search members" />
        <select name="status" defaultValue={status} aria-label="Status">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>)}
        </select>
        <button className="btn">Filter</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Level</th><th>Status</th><th>Expires</th><th>Auto-renew</th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/admin/members/${m.id}`}>{m.last_name}, {m.first_name}</Link></td>
                <td>{m.email}</td>
                <td>{getTier(m.tier)?.name ?? m.tier}</td>
                <td><StatusBadge status={m.status} /></td>
                <td>{formatDate(m.expires_at)}</td>
                <td>{m.auto_renew ? "On" : "Off"}</td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={6} className="muted">No members found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
