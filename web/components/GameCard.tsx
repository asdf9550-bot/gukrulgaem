import Image from "next/image";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import WishButton from "@/components/WishButton";
import type { Deal } from "@/lib/data";
import { pct, SUPPORT, TAG, won } from "@/lib/format";
import { pricePerHour } from "@/lib/stats";

// 목록·순위에서 쓰는 게임 카드 한 장. 줄 수를 고정해 좌우 카드 높이가 같게 한다.
export default function GameCard({ deal, note }: { deal: Deal; note?: string }) {
  const { game: g, price: p, cheapest, cheaper_than_steam } = deal;
  const all = pct(g.positive_all, g.reviews_all);
  const ko = pct(g.positive_ko, g.reviews_ko);
  const perHour = pricePerHour(p.current_price, g.playtime_median_h_all, g.playtime_n_all);
  return (
    <Link href={`/game/${g.appid}`} scroll={false} className="card flex h-full gap-3 p-3 hover:shadow-md transition-shadow">
      {g.header_image && (
        <div className="relative w-28 sm:w-36 shrink-0 aspect-[460/215] self-center rounded-lg overflow-hidden">
          <Image src={g.capsule_image ?? g.header_image} alt="" fill sizes="(max-width: 640px) 112px, 144px" quality={85} className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        {/* 1줄: 이름(길면 …) + 판정 */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-x-2 gap-y-1 min-w-0">
          {g.steam_rank != null && g.steam_rank <= 100 && (
            <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-extrabold" style={{ background: g.steam_rank <= 10 ? "#ef4444" : "var(--line)", color: g.steam_rank <= 10 ? "#fff" : "var(--muted)" }}>#{g.steam_rank}</span>
          )}
          <span className="font-bold truncate">{g.name}</span>
          <span className="shrink-0 flex items-center gap-1">
            <VerdictBadge verdict={p.verdict} />
            {p.tags.includes("korea_warning") && <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-none" style={{ background: "#fee2e2", color: "#b91c1c" }}>{TAG.korea_warning}</span>}
            <WishButton appid={g.appid} />
          </span>
        </div>
        {/* 2줄: 가격 */}
        {/* 좁은 화면에서 "50원/시간 · 역대 최저"가 …로 잘리던 것(2026-10-08) → 항목 단위로 다음 줄로 넘김 */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="text-lg font-extrabold whitespace-nowrap">{won(p.current_price)}</span>
          {p.discount_pct ? <span className="font-bold whitespace-nowrap" style={{ color: "#16a34a" }}>-{p.discount_pct}%</span> : null}
          <span className="muted line-through whitespace-nowrap">{won(p.regular_price)}</span>
          {perHour != null && <span className="font-bold whitespace-nowrap" style={{ color: "#ef4444" }}>· {perHour.toLocaleString("ko-KR")}원/시간</span>}
          <span className="muted whitespace-nowrap">· 역대 최저 {won(p.historical_low)}</span>
        </div>
        {/* 3줄: 한국어·평가 */}
        <div className="text-xs muted">
          {cheaper_than_steam && cheapest
            ? <span className="font-bold" style={{ color: "#16a34a" }}>최저 {cheapest.store_name} {cheapest.is_estimate ? "약 " : ""}{won(cheapest.price_krw)} · </span>
            : null}
          {SUPPORT[g.korean_support]} · 전체 {all ?? "-"}% / 한국 {ko ?? "-"}%
          {g.gap_pp != null && <> ({g.gap_pp > 0 ? "+" : ""}{g.gap_pp}%p)</>}
          {g.metacritic != null && <> · <span className="font-bold" style={{ color: g.metacritic >= 75 ? "#16a34a" : g.metacritic >= 50 ? "#ca8a04" : "#dc2626" }}>메타 {g.metacritic}</span></>}
          {note && <> · <span style={{ color: "var(--fg)" }}>{note}</span></>}
        </div>
      </div>
    </Link>
  );
}
