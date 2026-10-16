"use client";
import { useState } from "react";

// 2026-10-16 (경쟁 사이트 비교 → 공유 단추): 폰은 기본 공유창(카톡 등), 컴퓨터는 링크 복사
export default function ShareButton({ title, path }: { title: string; path: string }) {
  const [done, setDone] = useState<"copied" | "shared" | null>(null);
  const share = async () => {
    const url = `${location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); setDone("shared"); }
      else { await navigator.clipboard.writeText(url); setDone("copied"); }
    } catch { /* 사용자가 공유창을 닫은 경우 등 — 아무것도 안 함 */ }
    setTimeout(() => setDone(null), 2000);
  };
  return (
    <button type="button" onClick={share} aria-label="공유"
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold hover:opacity-80"
      style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
      {done === "copied" ? "링크 복사됨 ✓" : done === "shared" ? "공유함 ✓" : "⤴ 공유"}
    </button>
  );
}
