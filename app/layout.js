import { Cormorant_Garamond, Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const accent = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-accent",
});
const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata = {
  title: "ANCHOR — Gamma & Charm Exposure",
  description: "GEX and charm exposure dashboard for NVDA, GOOGL, AMZN, SPY, QQQ",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${accent.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
