import type { Verdict } from "@/lib/data";
import { VERDICT } from "@/lib/format";

export default function VerdictBadge({ verdict, size = "md", stamp = false }: { verdict: Verdict; size?: "md" | "lg"; stamp?: boolean }) {
  const v = VERDICT[verdict];
  const cls = size === "lg" ? "text-2xl px-5 py-2 font-extrabold" : "text-sm px-3 py-1 font-bold leading-none";
  return (
    <span className={`inline-flex items-center rounded-full ${cls} ${stamp ? "stamp" : ""}`} style={{ color: v.color, background: v.bg }}>
      {v.label}
    </span>
  );
}
