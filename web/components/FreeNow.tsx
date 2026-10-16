import { freeGames } from "@/lib/data";
import { won } from "@/lib/format";

// 2026-10-16 (경쟁 사이트 비교 → IsThereAnyDeal 첫 화면의 무료·증정): 지금 공짜로 받을 수 있는 게임. 없으면 칸 자체가 안 보임.
const DAY = 86_400_000;
const left = (end: string | null, now: number) => {
  if (!end) return "";
  const d = Math.ceil((new Date(end).getTime() - now) / DAY);
  return d <= 0 ? "오늘 끝" : d === 1 ? "내일 끝" : `${d}일 남음`;
};
const md = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(new Date(iso));
const SOURCE = { epic: "에픽게임즈", steam: "스팀" } as const;

export default function FreeNow() {
  const now = Date.now();
  const all = freeGames().filter((f) => !f.end || new Date(f.end).getTime() > now);
  const nowFree = all.filter((f) => f.status === "now");
  const upcoming = all.filter((f) => f.status === "upcoming").slice(0, 4);
  if (nowFree.length === 0 && upcoming.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
        <h2 className="text-lg font-extrabold"><span style={{ color: "#16a34a" }}>지금 공짜</span> {nowFree.length}</h2>
        <span className="text-xs muted">받아 두면 계속 내 것 · 에픽은 매주 목요일 자정에 바뀜</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {nowFree.map((f) => (
          <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"
            className="card shrink-0 w-[46vw] max-w-[180px] sm:max-w-none sm:w-56 overflow-hidden snap-start hover:shadow-md transition-shadow">
            <div className="relative aspect-[460/215]" style={{ background: "var(--line)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.image && <img src={f.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
              <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: "#16a34a" }}>무료</span>
            </div>
            <div className="p-2 sm:p-3 space-y-0.5">
              <div className="font-bold text-sm sm:text-base truncate">{f.title}</div>
              <div className="text-xs muted">
                {SOURCE[f.source]}{f.regular_price_krw ? <> · <span className="line-through">{won(f.regular_price_krw)}</span></> : null} · {left(f.end, now)}
              </div>
            </div>
          </a>
        ))}
      </div>
      {upcoming.length > 0 && (
        <p className="text-xs muted">
          다음 무료: {upcoming.map((f) => `${f.title}${f.start ? ` (${md(f.start)}~)` : ""}`).join(" · ")}
        </p>
      )}
    </section>
  );
}
