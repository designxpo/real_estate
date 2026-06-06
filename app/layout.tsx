import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keya",
  description: "Listings, leads, and commissions for Indian real estate brokers",
};

// Runs before first paint to set the theme from localStorage, preventing a
// flash of the wrong theme on load. Defaults to light (editorial-premium).
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('broker-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
