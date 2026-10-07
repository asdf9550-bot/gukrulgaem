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

export default async function GamePage({ params }: Params) {
  const { appid } = await params;
  if (!game(Number(appid))) notFound();
  return <GameDetail appid={Number(appid)} />;
}
