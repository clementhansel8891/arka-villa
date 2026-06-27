import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/web/", "/m/", "/admin", "/api/", "/login", "/profile"],
      },
    ],
    sitemap: "https://arka-villa.com/sitemap.xml",
  };
}
