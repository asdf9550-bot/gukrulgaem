import type { Metadata } from "next";
import Image from "next/image";
import { upcoming, type Upcoming } from "@/lib/data";
import { kstRelative, SUPPORT, won } from "@/lib/format";

export const metadata: Metadata = { title: "출시 예정 신작", description: "스팀 출시 예정 신작의 출시일·예약 가격·한국어 지원 여부를 주 단위로 정리" };
export const revalidate = 3600;

// 2026-10-17 (사용자 "신작 게임 출시일 페이지"): 출시일 순으로 이번 주 / 다음 주 / 이달 / 다음 달 / 그 뒤 / 날짜 미정.
const DAY = 86_400_000;
const dayNo = (t: number) => Math.floor((t + 9 * 3_600_000) / DAY);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...o }).format(new Date(iso + "T00:00:00+09:00"));
const KO_TONE: Record<string, { background: string; color: string }> = {
  voice_sub: { background: "#dcfce7", color: "#15803d" }, sub: { background: "#dcfce7", color: "#15803d" }, none: { background: "#fee2e2", color: "#b91c1c" },
};

function bucket(it: Upcoming, now: number): string {
  if (!it.release_at || it.release_precision !== "day") return "날짜 미정";
  const d = dayNo(new Date(it.release_at + "T00:00:00+09:00").getTime()) - dayNo(now);
  if (d <= 0) return "오늘 출시";
  if (d <= 7) return "이번 주";
  if (d <= 14) return "다음 주";
  const today = new Date(now + 9 * 3_600_000), rel = new Date(it.release_at);
  const monthDiff = (rel.getUTCFullYear() - today.getUTCFullYear()) * 12 + rel.getUTCMonth() - today.getUTCMonth();
  if (monthDiff === 0) return "이달";
  if (monthDiff === 1) return "다음 달";
  return fmt(it.release_at, { year: "numeric", month: "long" });
}
const ORDER = ["오늘 출시", "이번 주", "다음 주", "이달", "다음 달"];

export default function UpcomingPage() {
  const now = Date.now();
  const { updated_at, items } = upcoming();
  const groups = new Map<string, Upcoming[]>();
  for (const it of items) { const k = bucket(it, now); groups.set(k, [...(groups.get(k) ?? []), it]); }
  const keys = [...groups.keys()].sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    if (a === "날짜 미정") return 1; if (b === "날짜 미정") return -1;
    if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  const koCount = items.filter((i) => i.korean_support !== "none").length;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">출시 예정 신작</h1>
        <p className="muted mt-1">
          스팀에서 찜이 많은 출시 예정 게임 {items.length}개. 그중 {koCount}개가 한국어 지원.
          <span className="text-xs"> · 출시일은 스팀 상점 표기(한국 시간) · 갱신 {kstRelative(updated_at)}</span>
        </p>
      </div>
      {items.length === 0 && <p className="card p-6 muted">아직 모은 신작이 없어요. 다음 수집 때 나타납니다.</p>}
      {keys.map((k) => (
        <section key={k} className="space-y-2">
          <h2 className="text-lg font-extrabold">{k} <span className="muted font-normal text-sm">{groups.get(k)!.length}개</span></h2>
          <div className="grid grid-cols-2 gap-2 md:gap-3 items-stretch">
            {groups.get(k)!.map((it) => {
              const d = it.release_at && it.release_precision === "day" ? dayNo(new Date(it.release_at + "T00:00:00+09:00").getTime()) - dayNo(now) : null;
              return (
                <a key={it.appid} href={it.steam_url} target="_blank" rel="noopener noreferrer"
                  className="card min-w-0 overflow-hidden flex flex-col md:flex-row gap-2 md:gap-3 p-2 md:p-3 hover:shadow-md transition-shadow">
                  <div className="relative w-full md:w-36 shrink-0 aspect-[460/215] md:self-center rounded-lg overflow-hidden" style={{ background: "var(--line)" }}>
                    {it.header_image && <Image src={it.header_image} alt="" fill sizes="(max-width: 768px) 50vw, 144px" className="object-cover" />}
                    {it.wishlist_rank != null && it.wishlist_rank <= 50 && (
                      <span className="absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-xs font-extrabold text-white" style={{ background: it.wishlist_rank <= 10 ? "#ef4444" : "#7c3aed" }}>찜 {it.wishlist_rank}위</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                    <div className="font-bold text-sm md:text-base line-clamp-2">{it.name}</div>
                    <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs md:text-sm">
                      <span className="font-extrabold text-base md:text-lg whitespace-nowrap">
                        {it.release_precision === "day" && it.release_at ? fmt(it.release_at, { month: "numeric", day: "numeric", weekday: "short" }) : it.release_text || "미정"}
                      </span>
                      {d != null && <span className="font-bold whitespace-nowrap" style={{ color: d <= 7 ? "#ef4444" : "var(--muted)" }}>{d <= 0 ? "오늘" : `D-${d}`}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px] md:text-xs">
                      <span className="rounded-full px-2 py-0.5 font-bold" style={KO_TONE[it.korean_support]}>{SUPPORT[it.korean_support]}</span>
                      <span className="rounded-full px-2 py-0.5" style={{ background: "var(--line)" }}>{it.price == null ? "가격 미정" : it.price === 0 ? "무료" : won(it.price)}</span>
                      {it.genres.slice(0, 2).map((g) => <span key={g} className="rounded-full px-2 py-0.5 muted" style={{ background: "var(--line)" }}>{g}</span>)}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs muted">출처: Steam 상점 "인기 출시 예정"·"찜 순위"(한국 기준). 출시일과 가격은 개발사가 바꿀 수 있으니 예약 전 스팀에서 다시 확인하세요. 할인 중인 게임은 <a href="/" className="underline">이번 주 할인</a>에서.</p>
    </div>
  );
}
