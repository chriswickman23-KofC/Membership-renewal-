const LABELS: Record<string, string> = {
  active: "Active",
  past_due: "Past due",
  expired: "Expired",
  cancelled: "Cancelled",
  succeeded: "Paid",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
