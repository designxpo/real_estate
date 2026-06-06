import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Allow the public marketing surface; keep the authenticated SaaS + APIs out of
// the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/explore"],
        disallow: [
          "/api/", "/home", "/leads", "/my-leads", "/deals", "/contacts", "/properties",
          "/listings", "/marketplace", "/search", "/settings", "/billing", "/ops",
          "/broadcast", "/analytics", "/reports", "/platform", "/login", "/signup",
          "/onboarding", "/landlord", "/suspended",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
