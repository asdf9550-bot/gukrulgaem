import Image from "next/image";
import CountUp from "@/components/CountUp";
import PriceChart from "@/components/PriceChart";
import ReviewGap from "@/components/ReviewGap";
import SaleCountdown from "@/components/SaleCountdown";
import VerdictBadge from "@/components/VerdictBadge";
import { game, offersFor, reviewHistory, seasons, storesList, videos } from "@/lib/data";
import StoreCompare from "@/components/StoreCompare";
import EditionCompare from "@/components/EditionCompare";
import KoreanReviews from "@/components/KoreanReviews";
import WhyDisliked from "@/components/WhyDisliked";
import { reviewSummaryFor } from "@/lib/data";
import WishButton from "@/components/WishButton";

const DECK: Record<string, { label: string; tone: "good" | "warn" | "bad" | "plain" }> = {
  verified: { label: "스팀덱 확인됨", tone: "good" }, playable: { label: "스팀덱 플레이 가능", tone: "warn" },
  unsupported: { label: "스팀덱 지원 안 함", tone: "bad" }, unknown: { label: "", tone: "plain" },
};
import { kst, pct, SUPPORT, VERDICT, won } from "@/lib/format";
import { daysUntil, hours, nextSeason, pricePerHour, regretIndex, saleStats } from "@/lib/stats";

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "good" | "warn" | "bad" | "info" }) {
  const tones = {
    plain: { background: "var(--line)", color: "var(--fg)" },
    good: { background: "#dcfce7", color: "#15803d" },
    warn: { background: "#fef3c7", color: "#b45309" },
    bad: { background: "#fee2e2", color: "#b91c1c" },
    info: { background: "#dbeafe", color: "#1d4ed8" },
  } as const;
  return <span className="rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap" style={tones[tone]}>{children}</span>;
}

