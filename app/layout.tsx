import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscription Auditor",
  description: "Detect recurring charges, forgotten subscriptions, and price hikes.",
};

// Runs before paint to set the theme class, avoiding a light/dark flash.
const noFlashScript = `
(function () {
  try {
    var t = localStorage.getItem('sa.theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="app-backdrop">{children}</body>
    </html>
  );
}
