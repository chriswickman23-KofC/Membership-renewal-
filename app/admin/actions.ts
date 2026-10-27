"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, requireAdmin, startAdminSession } from "@/lib/auth";
import { getTier } from "@/lib/config";
import { transaction } from "@/lib/db";
import { duesItems } from "@/lib/dues";
import { addYears } from "@/lib/format";
import { processRenewals } from "@/lib/renewals";
import { getMember, insertPayment, updateMember } from "@/lib/repo";

export async function loginAction(_prev: { error: string | null }, fd: FormData): Promise<{ error: string | null }> {
  const ok = await startAdminSession(String(fd.get("password") ?? ""));
  if (!ok) return { error: "Incorrect password." };
  redirect("/admin");
}

export async function logoutAction() {
  await endAdminSession();
  redirect("/admin/login");
}

export async function runRenewalsAction() {
  await requireAdmin();
  const r = await processRenewals();
  revalidatePath("/admin", "layout");
  redirect(`/admin?renewed=${r.renewed}&failed=${r.failed}&expired=${r.expired}`);
}

export async function setAutoRenewAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  updateMember(id, { auto_renew: fd.get("auto_renew") === "1" ? 1 : 0 });
  revalidatePath(`/admin/members/${id}`);
}

export async function setPennyPerDayAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  updateMember(id, { penny_per_day: fd.get("penny_per_day") === "1" ? 1 : 0 });
  revalidatePath(`/admin/members/${id}`);
}

export async function cancelMembershipAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  updateMember(id, { status: "cancelled", auto_renew: 0 });
  revalidatePath(`/admin/members/${id}`);
}

/** Records a cash/check payment for one year of dues and extends the membership. */
export async function recordOfflinePaymentAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const method = String(fd.get("method") ?? "check");
  const reference = String(fd.get("reference") ?? "").trim();
  const m = getMember(id);
  const tier = m && getTier(m.tier);
  if (!m || !tier) return;

  const now = new Date().toISOString();
  const base = m.expires_at > now && m.status !== "cancelled" && m.status !== "expired" ? m.expires_at : now;
  transaction(() => {
    insertPayment({
      memberId: m.id, name: `${m.first_name} ${m.last_name}`, email: m.email, kind: "renewal", status: "succeeded",
      provider: method, providerRef: reference || null, failureReason: null, cardBrand: null, cardLast4: null,
      items: duesItems(tier, !!m.penny_per_day, `${tier.name} membership (1 year, paid by ${method})`),
      createdAt: now,
    });
    updateMember(m.id, { status: "active", expires_at: addYears(base, 1), last_renewal_attempt_at: null });
  });
  revalidatePath(`/admin/members/${id}`);
}

export async function saveNotesAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  updateMember(id, { notes: String(fd.get("notes") ?? "") });
  revalidatePath(`/admin/members/${id}`);
}
