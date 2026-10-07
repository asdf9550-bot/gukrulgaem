import type { ReviewSummary } from "@/lib/data";
import { kst } from "@/lib/format";

// "한국인이 싫어한 이유 3줄" — 한국어 부정 리뷰를 AI가 요약(주 1회). 리뷰에 나온 내용만.
export default function WhyDisliked({ s, gapPp }: { s: ReviewSummary | null; gapPp: number | null }) {
  if (!s) return null;
  const warn = gapPp != null && gapPp <= -10;
  return (
    <section className="card p-5 space-y-3" style={warn ? { borderColor: "#fca5a5" } : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">한국인이 싫어한 이유 3줄</h2>
        <span className="text-xs muted">한국어 비추천 리뷰 {s.sample}개 요약 · {kst(s.created_at)}</span>
      </div>
      <ol className="space-y-2">
        {s.reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full text-sm font-extrabold flex items-center justify-center" style={{ background: "#fee2e2", color: "#b91c1c" }}>{i + 1}</span>
            <span className="font-bold">{r}</span>
          </li>
        ))}
      </ol>
      {s.summary && <p className="text-sm muted">{s.summary}</p>}
      <p className="text-xs muted">AI(Claude)가 한국어 비추천 리뷰만 읽고 정리한 것으로, 리뷰에 없는 내용은 넣지 않도록 했습니다. 구매 전 2시간 안에 직접 확인해 보세요(스팀 환불 가능 구간).</p>
    </section>
  );
}
