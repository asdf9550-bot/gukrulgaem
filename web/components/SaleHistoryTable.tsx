import type { HistoryPoint } from "@/lib/data";
import { won } from "@/lib/format";

// 2026-10-16 (경쟁 사이트 비교 → 스팀세일의 "세일 이력 표"): 가격 기록을 세일 한 번 = 한 줄로. 최근 것부터 10개.
type Run = { start: string; end: string | null; price: number; cut: number };

export function saleRuns(points: HistoryPoint[]): Run[] {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  const runs: Run[] = [];
  let open: Run | null = null;
  for (const p of sorted) {
    if (p.cut > 0) {
      if (!open) { open = { start: p.at, end: null, price: p.price, cut: p.cut }; runs.push(open); }
      else { open.price = Math.min(open.price, p.price); open.cut = Math.max(open.cut, p.cut); }
    } else if (open) { open.end = p.at; open = null; }
  }
  return runs.reverse();
}

const day = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "numeric", day: "numeric" }).format(new Date(iso));

export default function SaleHistoryTable({ points, historicalLow }: { points: HistoryPoint[]; historicalLow: number | null }) {
  const runs = saleRuns(points).slice(0, 10);
  if (runs.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs muted">
          <tr><th className="text-left font-normal py-1">세일 기간</th><th className="text-right font-normal py-1">가격</th><th className="text-right font-normal py-1">할인</th></tr>
        </thead>
        <tbody>
          {runs.map((r, i) => {
            const low = historicalLow != null && r.price <= historicalLow;
            return (
              <tr key={i} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="py-1.5 whitespace-nowrap">{day(r.start)} ~ {r.end ? day(r.end) : <span className="font-bold" style={{ color: "#16a34a" }}>진행 중</span>}</td>
                <td className="py-1.5 text-right whitespace-nowrap font-bold">{won(r.price)}{low && <span className="ml-1 text-xs font-bold" style={{ color: "#2563eb" }}>최저</span>}</td>
                <td className="py-1.5 text-right whitespace-nowrap" style={{ color: "#16a34a" }}>-{r.cut}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
