import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poloko Tombstones Admin",
  description:
    "Manage Poloko Tombstones leads, quotations, payments and manufacturing orders.",
  applicationName: "Poloko Tombstones Admin",
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poloko Tombstones Admin",
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