// 게임 상세 본문. 전체 페이지(/game/번호)와 목록 위에 겹쳐 뜨는 창 둘 다 이걸 쓴다.
export default function GameDetail({ appid, compact = false }: { appid: number; compact?: boolean }) {
  const row = game(appid);
  if (!row) return <p className="muted p-6">게임을 찾을 수 없습니다.</p>;
  const { game: g, price: p, history } = row;
  const v = VERDICT[p.verdict];
  const saving = p.regular_price != null && p.current_price != null ? p.regular_price - p.current_price : null;
  const toLow = p.historical_low != null && p.current_price != null ? p.current_price - p.historical_low : null;
  const related = videos().filter((x) => x.appids.includes(g.appid));
  const stats = saleStats(history, p);
  const season = nextSeason(seasons());
  const allPct = pct(g.positive_all, g.reviews_all), koPct = pct(g.positive_ko, g.reviews_ko);
  const lowRecent = p.historical_low_at ? daysUntil(p.historical_low_at) >= -14 : false;
  const isFloor = p.verdict === "floor";
  const perHour = pricePerHour(p.current_price, g.playtime_median_h_all, g.playtime_n_all);
  const perHourKo = pricePerHour(p.current_price, g.playtime_median_h_ko, g.playtime_n_ko);
  const regret = regretIndex(p, stats, g.gap_pp);
  const regretStyle = { low: { background: "#dcfce7", color: "#15803d" }, mid: { background: "#fef3c7", color: "#b45309" }, high: { background: "#fee2e2", color: "#b91c1c" } }[regret.level];
  const koRatio = g.playtime_median_h_all && g.playtime_median_h_ko && (g.playtime_n_ko ?? 0) >= 20
    ? g.playtime_median_h_ko / g.playtime_median_h_all : null;
  // 리뷰 추세: 기록이 2개 이상이면 첫 기록(최대 26회 전) 대비 긍정률·접속자 변화
  const trend = reviewHistory().filter((r) => r.appid === g.appid).sort((a, b) => a.at.localeCompare(b.at));
  const first = trend[0], last = trend[trend.length - 1];
  const trendText = first && last && first.at !== last.at ? (() => {
    const p0 = first.reviews_all ? first.positive_all / first.reviews_all * 100 : null;
    const p1 = last.reviews_all ? last.positive_all / last.reviews_all * 100 : null;
    const d = p0 != null && p1 != null ? Math.round((p1 - p0) * 10) / 10 : null;
    const nr = last.reviews_all - first.reviews_all;
    return `${kst(first.at)} 이후 리뷰 +${nr.toLocaleString("ko-KR")}개` + (d != null ? `, 긍정률 ${d > 0 ? "+" : ""}${d}%p` : "");
  })() : null;
  const deck = DECK[g.deck ?? "unknown"];

  const statRows: { k: string; v: React.ReactNode; sub?: string }[] = [
    { k: "통상 할인", v: stats.usualCut != null ? `${stats.usualCut}%` : "-", sub: "세일 때 보통 이만큼" },
    { k: "최근 2년 최대", v: stats.maxCut != null ? `${stats.maxCut}%` : "-", sub: "가장 크게 깎였을 때" },
    { k: "세일 주기", v: stats.intervalDays != null ? `${stats.intervalDays}일` : "-", sub: `${stats.saleCount}회 세일 기준` },
    { k: "다음 세일 예상",
      v: stats.nextSaleSoon ? "곧" : stats.nextSaleAt ? `${daysUntil(stats.nextSaleAt)}일 후` : "-",
      sub: stats.nextSaleSoon ? "평소 주기가 이미 지났어요" : stats.nextSaleAt ? `${kst(stats.nextSaleAt)}쯤` : "기록 부족" },
  ];
  if (season) statRows.push({ k: `다음 시즌 세일 · ${season.name}`, v: `${Math.max(0, daysUntil(season.start))}일 후`,
    sub: `${season.start.slice(5).replace("-", "/")}~${season.end.slice(5).replace("-", "/")}${season.confirmed ? "" : " (예상, 스팀 발표 전)"}` });

  return (
    <article className="space-y-6">
      <section className="card overflow-hidden relative">
        {(g.hero_image ?? g.capsule_image ?? g.header_image) && (
          <Image src={g.hero_image ?? g.capsule_image ?? g.header_image!} alt="" fill priority quality={90}
            sizes="(max-width: 1024px) 100vw, 1024px" className={`object-cover ${g.hero_image ? "object-center" : "object-top"}`} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--card) 18%, color-mix(in srgb, var(--card) 70%, transparent) 55%, transparent 100%)" }} />
        <div className={`relative ${compact ? "pt-28 sm:pt-40 p-4 sm:p-5 space-y-3" : "pt-44 sm:pt-64 p-5 sm:p-7 space-y-4"}`}>
          <div>
            <h1 className={`${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-extrabold drop-shadow`}>{g.name}</h1>
            <p className="text-sm muted mt-1">{g.genres.slice(0, 3).join(" · ")}{g.release_date ? ` · ${g.release_date} 출시` : ""}</p>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <CountUp value={p.current_price} className={`${compact ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"} font-black tracking-tight`} />
            {p.discount_pct ? (
              <span className={`pb-2 ${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} flex items-baseline gap-2`}>
                <span className="muted line-through">{won(p.regular_price)}</span>
                <CountUp value={p.discount_pct} suffix="%" delay={300} className="font-extrabold" style={{ color: "#ef4444" }} />
              </span>
            ) : <span className="pb-2 muted">할인 없음</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={p.verdict} size={compact ? "md" : "lg"} stamp />
            <span className="muted">{v.short}</span>
            <WishButton appid={g.appid} size="lg" />
          </div>
          {p.sale_end_at && <SaleCountdown endAt={p.sale_end_at} endText={kst(p.sale_end_at, true)} />}
          <div className="flex flex-wrap gap-2 fade-up" style={{ animationDelay: "400ms" }}>
            <Chip tone={g.korean_support === "none" ? "bad" : "good"}>{SUPPORT[g.korean_support]}</Chip>
            {allPct != null && <Chip tone={allPct >= 80 ? "good" : allPct >= 60 ? "warn" : "bad"}>전체 긍정 {allPct}%</Chip>}
            {koPct != null && g.reviews_ko >= 100 && <Chip tone={g.gap_pp != null && g.gap_pp <= -10 ? "bad" : koPct >= 80 ? "good" : "warn"}>한국 긍정 {koPct}%{g.gap_pp != null ? ` (${g.gap_pp > 0 ? "+" : ""}${g.gap_pp}%p)` : ""}</Chip>}
            {isFloor && lowRecent && <Chip tone="info">역대 최저 갱신</Chip>}
            {isFloor && !lowRecent && <Chip tone="info">역대 최저가와 같음</Chip>}
            {p.tags.includes("korea_warning") && <Chip tone="bad">한국 주의</Chip>}
            {stats.usualCut != null && (p.discount_pct ?? 0) > stats.usualCut && <Chip tone="info">평소보다 큰 할인</Chip>}
            {g.current_players != null && g.current_players > 0 && <Chip>지금 {g.current_players.toLocaleString("ko-KR")}명 접속</Chip>}
            {g.steam_rank != null && <Chip tone={g.steam_rank <= 10 ? "info" : "plain"}>스팀 판매 {g.steam_rank}위</Chip>}
            {(g.play_modes ?? []).length > 0 && <Chip>{(g.play_modes ?? []).map((m) => ({ single: "싱글", multi: "멀티", coop: "협동" })[m]).join(" · ")}</Chip>}
            {(g.platforms ?? []).length > 0 && <Chip>{(g.platforms ?? []).map((o) => ({ windows: "Win", mac: "Mac", linux: "Linux" })[o]).join(" · ")}</Chip>}
            {g.controller === "full" && <Chip>패드 지원</Chip>}
            {deck.label && <Chip tone={deck.tone}>{deck.label}</Chip>}
            {g.metacritic != null && <Chip tone={g.metacritic >= 75 ? "good" : g.metacritic >= 50 ? "warn" : "bad"}>메타크리틱 {g.metacritic}</Chip>}
          </div>
        </div>
      </section>

      {/* 어디서 사야 제일 싸나 */}
      <StoreCompare offers={offersFor(g.appid)} price={p} stores={storesList()} />

      {/* 판 비교(디럭스 등) */}
      <EditionCompare game={g} offers={offersFor(g.appid)} />

      {/* 시간당 가격 · 플레이 시간 · 후회 지수 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 fade-up">
          <div className="text-xs muted">시간당 가격</div>
          <div className="text-2xl font-extrabold">{perHour != null ? <><CountUp value={perHour} />/시간</> : "-"}</div>
          <div className="text-xs muted mt-1">
            {perHour != null ? `리뷰어 플레이 시간 중앙값 ${hours(g.playtime_median_h_all)} 기준` : "표본이 적어 계산하지 않음"}
            {perHourKo != null && perHourKo !== perHour && <> · 한국인 기준 {perHourKo.toLocaleString("ko-KR")}원/시간</>}
          </div>
        </div>
        <div className="card p-4 fade-up" style={{ animationDelay: "80ms" }}>
          <div className="text-xs muted">얼마나 오래 하나 (리뷰어 중앙값)</div>
          <div className="text-2xl font-extrabold">{hours(g.playtime_median_h_all)} <span className="text-base muted">/ 한국 {hours(g.playtime_median_h_ko)}</span></div>
          <div className="text-xs muted mt-1">
            {koRatio != null && (koRatio >= 1.5 ? `한국인이 ${koRatio.toFixed(1)}배 더 오래 함` : koRatio <= 0.67 ? `한국인은 ${(1 / koRatio).toFixed(1)}배 빨리 접음` : "한국인과 전체가 비슷")}
            {g.under_2h_pct_all != null && <> · 2시간 전 리뷰 {g.under_2h_pct_all}%{g.under_2h_pct_all >= 25 ? " (환불선 안에서 판단하는 사람 많음)" : ""}</>}
          </div>
        </div>
        <div className="card p-4 fade-up" style={{ animationDelay: "160ms" }}>
          <div className="text-xs muted">지금 사면 후회할까</div>
          <div className="mt-1"><span className="rounded-full px-3 py-1 text-lg font-extrabold" style={regretStyle}>{regret.label}</span></div>
          <div className="text-xs muted mt-2">{regret.reasons.join(" · ") || "특별한 신호 없음"}</div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-4">
          {statRows.map((s, i) => (
            <div key={s.k} className="fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="text-xs muted">{s.k}</div>
              <div className="text-xl font-extrabold">{s.v}</div>
              {s.sub && <div className="text-xs muted mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k: "역대 최저가", v: p.historical_low, sub: p.historical_low_at ? kst(p.historical_low_at) : "기록 없음" },
          { k: "평소 세일가", v: p.usual_sale_price, sub: p.usual_sale_price ? `최근 2년 세일 ${p.sale_count_24m}회 중앙값` : "세일 기록 부족" },
          { k: "정가보다 아낌", v: saving, sub: p.discount_pct ? `${p.discount_pct}% 할인` : "" },
          { k: "역대 최저 대비",
            v: toLow != null && toLow > 0 ? toLow : null,
            text: toLow == null ? "-" : toLow <= 0 ? "최저가 ✓" : undefined,
            prefix: toLow != null && toLow > 0 ? "+" : "",
            suffix: toLow != null && toLow > 0 && p.historical_low ? ` (+${Math.round(toLow / p.historical_low * 100)}%)` : "",
            sub: toLow == null ? "기록 없음" : toLow <= 0 ? `역대 최저 ${won(p.historical_low)}과 같음` : `역대 최저 ${won(p.historical_low)}보다 비쌈` },
        ].map((c, i) => (
          <div key={c.k} className="card p-4 fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="text-xs muted">{c.k}</div>
            <div className="font-extrabold text-xl" style={c.text === "최저가 ✓" ? { color: "#16a34a" } : undefined}>
              {c.text ?? <>{c.prefix}<CountUp value={c.v} delay={i * 80} />{c.suffix}</>}
            </div>
            <div className="text-xs muted mt-1">{c.sub}</div>
          </div>
        ))}
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">최근 24개월 세일가 추세</h2>
          <span className="text-sm muted">
            {toLow == null ? "" : toLow <= 0 ? "지금이 역대 최저가입니다" : `역대 최저까지 ${won(toLow)} 남음`}
            {p.vs_usual_pct != null && ` · 평소 세일가 대비 ${p.vs_usual_pct > 0 ? "+" : ""}${Math.abs(p.vs_usual_pct) < 0.05 ? 0 : p.vs_usual_pct}%`}
          </span>
        </div>
        <PriceChart points={history} current={p.current_price} discount={p.discount_pct} historicalLow={p.historical_low} historicalLowAt={p.historical_low_at} usual={p.usual_sale_price} regular={p.regular_price} />
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">한국 게이머 평가 vs 전체 평가</h2>
          {trendText && <span className="text-xs muted">추세: {trendText}</span>}
        </div>
        <ReviewGap all={allPct} ko={koPct} reviewsAll={g.reviews_all} reviewsKo={g.reviews_ko} gap={g.gap_pp} />
      </section>

      <WhyDisliked s={reviewSummaryFor(g.appid)} gapPp={g.gap_pp} />

      <KoreanReviews game={g} />

      {related.length > 0 && (
        <section className="card p-5 space-y-3">
          <h2 className="text-lg font-bold">이 게임이 나온 영상</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((x) => (
              <li key={x.video_id}>
                <a href={`https://www.youtube.com/watch?v=${x.video_id}`} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center hover:underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${x.video_id}/mqdefault.jpg`} alt="" className="w-28 aspect-video object-cover rounded-lg" />
                  <span className="text-sm font-bold line-clamp-2">{x.kind === "shorts" ? "[쇼츠] " : ""}{x.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-3">
        <a href={g.steam_url} target="_blank" rel="noopener noreferrer"
          className="inline-block rounded-xl px-5 py-3 font-bold text-white" style={{ background: "#1b2838" }}>
          스팀 상점에서 보기 →
        </a>
        <span className="text-xs muted">결제 전 실제 가격을 꼭 확인하세요 · 갱신 {kst(p.fetched_at, true)}</span>
      </section>
    </article>
  );
}
