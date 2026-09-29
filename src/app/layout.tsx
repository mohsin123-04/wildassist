import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Bird, Siren } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import NotificationBell from "@/components/NotificationBell";
import Toast from "@/components/Toast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Found an injured or orphaned wild animal in the US or Canada? WildAssist helps you figure out what to do and connects you to the nearest help, from wildlife rehabilitation centres to vets and hotlines.";

export const metadata: Metadata = {
  metadataBase: new URL("https://wildassist.vercel.app"),
  title: {
    default: "WildAssist — Found an injured animal?",
    template: "%s · WildAssist",
  },
  description: DESCRIPTION,
  applicationName: "WildAssist",
  keywords: [
    "injured wildlife",
    "wildlife rehabilitation",
    "found a baby bird",
    "wildlife rescue",
    "animal rescue near me",
    "wildlife rehabilitator",
  ],
  openGraph: {
    type: "website",
    siteName: "WildAssist",
    url: "https://wildassist.vercel.app",
    title: "WildAssist — Found an injured animal?",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "WildAssist — Found an injured animal?",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
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
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm"
              >
                <Bird className="h-4 w-4" />
              </span>
              <span>WildAssist</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/emergency"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100"
              >
                <Siren className="h-4 w-4" aria-hidden />
                Emergency
              </Link>
              <NotificationBell />
              <AccountMenu />
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
        <Toast />
        <ServiceWorkerRegister />

        <footer className="border-t border-zinc-200 px-5 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <Link href="/" className="text-zinc-500 transition-colors hover:text-zinc-900">
                Home
              </Link>
              <Link href="/triage" className="text-zinc-500 transition-colors hover:text-zinc-900">
                Report an animal
              </Link>
              <Link href="/emergency" className="text-zinc-500 transition-colors hover:text-zinc-900">
                Emergency
              </Link>
              <Link href="/login" className="text-zinc-500 transition-colors hover:text-zinc-900">
                Staff login
              </Link>
            </nav>
            <p className="max-w-xl text-xs leading-5 text-zinc-500">
              WildAssist offers general guidance only. In an emergency, contact a
              licensed wildlife rehabilitator directly.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
