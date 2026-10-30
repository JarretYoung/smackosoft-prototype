import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TimezoneCookie } from "@/src/components/timezone-cookie";
import { Toaster } from "@/src/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smackosoft",
  description: "Track your badminton sessions, matches and scores.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

/** Below the 3.5rem sticky page header, with a little air. */
const TOAST_TOP = "calc(env(safe-area-inset-top) + 4rem)";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <TimezoneCookie />
        <Toaster position="top-center" offset={TOAST_TOP} mobileOffset={TOAST_TOP} />
      </body>
    </html>
  );
}
