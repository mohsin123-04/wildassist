import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WildAssist | Found an injured animal?",
  description:
    "Found an injured or orphaned wild animal in Ontario? WildAssist helps you figure out what to do and connects you to the nearest wildlife rehabilitation centre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-[var(--background)]/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-emerald-900"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-base"
              >
                🦉
              </span>
              <span>WildAssist</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden px-2 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-emerald-800 sm:block"
              >
                Staff
              </Link>
              <Link
                href="/emergency"
                className="rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
              >
                Emergency
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="border-t border-black/5 px-5 py-5 text-center text-xs leading-5 text-zinc-500">
          WildAssist offers general guidance only. In an emergency, contact a
          licensed wildlife rehabilitator directly.
        </footer>
      </body>
    </html>
  );
}
