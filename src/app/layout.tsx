import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Bird } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import NotificationBell from "@/components/NotificationBell";
import Toast from "@/components/Toast";
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
  title: "WildAssist | Found an injured animal?",
  description:
    "Found an injured or orphaned wild animal in the US or Canada? WildAssist helps you figure out what to do and connects you to the nearest help, from wildlife rehabilitation centres to vets and hotlines.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-display text-[15px] font-semibold tracking-tight text-zinc-900"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm"
              >
                <Bird className="h-4 w-4" />
              </span>
              <span>WildAssist</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/emergency"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Emergency
              </Link>
              <NotificationBell />
              <AccountMenu />
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
        <Toast />

        <footer className="border-t border-zinc-200 px-5 py-6 text-center text-xs leading-5 text-zinc-400">
          WildAssist offers general guidance only. In an emergency, contact a
          licensed wildlife rehabilitator directly.
        </footer>
      </body>
    </html>
  );
}
