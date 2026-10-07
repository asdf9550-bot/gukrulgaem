import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDetail from "@/components/GameDetail";
import { game, games } from "@/lib/data";
import { SUPPORT, VERDICT, won } from "@/lib/format";

type Params = { params: Promise<{ appid: string }> };

export function generateStaticParams() {
  return games().map((g) => ({ appid: String(g.appid) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { appid } = await params;
  const row = game(Number(appid));
  if (!row) return { title: "게임을 찾을 수 없음" };
  const { game: g, price: p } = row;
  const title = `${g.name} ${p.discount_pct ? `${p.discount_pct}% 할인` : ""} — ${p.verdict_label}`;
  const description = `${g.name} 한국 스팀 가격 ${won(p.current_price)} (정가 ${won(p.regular_price)}, 역대 최저 ${won(p.historical_low)}). ${VERDICT[p.verdict].short}. ${SUPPORT[g.korean_support]}.`;
  return {
    title, description,
    openGraph: { title, description, images: g.header_image ? [g.header_image] : [], locale: "ko_KR", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.com";

/** 검색 엔진용 상품 정보(JSON-LD): 구글 검색 결과에 가격·평점이 같이 뜨게 */
function productLd(appid: number) {
  const row = game(appid);
  if (!row) return null;
  const { game: g, price: p } = row;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org", "@type": "Product", name: g.name, url: `${SITE}/game/${g.appid}`,
    image: g.header_image ?? undefined, category: "PC 게임", brand: { "@type": "Brand", name: "Steam" },
  };
  if (p.current_price != null) {
    ld.offers = {
      "@type": "Offer", priceCurrency: "KRW", price: p.current_price, url: g.steam_url, availability: "https://schema.org/InStock",
      ...(p.sale_end_at ? { priceValidUntil: p.sale_end_at.slice(0, 10) } : {}),
    };
  }
  if (g.reviews_all > 0) {
    ld.aggregateRating = { "@type": "AggregateRating", ratingValue: Math.round(g.positive_all / g.reviews_all * 100) / 20, bestRating: 5, ratingCount: g.reviews_all };
  }
  return ld;
}

export default async function GamePage({ params }: Params) {
  const { appid } = await params;
  if (!game(Number(appid))) notFound();
  const ld = productLd(Number(appid));
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <GameDetail appid={Number(appid)} />
    </>
  );
}
