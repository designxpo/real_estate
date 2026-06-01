import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broker Platform",
  description: "Listings, leads, and commissions for Indian real estate brokers",
};

// Runs before first paint to set the theme from localStorage, preventing a
// flash of the wrong theme on load. Defaults to dark.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('broker-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
