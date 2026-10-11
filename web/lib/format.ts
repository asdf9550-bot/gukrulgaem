import type { KoreanSupport, Verdict } from "./data";

export const won = (v: number | null | undefined) => (v == null ? "-" : `${v.toLocaleString("ko-KR")}원`);

export const pct = (positive: number, total: number) => (total ? Math.round((positive / total) * 100) : null);

// 시각만("오전 7:08") — 날짜를 화면에 쓰면 구글 검색 결과에 "2일 전 —" 같은 날짜 머리말이 붙어서(2026-10-08 사용자) 갱신 표시는 시각만 쓴다.
export function kstTime(iso: string | number | null | undefined): string {
  if (iso == null || iso === "") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" }).format(d);
}

// 2026-10-11 (사용자 "날짜가 없어 오늘인지 어제인지 모르겠다"): 절대 날짜 대신 "오늘/어제/N일 전 + 시각".
// 구글 검색 결과에 날짜 머리말이 붙지 않으면서도 언제 갱신됐는지 알 수 있다. 화면은 1시간마다 다시 만들어진다(홈 revalidate).
export function kstRelative(iso: string | number | null | undefined, now = Date.now()): string {
  if (iso == null || iso === "") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dayOf = (t: number) => Math.floor((t + 9 * 3_600_000) / 86_400_000);   // 한국 날짜 번호
  const diff = dayOf(now) - dayOf(d.getTime());
  const word = diff <= 0 ? "오늘" : diff === 1 ? "어제" : `${diff}일 전`;
  return `${word} ${kstTime(d.getTime())}`;
}

export function kst(iso: string | number | null | undefined, withTime = false): string {
  if (iso == null || iso === "") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(d);
}

export const VERDICT: Record<Verdict, { label: string; short: string; color: string; bg: string }> = {
  floor:  { label: "바닥가",   short: "역대 최저가와 같거나 더 쌉니다",     color: "#15803d", bg: "#dcfce7" },
  good:   { label: "좋은 가격", short: "평소 세일가보다 쌉니다",              color: "#1d4ed8", bg: "#dbeafe" },
  normal: { label: "보통",     short: "평소 세일가 수준입니다",              color: "#4b5563", bg: "#e5e7eb" },
  wait:   { label: "기다림",   short: "평소 세일가보다 비쌉니다",            color: "#b45309", bg: "#fef3c7" },
  trap:   { label: "함정 할인", short: "할인처럼 보이지만 평소보다 훨씬 비쌉니다", color: "#b91c1c", bg: "#fee2e2" },
  none:   { label: "판정 없음", short: "세일 기록이 2회 미만이라 판정하지 않습니다", color: "#6b7280", bg: "#f3f4f6" },
};

export const SUPPORT: Record<KoreanSupport, string> = { voice_sub: "한국어 음성·자막", sub: "한국어 자막만", none: "한국어 미지원" };

export const TAG: Record<string, string> = { korea_warning: "한국 주의", subscription: "구독 추천" };
