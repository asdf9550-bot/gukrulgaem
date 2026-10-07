import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.com";

// 검색 로봇 안내: 관리자·API 는 빼고 나머지는 허용
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
