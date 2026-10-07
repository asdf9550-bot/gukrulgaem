import type { MetadataRoute } from "next";
import { games, lastUpdated } from "@/lib/data";

// 검색 엔진용 사이트맵: 고정 페이지 + 게임 상세 전부
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = lastUpdated() ? new Date(lastUpdated()!) : new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/rank`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/about`, lastModified: updated, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/video`, lastModified: updated, changeFrequency: "weekly", priority: 0.5 },
  ];
  const pages: MetadataRoute.Sitemap = games().map((g) => ({
    url: `${SITE}/game/${g.appid}`, lastModified: new Date(g.updated_at || updated), changeFrequency: "daily", priority: 0.7,
  }));
  return [...fixed, ...pages];
}
