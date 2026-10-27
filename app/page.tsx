import Image from "next/image";
import Link from "next/link";
import { DONATION_FUNDS, ORG_NAME, TIERS } from "@/lib/config";
import { formatCents } from "@/lib/format";
import CouncilNote from "@/components/CouncilNote";

export default function Home() {
  const individual = TIERS.find((t) => t.id === "individual")!;
  return (
    <div className="narrow">
      <section className="hero">
        <Image src="/kofc-emblem.png" alt="" width={120} height={120} priority />
        <h1>{ORG_NAME}</h1>
        <p>Charity · Unity · Fraternity · Patriotism</p>
        <p>Become a member, renew automatically each year, and support VKCCI and KOVAR.</p>
      </section>
      <div className="cards">
        <Link href="/join" className="card link-card">
          <h2>Become a member</h2>
          <p>Annual membership {formatCents(individual.priceCents)}/yr.</p>
          <span className="btn btn-primary">Join now</span>
        </Link>
        {DONATION_FUNDS.map((f) => (
          <div key={f.id} className="card link-card">
            <h2>Donate to {f.name}</h2>
            <p>{f.description} Donations are made on the {f.name} website.</p>
            <CouncilNote fund={f} />
            <a href={f.website} target="_blank" rel="noopener noreferrer" className="btn">Give to {f.name} ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
