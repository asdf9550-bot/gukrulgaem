import Image from "next/image";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import WishButton from "@/components/WishButton";
import type { Deal } from "@/lib/data";
import { pct, SUPPORT, TAG, won } from "@/lib/format";

// 목록·순위에서 쓰는 게임 카드 한 장. 줄 수를 고정해 좌우 카드 높이가 같게 한다.
// position(2026-10-11, 사용자 "최고 인기 게임 순서대로"): 목록에서의 차례(1, 2, 3…). 없으면 스팀 판매 순위 번호를 그대로 보인다.
export default function GameCard({ deal, note, position }: { deal: Deal; note?: string; position?: number }) {
  const { game: g, price: p, cheapest, cheaper_than_steam } = deal;
  const all = pct(g.positive_all, g.reviews_all);
  const ko = pct(g.positive_ko, g.reviews_ko);
  const badge = position ?? (g.steam_rank != null && g.steam_rank <= 100 ? g.steam_rank : null);
  return (
    <Link href={`/game/${g.appid}`} scroll={false} className="card flex h-full gap-3 p-3 hover:shadow-md transition-shadow">
      {g.header_image && (
        <div className="relative w-28 sm:w-36 shrink-0 aspect-[460/215] self-center rounded-lg overflow-hidden">
          <Image src={g.capsule_image ?? g.header_image} alt="" fill sizes="(max-width: 640px) 112px, 144px" quality={85} className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        {/* 1줄: 이름(길면 …) + 판정 */}
        {/* 태블릿(2열)에서 이름이 "De…"처럼 잘리던 것(2026-10-08) → 판정·찜은 줄을 바꿔 내려가고 이름은 한 줄을 다 씀 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          {badge != null && (
            <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-extrabold" title={g.steam_rank != null ? `스팀 판매 순위 ${g.steam_rank}위` : undefined}
              style={{ background: badge <= 10 ? "#ef4444" : "var(--line)", color: badge <= 10 ? "#fff" : "var(--muted)" }}>#{badge}</span>
          )}
          {/* 폰에서는 긴 이름이 …로 잘리는 대신 줄바꿈(2026-10-08) */}
          <span className="font-bold min-w-0 break-words sm:truncate">{g.name}</span>
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
          {/* 2026-10-11 (사용자): "원/시간"은 목록 카드에서 빼고 게임 페이지 안(근거와 함께)에서만 보인다 */}
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
