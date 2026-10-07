"use client";
import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint } from "@/lib/data";

type Sale = { t: number; price: number; cut: number; now?: boolean };
const BLUE = "#ef4444";     // 기본 색: 빨강(사용자 선택 2026-10-06). 변수 이름은 그대로 둠
const LOW = "#f59e0b";      // 역대 최저 = 금색

const kstDate = (t: number, style: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...style }).format(t);
const monthTick = (t: number) => {
  const p = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "2-digit", month: "numeric" }).formatToParts(new Date(t));
  return `${p.find((x) => x.type === "year")?.value}년 ${p.find((x) => x.type === "month")?.value}월`;
};
const man = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만` : v === 0 ? "0" : `${Math.round(v / 1000)}천`);

/** 세일 중 가격만 뽑는다(정가로 돌아간 구간은 뺌). 점 하나 = 세일 한 번. 한 세일 안에서 더 내려가면 그것도 점. */
function salePoints(points: HistoryPoint[], current: number | null, discount: number | null): Sale[] {
  const out: Sale[] = [];
  let prevCut = 0;
  for (const p of [...points].sort((a, b) => a.at.localeCompare(b.at))) {
    const starts = p.cut > 0 && prevCut === 0;
    const changes = p.cut > 0 && prevCut > 0 && out.length > 0 && out[out.length - 1].price !== p.price;
    if (starts || changes) out.push({ t: new Date(p.at).getTime(), price: p.price, cut: p.cut });
    prevCut = p.cut;
  }
  if (current != null && (discount ?? 0) > 0) {
    const last = out[out.length - 1];
    if (!last || last.price !== current || Date.now() - last.t > 86_400_000 * 2) out.push({ t: Date.now(), price: current, cut: discount ?? 0, now: true });
    else last.now = true;
  }
  return out;
}

function Bubble({ active, payload }: { active?: boolean; payload?: { payload: Sale }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--fg)" }}>
      <div className="muted">{p.now ? "지금 세일" : kstDate(p.t, { dateStyle: "medium" }) + " 세일"}</div>
      <div className="text-base font-extrabold">{p.price.toLocaleString("ko-KR")}원 <span className="text-xs font-bold" style={{ color: BLUE }}>-{p.cut}%</span></div>
    </div>
  );
}

export default function PriceChart({ points, current, discount, historicalLow, usual, regular }:
  { points: HistoryPoint[]; current: number | null; discount: number | null; historicalLow: number | null; historicalLowAt?: string | null; usual: number | null; regular: number | null }) {
  const data = useMemo(() => salePoints(points, current, discount), [points, current, discount]);
  if (data.length < 2) return <p className="muted text-sm">세일 기록이 아직 충분하지 않습니다.</p>;

  const prices = data.map((d) => d.price).concat(historicalLow ?? [], usual ?? []);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const step = [1000, 2000, 5000, 10000, 20000, 50000].find((s) => (hi - lo) / s <= 4) ?? 50000;
  const yMin = Math.max(0, Math.floor((lo - step * 0.6) / step) * step);
  const yMax = Math.ceil((hi + step * 0.6) / step) * step;
  const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step);
  const last = data[data.length - 1];
  const lowest = data.reduce((a, b) => (b.price < a.price ? b : a));
  const labelStyle = { fontSize: 11, fontWeight: 700 } as const;
  const goodBand = historicalLow != null && usual != null && usual > historicalLow;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="muted">정가 {regular?.toLocaleString("ko-KR") ?? "-"}원 기준 · 점 하나가 세일 한 번 · 최근 24개월 {data.filter((d) => !d.now).length}회</span>
        <span className="muted hidden sm:inline">점 위에 마우스를 올려 보세요</span>
      </div>
      <div className="h-64 w-full text-xs select-none">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="saleFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={monthTick}
              stroke="var(--muted)" tickLine={false} axisLine={false} minTickGap={48} />
            <YAxis domain={[yMin, yMax]} ticks={ticks} tickFormatter={man} stroke="var(--muted)" tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<Bubble />} isAnimationActive={false} cursor={false} />
            {goodBand && <ReferenceArea y1={historicalLow!} y2={usual!} fill={BLUE} fillOpacity={0.08} stroke="none" />}
            {usual != null && <ReferenceLine y={usual} stroke={BLUE} strokeOpacity={0.7} strokeDasharray="4 4"
              label={{ value: `평소 세일가 ${usual.toLocaleString("ko-KR")}원`, fill: BLUE, position: "insideTopRight", ...labelStyle }} />}
            {historicalLow != null && <ReferenceLine y={historicalLow} stroke={LOW} strokeDasharray="4 4"
              label={{ value: `역대 최저 ${historicalLow.toLocaleString("ko-KR")}원`, fill: LOW, position: "insideBottomLeft", ...labelStyle }} />}
            <Area type="linear" dataKey="price" stroke={BLUE} strokeWidth={2.5} fill="url(#saleFill)"
              dot={{ r: 4, fill: "var(--card)", stroke: BLUE, strokeWidth: 2 }}
              activeDot={{ r: 7, fill: BLUE, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive animationDuration={900} animationBegin={200} />
            {lowest !== last && <ReferenceDot x={lowest.t} y={lowest.price} r={6} fill={LOW} stroke="var(--card)" strokeWidth={2}
              label={{ value: "최저", fill: LOW, position: "bottom", ...labelStyle }} />}
            <ReferenceDot x={last.t} y={last.price} r={7} fill={last.now ? LOW : BLUE} stroke="var(--card)" strokeWidth={3}
              label={{ value: last.now ? "지금" : "최근", fill: "var(--fg)", position: "left", offset: 10, ...labelStyle }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
        <span><i className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: "var(--card)", border: `2px solid ${BLUE}` }} />세일 때 가격</span>
        <span><i className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: LOW }} />역대 최저가</span>
        <span><i className="inline-block w-5 h-3 align-middle mr-1 rounded-sm" style={{ background: BLUE, opacity: 0.2 }} />사도 좋은 구간(역대 최저 ~ 평소 세일가)</span>
      </div>
    </div>
  );
}
