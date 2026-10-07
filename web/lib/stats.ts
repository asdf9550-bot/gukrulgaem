// 세일 통계: 가격 변동 기록(최근 24개월)에서 세일 주기·통상 할인율·다음 세일 예상을 계산한다.
import type { HistoryPoint, Price, Season } from "./data";

export const hours = (h: number | null | undefined) => (h == null ? "-" : h >= 100 ? `${Math.round(h)}시간` : `${h}시간`);

const DAY = 86_400_000;
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface SaleStats {
  saleCount: number;
  usualCut: number | null;        // 통상 할인율(중앙값)
  maxCut: number | null;          // 최근 2년 최대 할인율
  intervalDays: number | null;    // 세일 주기(세일 시작 사이 날짜, 중앙값)
  durationDays: number | null;    // 세일 한 번 길이(중앙값)
  nextSaleAt: number | null;      // 다음 세일 예상 시각(ms)
  nextSaleSoon: boolean;          // 주기가 이미 지났으면 "곧"
}

export function saleStats(history: HistoryPoint[], price: Price, now = Date.now()): SaleStats {
  const points = [...history].sort((a, b) => a.at.localeCompare(b.at));
  const starts: { t: number; cut: number; end: number | null }[] = [];
  let prev = 0;
  for (const p of points) {
    const t = new Date(p.at).getTime();
    if (p.cut > 0 && prev === 0) starts.push({ t, cut: p.cut, end: null });
    if (p.cut === 0 && prev > 0 && starts.length) starts[starts.length - 1].end = t;
    prev = p.cut;
  }
  const cuts = starts.map((s) => s.cut);
  const durations = starts.filter((s) => s.end).map((s) => (s.end! - s.t) / DAY);
  const gaps = starts.slice(1).map((s, i) => (s.t - starts[i].t) / DAY);
  const intervalDays = median(gaps);
  const durationDays = median(durations) ?? 7;
  let nextSaleAt: number | null = null, nextSaleSoon = false;
  if (intervalDays != null && starts.length) {
    const onSale = (price.discount_pct ?? 0) > 0;
    if (onSale) {
      const end = price.sale_end_at ? new Date(price.sale_end_at).getTime() : now + durationDays * DAY;
      nextSaleAt = end + Math.max(intervalDays - durationDays, 3) * DAY;
    } else {
      nextSaleAt = starts[starts.length - 1].t + intervalDays * DAY;
      if (nextSaleAt < now) { nextSaleSoon = true; nextSaleAt = null; }
    }
  }
  return {
    saleCount: starts.length,
    usualCut: median(cuts) == null ? null : Math.round(median(cuts)!),
    maxCut: cuts.length ? Math.max(...cuts) : null,
    intervalDays: intervalDays == null ? null : Math.round(intervalDays),
    durationDays: Math.round(durationDays),
    nextSaleAt, nextSaleSoon,
  };
}

/** 시간당 가격(원): 지금 가격 ÷ 리뷰어 플레이 시간 중앙값. 표본 20개 미만이면 계산 안 함. */
export function pricePerHour(price: number | null, medianHours: number | null | undefined, n: number | undefined): number | null {
  if (price == null || !medianHours || medianHours <= 0 || (n ?? 0) < 20) return null;
  return Math.round(price / medianHours);
}

export type Regret = { level: "low" | "mid" | "high"; label: string; reasons: string[] };

/** 후회 지수: 역대 최저 대비, 다음 세일까지 남은 날, 세일 주기, 한국 평가 격차를 합쳐 "지금 사면 후회할까"를 세 단계로. */
export function regretIndex(price: Price, stats: SaleStats, gapPp: number | null, now = Date.now()): Regret {
  let score = 0; const reasons: string[] = [];
  if (price.verdict === "floor") { score -= 2; reasons.push("지금이 역대 최저가"); }
  else if (price.verdict === "good") { score -= 1; reasons.push("평소 세일가보다 쌈"); }
  else if (price.verdict === "wait") { score += 1; reasons.push("평소 세일가보다 비쌈"); }
  else if (price.verdict === "trap") { score += 2; reasons.push("평소보다 훨씬 비싼 할인"); }
  else if (price.verdict === "none") { score += 1; reasons.push("세일 기록이 적어 판단 어려움"); }
  if (stats.nextSaleAt != null) {
    const days = Math.ceil((stats.nextSaleAt - now) / 86_400_000);
    if (days <= 21) { score += 1; reasons.push(`다음 세일 예상이 ${days}일 후로 가까움`); }
  }
  if (stats.intervalDays != null && stats.intervalDays <= 45) { score += 1; reasons.push(`세일이 잦음(약 ${stats.intervalDays}일마다)`); }
  if (gapPp != null && gapPp <= -10) { score += 1; reasons.push("한국 평가가 전체보다 크게 낮음"); }
  const level = score <= -1 ? "low" : score <= 1 ? "mid" : "high";
  return { level, label: { low: "후회 낮음", mid: "보통", high: "후회 높음" }[level], reasons };
}

/** 오늘 이후 가장 가까운 시즌 세일 */
export function nextSeason(list: Season[], now = Date.now()): Season | null {
  return list.filter((s) => new Date(s.end).getTime() >= now).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}

export const daysUntil = (iso: string | number, now = Date.now()) => Math.ceil((new Date(iso).getTime() - now) / DAY);
