import Link from "next/link";
import type { Deal } from "@/lib/data";
import { kst, won } from "@/lib/format";
import type { Changes } from "@/lib/changes";

function Row({ title, tone, rows, note }: { title: string; tone: string; rows: Deal[]; note: (d: Deal) => string }) {
  if (rows.length === 0) return null;
  return (
    <div className="card p-3 space-y-1.5 min-w-0">
      <div className="text-sm font-extrabold" style={{ color: tone }}>{title} <span className="muted font-normal">{rows.length}</span></div>
      <ul className="space-y-1 text-sm">
        {rows.slice(0, 5).map((d) => (
          <li key={d.game.appid} className="flex justify-between gap-2">
            <Link href={`/game/${d.game.appid}`} scroll={false} className="truncate hover:underline">{d.game.name}</Link>
            <span className="shrink-0 muted">{note(d)}</span>
          </li>
        ))}
        {rows.length > 5 && <li className="muted text-xs">… 외 {rows.length - 5}개</li>}
      </ul>
    </div>
  );
}

// 홈 "오늘 바뀐 것" — 매일 새벽 수집 뒤 어제와 비교해 자동으로 채워진다.
export default function TodayChanges({ c }: { c: Changes }) {
  if (!c.newFloor.length && !c.newDeals.length && !c.endingSoon.length && !c.bigger.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-extrabold">오늘 바뀐 것</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Row title="새로 바닥가" tone="#16a34a" rows={c.newFloor} note={(d) => `${won(d.price.current_price)} -${d.price.discount_pct}%`} />
        <Row title="새 할인" tone="#2563eb" rows={c.newDeals} note={(d) => `-${d.price.discount_pct}%`} />
        <Row title="할인 더 커짐" tone="#7c3aed" rows={c.bigger} note={(d) => `-${d.price.discount_pct}%`} />
        <Row title="오늘 안에 끝남" tone="#dc2626" rows={c.endingSoon} note={(d) => kst(d.price.sale_end_at, true).replace(/^\d{4}년 /, "")} />
      </div>
    </section>
  );
}
