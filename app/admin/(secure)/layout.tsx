import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <nav className="admin-nav">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/members">Members</Link>
        <Link href="/admin/payments">Payments</Link>
        <form action={logoutAction}>
          <button className="linklike">Sign out</button>
        </form>
      </nav>
      <div className="admin-body">{children}</div>
    </div>
  );
}
