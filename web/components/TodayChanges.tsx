import Link from "next/link";
import type { Deal } from "@/lib/data";
import { kst, won } from "@/lib/format";
import type { Changes } from "@/lib/changes";

function Box({ title, tone, rows, note, noteWidth = "w-24" }: { title: string; tone: string; rows: Deal[]; note: (d: Deal) => string; noteWidth?: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="card p-3 min-w-0 flex flex-col">
      <div className="text-sm font-extrabold mb-1.5 flex items-baseline justify-between" style={{ color: tone }}>
        <span>{title} <span className="muted font-normal">{rows.length}</span></span>
        {rows.length > 8 && <span className="text-[11px] muted font-normal">스크롤 ↓</span>}
      </div>
      {/* 전체 목록을 상자 안에서 스크롤. 이름은 왼쪽(길면 …), 숫자는 오른쪽 고정 폭으로 줄 맞춤 */}
      <ul className="space-y-1 text-sm overflow-y-auto pr-1" style={{ maxHeight: "16rem" }}>
        {rows.map((d) => (
          <li key={d.game.appid} className="flex items-center gap-2">
            <Link href={`/game/${d.game.appid}`} scroll={false} className="flex-1 min-w-0 truncate hover:underline">{d.game.name}</Link>
            <span className={`shrink-0 ${noteWidth} text-right tabular-nums muted whitespace-nowrap`}>{note(d)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 홈 "오늘 바뀐 것" — 매일 새벽 수집 뒤 어제와 비교해 자동으로 채워진다. 상자 수에 맞춰 폭을 나눈다.
export default function TodayChanges({ c }: { c: Changes }) {
  const boxes = [c.newFloor, c.newDeals, c.bigger, c.endingSoon].filter((r) => r.length > 0).length;
  if (boxes === 0) return null;
  const cols = boxes === 1 ? "grid-cols-1" : boxes === 2 ? "grid-cols-1 md:grid-cols-2" : boxes === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  const endText = (d: Deal) => kst(d.price.sale_end_at, true).replace(/^\d{4}년 /, "").replace(" 오전 ", " ").replace(" 오후 ", " 오후");
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-extrabold">오늘 바뀐 것</h2>
      <div className={`grid gap-3 ${cols}`}>
        <Box title="새로 바닥가" tone="#16a34a" rows={c.newFloor} note={(d) => `${won(d.price.current_price)} -${d.price.discount_pct}%`} noteWidth="w-32" />
        <Box title="새 할인" tone="#2563eb" rows={c.newDeals} note={(d) => `${won(d.price.current_price)} -${d.price.discount_pct}%`} noteWidth="w-32" />
        <Box title="할인 더 커짐" tone="#7c3aed" rows={c.bigger} note={(d) => `-${d.price.discount_pct}%`} noteWidth="w-14" />
        <Box title="오늘 안에 끝남" tone="#dc2626" rows={c.endingSoon} note={endText} noteWidth="w-32" />
      </div>
    </section>
  );
}
