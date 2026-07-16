import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poloko Admin",
  description:
    "Manage Poloko Tombstones leads, quotations, payments and manufacturing orders.",
  applicationName: "Poloko Admin",
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poloko Admin",
  },
  icons: {
    apple: "/poloko-tombstones-logo.png",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

