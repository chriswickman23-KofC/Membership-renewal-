"use client";

import { useState } from "react";
import { COUNCIL_NUMBER, type DonationFund } from "@/lib/config";

/** Tells donors which council number to use on the organization's website. */
export default function CouncilNote({ fund }: { fund: DonationFund }) {
  const [copied, setCopied] = useState(false);

  if (fund.councilPrefilled) {
    return (
      <p className="council small">
        Council number <strong>{COUNCIL_NUMBER}</strong> is filled in for you on the {fund.name} form.
      </p>
    );
  }

  return (
    <p className="council small">
      On the {fund.name} form, enter council number <strong>{COUNCIL_NUMBER}</strong> in the &ldquo;{fund.councilField}&rdquo; field.{" "}
      <button
        type="button"
        className="btn btn-small"
        onClick={() => {
          navigator.clipboard?.writeText(COUNCIL_NUMBER).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}
