import type { DonationFund } from "@/lib/config";
import CouncilNote from "./CouncilNote";

/**
 * Link to the organization's own donation page. Opens in a new tab so the
 * membership form stays intact; nothing is charged here.
 */
export default function DonationPicker({ fund }: { fund: DonationFund }) {
  return (
    <div className="donate-out">
      <a href={fund.website} target="_blank" rel="noopener noreferrer" className="btn">
        Donate on the {fund.name} website ↗
      </a>
      <CouncilNote fund={fund} />
    </div>
  );
}
