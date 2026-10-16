import Link from "next/link";
import { steamEvents } from "@/lib/data";

// 2026-10-16 (경쟁 사이트 비교 → 스팀세일 첫 화면의 "Winter Sale D-63"): 홈 맨 위에 다음 시즌 세일 D-day와 지금 진행 중인 행사 한 줄
const DAY = 86_400_000;
const dayNo = (t: number) => Math.floor((t + 9 * 3_600_000) / DAY);
const md = (t: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(t);

export default function EventBand() {
  const now = Date.now();
  const events = steamEvents().map((e) => ({ ...e, s: new Date(e.start).getTime(), en: new Date(e.end).getTime() }));
  const live = events.filter((e) => e.s <= now && now < e.en).sort((a, b) => a.en - b.en)[0];
  const nextSale = events.filter((e) => e.kind === "sale" && e.s > now).sort((a, b) => a.s - b.s)[0];
  if (!live && !nextSale) return null;
  const d = nextSale ? dayNo(nextSale.s) - dayNo(now) : null;
  return (
    <Link href="/calendar" className="card flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm hover:shadow-md transition-shadow">
      {nextSale && (
        <span className="flex items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-xs font-extrabold text-white tabular-nums" style={{ background: "#ef4444" }}>{d === 0 ? "D-DAY" : `D-${d}`}</span>
          <span className="font-bold">스팀 {nextSale.name}</span>
          <span className="muted">{md(nextSale.s)} 시작{nextSale.confirmed ? "" : " (예상)"}</span>
        </span>
      )}
      {live && (
        <span className="flex items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: "#16a34a" }}>진행 중</span>
          <span className="font-bold">{live.name}</span>
          <span className="muted">{md(live.en)} 끝</span>
        </span>
      )}
      <span className="ml-auto text-xs muted">달력 →</span>
    </Link>
  );
}
