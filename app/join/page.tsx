import JoinForm from "@/components/JoinForm";
import { IS_TEST_MODE } from "@/lib/payments";

export const metadata = { title: "Join — Membership" };

export default function JoinPage() {
  return (
    <div className="narrow">
      <h1>Become a member</h1>
      <p className="muted">Membership runs for one year from the date you join. Already a member? Use the same email to renew early.</p>
      <JoinForm testMode={IS_TEST_MODE} />
    </div>
  );
}
