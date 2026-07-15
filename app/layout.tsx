import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "./pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poloko Tombstones | A Legacy Carved in Stone",
  description:
    "Poloko Tombstones provides premium granite tombstones, headstones, ledgers, granite kitchen tops, quartz kitchen tops, and cut-to-size granite in the North West Province, South Africa.",
  applicationName: "Poloko Tombstones",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poloko Tombstones",
  },
  icons: {
    apple: "/poloko-tombstones-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14110D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
