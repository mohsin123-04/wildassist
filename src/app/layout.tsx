import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "WildAssist — Found an injured animal?",
  description:
    "Found an injured or orphaned wild animal in Ontario? WildAssist helps you figure out what to do and connects you to the nearest wildlife rehabilitation centre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/5 bg-white/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="text-lg">🦉</span>
              <span>WildAssist</span>
            </Link>
            <span className="text-xs text-emerald-700/80">Ontario</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-black/5 px-5 py-4 text-center text-xs text-zinc-500">
          WildAssist offers general guidance only. In an emergency, contact a licensed
          wildlife rehabilitator directly.
        </footer>
      </body>
    </html>
  );
}
