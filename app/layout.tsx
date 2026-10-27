import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COUNCIL_NUMBER, DONATION_FUNDS, ORG_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${ORG_NAME} — Membership`,
  description: "Join, renew, and support VKCCI and KOVAR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <Image src="/kofc-emblem.png" alt="Knights of Columbus emblem" width={44} height={44} priority />
            <span>
              <span className="brand-top">Knights of Columbus</span>
              <span className="brand-sub">Council {COUNCIL_NUMBER}</span>
            </span>
          </Link>
          <nav>
            <Link href="/join">Join</Link>
            {DONATION_FUNDS.map((f) => (
              <a key={f.id} href={f.website} target="_blank" rel="noopener noreferrer">Donate to {f.name} ↗</a>
            ))}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <span>© {new Date().getFullYear()} {ORG_NAME}. Knights of Columbus and the emblem are registered trademarks of the Knights of Columbus.</span>
          <Link href="/admin">Staff login</Link>
        </footer>
      </body>
    </html>
  );
}
