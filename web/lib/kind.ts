// 판정의 세부 종류(2026-10-11, 사용자 "바닥가가 308개 중 204개면 의미가 없다").
// 판정(verdict)은 그대로 두고, 바닥가만 셋으로 나눠 보여 준다:
//   first       첫 할인      출시 1년 안 된 게임이 세일 2회 이하 → 기록이 짧아 "역대 최저"라는 말이 아직 큰 뜻이 없음
//   floor_new   최저가 갱신  이번 세일(최근 21일 안)에 역대 최저가를 새로 찍음
//   floor_again 최저가 재등장 전에 찍은 역대 최저가와 같은 가격이 다시 옴
import type { ListGame, ListPrice, Verdict } from "./data";

export type Kind = "floor_new" | "floor_again" | "first" | Exclude<Verdict, "floor">;

export const KIND: Record<Kind, { label: string; short: string; color: string; bg: string; verdict: Verdict }> = {
  floor_new:   { label: "최저가 갱신",  short: "이번 세일에 역대 최저가를 새로 찍었습니다",            color: "#15803d", bg: "#dcfce7", verdict: "floor" },
  floor_again: { label: "최저가 재등장", short: "전에 찍은 역대 최저가와 같은 가격입니다",               color: "#0f766e", bg: "#ccfbf1", verdict: "floor" },
  first:       { label: "첫 할인",      short: "출시 1년 안 된 게임의 첫 세일이라 가격 기록이 짧습니다",  color: "#6d28d9", bg: "#ede9fe", verdict: "floor" },
  good:        { label: "좋은 가격",    short: "평소 세일가보다 쌉니다",                               color: "#1d4ed8", bg: "#dbeafe", verdict: "good" },
  normal:      { label: "보통",         short: "평소 세일가 수준입니다",                               color: "#4b5563", bg: "#e5e7eb", verdict: "normal" },
  wait:        { label: "기다림",       short: "평소 세일가보다 비쌉니다",                             color: "#b45309", bg: "#fef3c7", verdict: "wait" },
  trap:        { label: "함정 할인",    short: "할인처럼 보이지만 평소보다 훨씬 비쌉니다",             color: "#b91c1c", bg: "#fee2e2", verdict: "trap" },
  none:        { label: "판정 없음",    short: "세일 기록이 2회 미만이라 판정하지 않습니다",           color: "#6b7280", bg: "#f3f4f6", verdict: "none" },
};
export const KIND_ORDER: Kind[] = ["floor_new", "floor_again", "first", "good", "normal", "wait", "trap", "none"];

const DAY = 86_400_000;
export const NEW_LOW_DAYS = 21;      // 역대 최저 시각이 이 안이면 "이번 세일에 갱신"
export const FIRST_SALE_MAX = 2;     // 세일 횟수가 이 이하이고 출시 1년 미만이면 "첫 할인"

/** 스팀 출시일("2026년 9월 2일", "2 Sep, 2026" 등)을 ms로. 못 읽으면 null. */
export function releaseMs(text: string | null | undefined): number | null {
  if (!text) return null;
  const ko = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/.exec(text);
  if (ko) return Date.UTC(Number(ko[1]), Number(ko[2]) - 1, Number(ko[3]));
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : t;
}

export function kindOf(price: Pick<ListPrice, "verdict" | "historical_low_at" | "sale_count_24m">,
  game: Pick<ListGame, "release_date">, now = Date.now()): Kind {
  if (price.verdict !== "floor") return price.verdict;
  const released = releaseMs(game.release_date);
  if (released != null && now - released < 365 * DAY && (price.sale_count_24m ?? 0) <= FIRST_SALE_MAX) return "first";
  const lowAt = price.historical_low_at ? Date.parse(price.historical_low_at) : NaN;
  if (!Number.isNaN(lowAt) && now - lowAt <= NEW_LOW_DAYS * DAY) return "floor_new";
  return "floor_again";
}
