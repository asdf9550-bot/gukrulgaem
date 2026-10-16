import Image from "next/image";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import { deals } from "@/lib/data";
import { won } from "@/lib/format";
import { kindOf } from "@/lib/kind";

// 2026-10-16 (경쟁 사이트 비교): 같은 장르·비슷한 가격대의 다른 할인 게임 4개. 판정 좋은 것 우선.
export default function SimilarGames({ appid, genres, price }: { appid: number; genres: string[]; price: number | null }) {
  const mine = new Set(genres.filter((g) => g !== "인디"));   // "인디"는 너무 흔해서 빼고 비교
  const scored = deals()
    .filter((d) => d.game.appid !== appid)
    .map((d) => {
      const shared = d.game.genres.filter((g) => mine.has(g)).length;
      const ratio = price && d.price.current_price ? Math.abs(Math.log(d.price.current_price / price)) : 9;
      const verdictBonus = d.price.verdict === "floor" ? 2 : d.price.verdict === "good" ? 1 : d.price.verdict === "trap" ? -3 : 0;
      const warn = d.price.tags.includes("korea_warning") ? -2 : 0;
      return { d, score: shared * 3 + (ratio < 0.5 ? 2 : ratio < 1 ? 1 : 0) + verdictBonus + warn + Math.min(d.game.reviews_all, 50_000) / 50_000 };
    })
    .filter((x) => x.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  if (scored.length === 0) return null;
  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
        <h2 className="text-lg font-bold whitespace-nowrap">이 게임 봤으면 이것도</h2>
        <span className="text-xs muted">같은 장르 · 비슷한 가격 · 할인 중</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {scored.map(({ d }) => (
          <Link key={d.game.appid} href={`/game/${d.game.appid}`} scroll={false} className="rounded-xl overflow-hidden hover:shadow-md transition-shadow" style={{ background: "var(--bg)", border: "1px solid var(--line)" }}>
            <div className="relative aspect-[460/215]">
              {d.game.header_image && <Image src={d.game.header_image} alt="" fill sizes="(max-width: 640px) 45vw, 220px" className="object-cover" />}
            </div>
            <div className="p-2 space-y-1">
              <div className="font-bold text-sm line-clamp-2">{d.game.name}</div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                <span className="font-extrabold text-sm">{won(d.price.current_price)}</span>
                {d.price.discount_pct ? <span className="font-bold" style={{ color: "#16a34a" }}>-{d.price.discount_pct}%</span> : null}
                <VerdictBadge verdict={d.price.verdict} kind={kindOf(d.price, d.game)} size="sm" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
