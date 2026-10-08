"use client";
import { useEffect, useState } from "react";

// 세일 종료까지 남은 날. 페이지를 여는 시점 기준으로 계산한다(빌드 시점이 아니라).
export default function SaleCountdown({ endAt, endText }: { endAt: string | null; endText: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  const left = now == null ? null : end - now;
  let badge = "", color = "#dc2626";
  if (left != null) {
    if (left <= 0) { badge = "세일 종료"; color = "#6b7280"; }
    else if (left < 86_400_000) { badge = `오늘 종료 · ${Math.max(1, Math.floor(left / 3_600_000))}시간 남음`; }
    else { const d = Math.ceil(left / 86_400_000); badge = `D-${d}`; if (d > 3) color = "#f59e0b"; }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">{/* 폰에서 날짜가 길면 줄바꿈(2026-10-08) */}
      {badge && <b className="rounded-md px-2 py-0.5 text-white" style={{ background: color }}>{badge}</b>}
      <span className="muted">세일 종료 {endText}</span>
    </span>
  );
}
