import type { Metadata, Viewport } from "next";
import { Courier_Prime, Hanken_Grotesk, League_Gothic, Rozha_One } from "next/font/google";
import Link from "next/link";
import { SITE } from "@/lib/config";
import "./globals.css";

const display = Rozha_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const marquee = League_Gothic({ subsets: ["latin"], variable: "--font-marquee" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });
const stub = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-stub" });

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
};

export const viewport: Viewport = { themeColor: "#100b09" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${marquee.variable} ${body.variable} ${stub.variable}`}
    >
      <body>
        <header className="site-header">
          <Link href="/" className="wordmark">
            {SITE.name}
          </Link>
          <nav aria-label="Main">
            <Link href="/#now-showing">Now showing</Link>
            <Link href="/submit" className="nav-ticket">
              Submit a film
            </Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <p>{SITE.tagline}</p>
          <p>
            Every film carries the licence it was submitted under.{" "}
            <Link href="/takedown">Report a film</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
