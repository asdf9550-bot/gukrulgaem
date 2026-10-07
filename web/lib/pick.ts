import type { Deal } from "./data";
import { pct } from "./format";

// "이번 주 국룰" 자동 선정 규칙 — 영상 프로그램의 게임 고르기와 같은 규칙으로 맞출 것.
//  조건: 판정 바닥가·좋은 가격, 전체 리뷰 5,000개 이상, 긍정 85% 이상, "한국 주의" 아님, 할인율 30% 이상
//  순서: 스팀 판매 순위(없으면 뒤로) → 할인율
export const PICK_RULES = { minReviews: 5000, minPositivePct: 85, minDiscountPct: 30, count: 5 };

export function weeklyPicks(deals: Deal[], count = PICK_RULES.count): Deal[] {
  return deals
    .filter(({ game: g, price: p }) =>
      (p.verdict === "floor" || p.verdict === "good") &&
      g.reviews_all >= PICK_RULES.minReviews &&
      (pct(g.positive_all, g.reviews_all) ?? 0) >= PICK_RULES.minPositivePct &&
      !p.tags.includes("korea_warning") &&
      (p.discount_pct ?? 0) >= PICK_RULES.minDiscountPct)
    .sort((a, b) => (a.game.steam_rank ?? 9999) - (b.game.steam_rank ?? 9999) || (b.price.discount_pct ?? 0) - (a.price.discount_pct ?? 0))
    .slice(0, count);
}

export function pickReason(d: Deal): string {
  const bits = [d.price.verdict === "floor" ? "역대 최저가" : "평소보다 쌈", `${d.price.discount_pct}% 할인`];
  const ko = pct(d.game.positive_ko, d.game.reviews_ko);
  if (ko != null && d.game.reviews_ko >= 100) bits.push(`한국 긍정 ${ko}%`);
  if (d.game.steam_rank != null && d.game.steam_rank <= 20) bits.push(`판매 ${d.game.steam_rank}위`);
  return bits.join(" · ");
}
