"use client";
import { useEffect, useState } from "react";

// 전체 vs 한국어 긍정률 막대. 페이지가 열릴 때 0에서 실제 값까지 늘어난다.
export default function ReviewGap({ all, ko, reviewsAll, reviewsKo, gap }:
  { all: number | null; ko: number | null; reviewsAll: number; reviewsKo: number; gap: number | null }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrow(true), 50); return () => clearTimeout(t); }, []);
  const rows = [
    { label: "전체 리뷰", value: all, count: reviewsAll, color: "#64748b" },
    { label: "한국어 리뷰", value: ko, count: reviewsKo, color: gap != null && gap <= -10 ? "#dc2626" : "#2563eb" },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-sm mb-1">
            <span>{r.label} <span className="muted">({r.count.toLocaleString("ko-KR")}개)</span></span>
            <span className="font-bold">{r.value == null ? "-" : `${r.value}% 긍정`}</span>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div className="h-full rounded-full" style={{
              width: grow && r.value != null ? `${r.value}%` : "0%", background: r.color,
              transition: "width 900ms cubic-bezier(.2,.8,.2,1)" }} />
          </div>
        </div>
      ))}
      <p className="text-sm muted">
        {gap == null ? "한국어 리뷰가 100개 미만이라 격차를 계산하지 않았습니다."
          : gap <= -10 ? `한국 게이머 평가가 전체보다 ${Math.abs(gap)}%p 낮습니다. 구매 전 한국어 리뷰를 확인하세요.`
          : gap < 0 ? `한국 평가가 전체보다 ${Math.abs(gap)}%p 낮습니다.`
          : gap > 0 ? `한국 평가가 전체보다 ${gap}%p 높습니다.` : "한국 평가와 전체 평가가 같습니다."}
      </p>
    </div>
  );
}
