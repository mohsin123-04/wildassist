import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
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

// Editorial display serif — gives headings a distinct voice from the body,
// the single biggest lever against a generic "default template" look.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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
  themeColor: "#faf9f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />

        <div className="flex flex-1 flex-col">{children}</div>
        <Toast />
        <ServiceWorkerRegister />

        <footer className="bg-forest-950 px-5 py-12 text-cream">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center">
            <span className="font-display text-lg font-medium tracking-tight text-cream">
              WildAssist
            </span>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/" className="text-cream/60 transition-colors hover:text-cream">
                Home
              </Link>
              <Link href="/triage" className="text-cream/60 transition-colors hover:text-cream">
                Report an animal
              </Link>
              <Link href="/emergency" className="text-cream/60 transition-colors hover:text-cream">
                Emergency
              </Link>
              <Link href="/login" className="text-cream/60 transition-colors hover:text-cream">
                Staff login
              </Link>
            </nav>
            <p className="max-w-xl text-xs leading-5 text-cream/50">
              WildAssist offers general guidance only. In an emergency, contact a
              licensed wildlife rehabilitator directly.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
