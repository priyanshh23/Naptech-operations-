import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Naptech Factory OS",
  description: "Inventory and production tracking for automobile SMEs",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
