import Image from "next/image";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import WishButton from "@/components/WishButton";
import type { Deal } from "@/lib/data";
import { pct, SUPPORT, TAG, won } from "@/lib/format";
import { kindOf } from "@/lib/kind";

// 목록·순위에서 쓰는 게임 카드 한 장. 줄 수를 고정해 좌우 카드 높이가 같게 한다.
// position(2026-10-11, 사용자 "최고 인기 게임 순서대로"): 목록에서의 차례(1, 2, 3…). 없으면 스팀 판매 순위 번호를 그대로 보인다.
export default function GameCard({ deal, note, position }: { deal: Deal; note?: string; position?: number }) {
  const { game: g, price: p, cheapest, cheaper_than_steam } = deal;
  const all = pct(g.positive_all, g.reviews_all);
  const ko = pct(g.positive_ko, g.reviews_ko);
  const badge = position ?? (g.steam_rank != null && g.steam_rank <= 100 ? g.steam_rank : null);
  const rankStyle = { background: badge != null && badge <= 10 ? "#ef4444" : "var(--line)", color: badge != null && badge <= 10 ? "#fff" : "var(--muted)" };
  const rankTitle = g.steam_rank != null ? `스팀 판매 순위 ${g.steam_rank}위` : undefined;
  // 2026-10-16 (사용자 "모바일에 두 개씩 두 줄로"): md 미만(폰)은 2열 격자 + 세로 카드(그림 위, 글 아래), md 이상은 예전 가로 카드
  return (
    <Link href={`/game/${g.appid}`} scroll={false} className="card min-w-0 overflow-hidden flex flex-col md:flex-row h-full gap-2 md:gap-3 p-2 md:p-3 hover:shadow-md transition-shadow">
      {g.header_image && (
        <div className="relative w-full md:w-36 shrink-0 aspect-[460/215] md:self-center rounded-lg overflow-hidden">
          <Image src={g.header_image} alt="" fill sizes="(max-width: 768px) 50vw, 144px" quality={85} className="object-cover" />
          {badge != null && (
            <span className="md:hidden absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-xs font-extrabold" title={rankTitle} style={rankStyle}>#{badge}</span>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        {/* 1줄: 이름(길면 …) + 판정 */}
        {/* 태블릿(2열)에서 이름이 "De…"처럼 잘리던 것(2026-10-08) → 판정·찜은 줄을 바꿔 내려가고 이름은 한 줄을 다 씀 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          {badge != null && (
            <span className="hidden md:inline shrink-0 rounded-md px-1.5 py-0.5 text-xs font-extrabold" title={rankTitle} style={rankStyle}>#{badge}</span>
          )}
          {/* 폰 2열에서는 이름을 두 줄까지(넘치면 …), md 이상은 한 줄 */}
          <span className="w-full md:w-auto font-bold text-sm md:text-base min-w-0 break-words line-clamp-2 md:block md:whitespace-nowrap md:text-ellipsis">{g.name}</span>
          {/* 폰 2열에서 배지 두 개 + 찜이 칸 밖으로 삐져나와 화면이 옆으로 밀리던 것 → 폰에서는 줄여서 칸 안에서 줄바꿈 */}
          <span className="max-w-full md:shrink-0 flex flex-wrap items-center gap-1">
            <VerdictBadge verdict={p.verdict} kind={kindOf(p, g)} size="sm" />
            {p.tags.includes("korea_warning") && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs md:px-3 md:py-1 md:text-sm font-bold leading-none" style={{ background: "#fee2e2", color: "#b91c1c" }}>{TAG.korea_warning}</span>}
            <WishButton appid={g.appid} />
          </span>
        </div>
        {/* 2줄: 가격 */}
        {/* 좁은 화면에서 "50원/시간 · 역대 최저"가 …로 잘리던 것(2026-10-08) → 항목 단위로 다음 줄로 넘김 */}
        <div className="flex flex-wrap items-baseline gap-x-1.5 md:gap-x-2 gap-y-0.5 text-xs md:text-sm">
          <span className="text-base md:text-lg font-extrabold whitespace-nowrap">{won(p.current_price)}</span>
          {p.discount_pct ? <span className="font-bold whitespace-nowrap" style={{ color: "#16a34a" }}>-{p.discount_pct}%</span> : null}
          <span className="muted line-through whitespace-nowrap">{won(p.regular_price)}</span>
          {/* 2026-10-11 (사용자): "원/시간"은 목록 카드에서 빼고 게임 페이지 안(근거와 함께)에서만 보인다 */}
          {/* 폰 2열은 칸이 좁아 역대 최저는 md 이상에서만(게임 페이지에는 항상 있음) */}
          <span className="hidden md:inline muted whitespace-nowrap">· 역대 최저 {won(p.historical_low)}</span>
        </div>
        {/* 3줄: 한국어·평가 */}
        <div className="text-[11px] md:text-xs muted">
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
