"use client";
import { useEffect, useState } from "react";

// 숫자가 0에서 목표값까지 올라가는 효과.
// 서버에서 만든 HTML에는 최종 값이 들어가므로(검색 엔진·JS 꺼진 환경), 화면이 보일 때만 0부터 올라간다.
export default function CountUp({ value, suffix = "원", duration = 900, delay = 0, className, style }:
  { value: number | null | undefined; suffix?: string; duration?: number; delay?: number; className?: string; style?: React.CSSProperties }) {
  const [shown, setShown] = useState<number>(value ?? 0);
  useEffect(() => {
    if (value == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.visibilityState !== "visible") { setShown(value); return; }
    let frame = 0; const start = performance.now() + delay;
    setShown(0);
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - k, 3);                       // 끝에서 천천히
      setShown(Math.round(value * eased));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);
  if (value == null) return <span className={className} style={style}>-</span>;
  return <span className={className} style={style}>{shown.toLocaleString("ko-KR")}{suffix}</span>;
}
