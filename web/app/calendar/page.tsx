import type { Metadata } from "next";
import Link from "next/link";
import { deals, history, seasons, steamEvents } from "@/lib/data";
import { kst, won } from "@/lib/format";
import { saleStats } from "@/lib/stats";

export const metadata: Metadata = { title: "세일 달력", description: "스팀 시즌 세일·페스티벌 일정과 게임별 다음 세일 예상, 세일 종료일을 달력으로" };

type Item = { at: number; kind: "season_start" | "season_end" | "sale_end" | "next_sale"; label: string; sub?: string; href?: string; color: string };

const DAY = 86_400_000;
const dayNo = (t: number) => Math.floor((t + 9 * 3_600_000) / DAY);   // 한국 날짜 번호
const dday = (t: number, now: number) => { const d = dayNo(t) - dayNo(now); return d === 0 ? "D-DAY" : d > 0 ? `D-${d}` : `D+${-d}`; };
const short = (t: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" }).format(t);
const hhmm = (t: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" }).format(t);

export default function CalendarPage() {
  const now = Date.now();
  // 2026-10-16 (사용자 "세일 기간 알려줘"): 밸브 공식 일정표의 시즌 세일·페스티벌. 2026년 끝까지 확정, 2027년은 예상.
  const events = steamEvents()
    .map((e) => ({ ...e, s: new Date(e.start).getTime(), en: new Date(e.end).getTime() }))
    .filter((e) => e.en >= now && e.s <= now + 200 * DAY)
    .sort((a, b) => a.s - b.s);
  const items: Item[] = [];
  for (const s of seasons()) {
    items.push({ at: new Date(s.start).getTime(), kind: "season_start", label: `스팀 ${s.name} 시작${s.confirmed ? "" : " (예상)"}`, color: "#ef4444" });
    items.push({ at: new Date(s.end).getTime(), kind: "season_end", label: `스팀 ${s.name} 끝${s.confirmed ? "" : " (예상)"}`, color: "#ef4444" });
  }
  const allHistory = history();
  for (const d of deals()) {
    if (d.price.sale_end_at) items.push({ at: new Date(d.price.sale_end_at).getTime(), kind: "sale_end", label: d.game.name, sub: `${won(d.price.current_price)} -${d.price.discount_pct}% 종료`, href: `/game/${d.game.appid}`, color: "#b45309" });
    const st = saleStats(allHistory.filter((h) => h.appid === d.game.appid), d.price, now);
    if (st.nextSaleAt) items.push({ at: st.nextSaleAt, kind: "next_sale", label: d.game.name, sub: `다음 세일 예상 (주기 ${st.intervalDays}일)`, href: `/game/${d.game.appid}`, color: "#2563eb" });
  }
  const upcoming = items.filter((i) => i.at >= now - 86_400_000 && i.at <= now + 120 * 86_400_000).sort((a, b) => a.at - b.at);
  const groups = new Map<string, Item[]>();
  for (const i of upcoming) {
    const key = kst(i.at);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  const dayLabel = (iso: string) => { const d = new Date(iso); return iso; };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">세일 달력</h1>
        <p className="muted mt-1">앞으로 120일. 빨강 = 스팀 시즌 세일, 주황 = 지금 할인 종료, 파랑 = 게임별 다음 세일 예상(세일 주기로 계산한 추정).</p>
      </div>

      <section className="card p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold">스팀 세일·페스티벌 일정</h2>
          <span className="text-xs muted">한국 시간 · 새벽 2~3시에 시작·종료</span>
        </div>
        {events.length === 0 && <p className="muted text-sm">앞으로 200일 안에 행사가 없어요.</p>}
        <ul className="space-y-2">
          {events.map((e) => {
            const live = e.s <= now && now < e.en;
            return (
              <li key={e.name + e.start} className="rounded-xl p-3" style={{ background: "var(--bg)", borderLeft: `4px solid ${live ? "#16a34a" : e.kind === "sale" ? "#ef4444" : "#7c3aed"}` }}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded-md px-2 py-0.5 text-xs font-extrabold text-white tabular-nums" style={{ background: live ? "#16a34a" : e.kind === "sale" ? "#ef4444" : "#7c3aed" }}>
                    {live ? "진행 중" : dday(e.s, now)}
                  </span>
                  <span className="font-extrabold">{e.name}</span>
                  <span className="text-xs muted">{e.kind === "sale" ? "시즌 세일" : "페스티벌"}{e.confirmed ? "" : " · 예상"}</span>
                </div>
                <div className="text-sm muted mt-0.5 tabular-nums">{short(e.s)} {hhmm(e.s)} ~ {short(e.en)} {hhmm(e.en)} ({Math.round((e.en - e.s) / DAY)}일)</div>
                {e.tip && <p className="text-xs muted mt-0.5">{e.tip}</p>}
              </li>
            );
          })}
        </ul>
      </section>
      {groups.size === 0 && <p className="card p-6 muted">표시할 일정이 없어요.</p>}
      <div className="space-y-3">
        {Array.from(groups.entries()).map(([day, list]) => (
          <section key={day} className="card p-4">
            <h2 className="font-extrabold mb-2">{dayLabel(day)} <span className="muted font-normal text-sm">{list.length}건</span></h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
              {list.slice(0, 40).map((i, idx) => (
                <li key={idx} className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: i.color }} />
                  {i.href ? <Link href={i.href} scroll={false} className="truncate hover:underline">{i.label}</Link> : <span className="font-bold">{i.label}</span>}
                  {i.sub && <span className="muted shrink-0 truncate">{i.sub}</span>}
                </li>
              ))}
              {list.length > 40 && <li className="muted text-xs">… 외 {list.length - 40}건</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
