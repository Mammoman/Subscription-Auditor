import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscription Auditor",
  description: "Detect recurring charges, forgotten subscriptions, and price hikes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-backdrop">{children}</body>
    </html>
  );
}
