import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/products"],
      disallow: [
        "/admin/",
        "/account/",
        "/checkout/",
        "/orders/",
        "/api/",
        "/wishlist/",
        "/cart/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}