import type { Verdict } from "@/lib/data";
import { VERDICT } from "@/lib/format";
import { KIND, type Kind } from "@/lib/kind";

// kind(2026-10-11)가 오면 바닥가를 "최저가 갱신·재등장·첫 할인"으로 나눠 보여 준다. 없으면 예전처럼 판정 이름만.
// size "sm"(2026-10-16): 폰 2열 카드용 — 폰에서는 작게, md 이상에서는 md 와 같게
export default function VerdictBadge({ verdict, kind, size = "md", stamp = false }: { verdict: Verdict; kind?: Kind; size?: "sm" | "md" | "lg"; stamp?: boolean }) {
  const v = kind ? KIND[kind] : VERDICT[verdict];
  const cls = size === "lg" ? "text-2xl px-5 py-2 font-extrabold"
    : size === "sm" ? "text-xs px-2 py-0.5 md:text-sm md:px-3 md:py-1 font-bold leading-none"
    : "text-sm px-3 py-1 font-bold leading-none";
  return (
    <span className={`inline-flex items-center rounded-full ${cls} ${stamp ? "stamp" : ""}`} style={{ color: v.color, background: v.bg }}>
      {v.label}
    </span>
  );
}
